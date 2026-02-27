package expo.modules.callmetrics

import android.os.Build
import android.telecom.Call
import android.telecom.DisconnectCause
import android.telecom.InCallService
import android.util.Log

/**
 * InCallService that passively listens to all calls managed by the Telecom framework.
 * When a call disconnects, it captures the real DisconnectCause
 * (LOCAL / REMOTE / ERROR / MISSED / REJECTED / etc.) and forwards it to
 * CallDropBridgeModule via a static callback.
 *
 * This service does NOT replace the dialer UI — it runs alongside it.
 * The user must grant the app a telecom role ("Allow teleCrowd to manage calls?").
 */
class CallDropService : InCallService() {

    companion object {
        private const val TAG = "CallDropService"

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
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        Log.d(TAG, "Call added — attaching callback")

        val callStart = System.currentTimeMillis()

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

                if (state == Call.STATE_DISCONNECTED) {
                    val details = call.details
                    val disconnectCause = details?.disconnectCause
                    val callDuration = System.currentTimeMillis() - callStart

                    if (disconnectCause != null) {
                        val code = disconnectCause.code
                        val label = codeToLabel(code)
                        val description = disconnectCause.description?.toString() ?: ""

                        Log.d(TAG, "Call disconnected — cause: $label ($code), description: $description, duration: ${callDuration}ms")

                        onCallDisconnected?.invoke(code, label, description, callDuration)
                    } else {
                        Log.w(TAG, "Call disconnected but no DisconnectCause available")
                        onCallDisconnected?.invoke(-1, "UNKNOWN", "No cause available", callDuration)
                    }

                    call.unregisterCallback(this)
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "Call removed")
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
