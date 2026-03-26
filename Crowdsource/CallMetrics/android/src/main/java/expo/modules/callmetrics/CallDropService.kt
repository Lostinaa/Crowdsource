package expo.modules.callmetrics

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.DisconnectCause
import android.telecom.InCallService
import android.util.Log

/**
 * InCallService that passively listens to all calls managed by the Telecom framework.
 * When a call disconnects, it captures the real DisconnectCause
 * (LOCAL / REMOTE / ERROR / MISSED / REJECTED / etc.) and forwards it to
 * CallDropBridgeModule via a static callback.
 *
 * Also launches InCallActivity to provide the required in-call UI.
 */
class CallDropService : InCallService() {

    companion object {
        private const val TAG = "CallDropService"
        private const val CHANNEL_ID = "incall_channel"
        private const val NOTIFICATION_ID = 42

        /**
         * Static callback set by CallDropBridgeModule.
         * When a call disconnects, we invoke this with the cause details.
         */
        var onCallDisconnected: ((
            causeCode: Int,
            causeLabel: String,
            causeDescription: String,
            callDurationMs: Long
        ) -> Unit)? = null

        /** Current active call — used by InCallActivity for call control */
        var currentCall: Call? = null

        /** Current service instance — used by InCallActivity for audio control */
        var currentService: CallDropService? = null
    }

    override fun onCreate() {
        super.onCreate()
        currentService = this
        createNotificationChannel()
        Log.d(TAG, "CallDropService created")
    }

    override fun onDestroy() {
        super.onDestroy()
        currentService = null
        Log.d(TAG, "CallDropService destroyed")
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        currentCall = call
        Log.d(TAG, "Call added — attaching callback, launching UI")

        val callStart = System.currentTimeMillis()
        var everActive = false   // did this call ever reach ACTIVE state?

        // Launch the in-call activity
        launchInCallActivity(call)

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                val stateName = when (state) {
                    Call.STATE_RINGING -> "RINGING"
                    Call.STATE_DIALING -> "DIALING"
                    Call.STATE_ACTIVE -> "ACTIVE"
                    Call.STATE_HOLDING -> "HOLDING"
                    Call.STATE_DISCONNECTED -> "DISCONNECTED"
                    Call.STATE_CONNECTING -> "CONNECTING"
                    Call.STATE_DISCONNECTING -> "DISCONNECTING"
                    else -> "UNKNOWN($state)"
                }
                Log.d(TAG, "Call state changed: $stateName")

                // Track if call was ever answered / went active
                if (state == Call.STATE_ACTIVE) {
                    everActive = true
                }

                if (state == Call.STATE_DISCONNECTED) {
                    val details = call.details
                    val disconnectCause = details?.disconnectCause
                    val callDuration = System.currentTimeMillis() - callStart

                    if (disconnectCause != null) {
                        val code = disconnectCause.code
                        var label = codeToLabel(code)
                        val description = disconnectCause.description?.toString() ?: ""

                        // If call ended with LOCAL but never went ACTIVE, the remote party
                        // was busy and the device auto-dropped it — report as NOT_CONNECTED
                        // so the React side correctly ignores it (not counted as completed call)
                        if (label == "LOCAL" && !everActive) {
                            Log.d(TAG, "LOCAL disconnect but call never went ACTIVE — treating as NOT_CONNECTED (busy/failed)")
                            label = "NOT_CONNECTED"
                        }

                        Log.d(TAG, "Call disconnected — cause: $label ($code), everActive: $everActive, description: $description, duration: ${callDuration}ms")

                        onCallDisconnected?.invoke(code, label, description, callDuration)
                    } else {
                        Log.w(TAG, "Call disconnected but no DisconnectCause available")
                        onCallDisconnected?.invoke(-1, "UNKNOWN", "No cause available", callDuration)
                    }

                    call.unregisterCallback(this)
                    cancelNotification()
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        currentCall = null
        cancelNotification()
        Log.d(TAG, "Call removed")
    }

    private fun launchInCallActivity(call: Call) {
        try {
            val intent = Intent(this, InCallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch InCallActivity: ${e.message}")
        }

        // Also show ongoing notification for background control
        showOngoingNotification(call)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Ongoing Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows notification during active calls"
                setSound(null, null)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun showOngoingNotification(call: Call) {
        try {
            val handle = call.details?.handle
            val number = handle?.schemeSpecificPart ?: "Unknown"

            val intent = Intent(this, InCallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val isIncoming = call.state == Call.STATE_RINGING
            val title = if (isIncoming) "Incoming Call" else "Ongoing Call"
            val text = number

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            val notification = builder
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_CALL)
                .build()

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show notification: ${e.message}")
        }
    }

    private fun cancelNotification() {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.cancel(NOTIFICATION_ID)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel notification: ${e.message}")
        }
    }

    private fun codeToLabel(code: Int): String {
        return when (code) {
            DisconnectCause.LOCAL -> "LOCAL"           // User hung up
            DisconnectCause.REMOTE -> "REMOTE"         // Other party hung up
            DisconnectCause.ERROR -> "ERROR"            // Network failure / drop
            DisconnectCause.MISSED -> "MISSED"          // Never answered
            DisconnectCause.REJECTED -> "REJECTED"      // User declined
            DisconnectCause.BUSY -> "BUSY"              // Line busy
            DisconnectCause.CANCELED -> "CANCELED"      // Caller canceled
            DisconnectCause.RESTRICTED -> "RESTRICTED"  // Restricted number
            DisconnectCause.OTHER -> "OTHER"            // Other reason
            DisconnectCause.UNKNOWN -> "UNKNOWN"
            else -> "UNKNOWN($code)"
        }
    }
}
