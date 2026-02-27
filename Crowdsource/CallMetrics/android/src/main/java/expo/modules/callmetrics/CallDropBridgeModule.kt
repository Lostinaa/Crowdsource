package expo.modules.callmetrics

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo bridge module that connects CallDropService (InCallService) to JavaScript.
 * 
 * Events emitted:
 *   - CallDropCauseEvent: { causeCode, causeLabel, causeDescription, callDurationMs }
 * 
 * Functions:
 *   - requestCallRole(): Prompts user to grant the app telecom call handling role
 *   - isCallRoleHeld(): Checks if the app already has the call role
 */
class CallDropBridgeModule : Module() {

    companion object {
        private const val TAG = "CallDropBridgeModule"
    }

    override fun definition() = ModuleDefinition {
        Name("CallDropBridgeModule")

        Events("CallDropCauseEvent")

        OnCreate {
            // Register the static callback so CallDropService can emit events to JS
            CallDropService.onCallDisconnected = { causeCode, causeLabel, causeDescription, callDurationMs ->
                Log.d(TAG, "Forwarding disconnect event to JS: $causeLabel ($causeCode)")
                try {
                    sendEvent("CallDropCauseEvent", mapOf(
                        "causeCode" to causeCode,
                        "causeLabel" to causeLabel,
                        "causeDescription" to causeDescription,
                        "callDurationMs" to callDurationMs,
                        "source" to "incallservice"
                    ))
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send event to JS: ${e.message}")
                }
            }
        }

        OnDestroy {
            CallDropService.onCallDisconnected = null
        }

        /**
         * Check if the app already holds the dialer role (required for InCallService binding).
         */
        Function("isCallRoleHeld") {
            val context = appContext.reactContext ?: return@Function false

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = context.getSystemService(Context.ROLE_SERVICE) as? RoleManager
                roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) ?: false
            } else {
                val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                telecomManager?.defaultDialerPackage == context.packageName
            }
        }

        /**
         * Request the default dialer role from the user.
         * This shows a system dialog: "Set teleCrowd as your default phone app?"
         * The app won't replace the dialer UI — our service has IN_CALL_SERVICE_UI=false.
         * But Android requires this role for InCallService binding.
         */
        AsyncFunction("requestCallRole") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val activity = appContext.currentActivity ?: return@AsyncFunction false

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = context.getSystemService(Context.ROLE_SERVICE) as? RoleManager
                    ?: return@AsyncFunction false

                if (roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
                    Log.d(TAG, "Dialer role already held")
                    return@AsyncFunction true
                }

                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                try {
                    activity.startActivityForResult(intent, 9001)
                    Log.d(TAG, "Requested dialer role")
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to request dialer role: ${e.message}")
                    tryOfferDefaultDialer(context)
                }
            } else {
                tryOfferDefaultDialer(context)
            }
        }
    }

    private fun tryOfferDefaultDialer(context: Context): Boolean {
        return try {
            val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
            }
            appContext.currentActivity?.startActivityForResult(intent, 9002)
            Log.d(TAG, "Offered default dialer role")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to offer default dialer: ${e.message}")
            false
        }
    }
}
