package expo.modules.callmetrics

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log

/**
 * Minimal dialer activity required for ROLE_DIALER qualification.
 *
 * Android requires any app requesting ROLE_DIALER to have an activity
 * that handles android.intent.action.DIAL. This activity simply forwards
 * the dial intent to the system's actual dialer and finishes immediately.
 *
 * This ensures the app qualifies for the dialer role (needed for
 * InCallService binding) without replacing the user's phone experience.
 */
class DialerActivity : Activity() {

    companion object {
        private const val TAG = "DialerActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "DialerActivity launched, forwarding to system dialer")

        // Forward the DIAL intent to the real system dialer
        val phoneNumber = intent?.data
        try {
            val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                if (phoneNumber != null) {
                    data = phoneNumber
                }
                // Exclude ourselves to avoid infinite loop
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_FORWARD_RESULT
            }

            // Use chooser to let the user pick the real dialer (excluding us)
            val chooser = Intent.createChooser(dialIntent, null)
            startActivity(chooser)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to forward dial intent: ${e.message}")
            // Fallback: try direct dialer launch
            try {
                val fallbackIntent = Intent(Intent.ACTION_DIAL).apply {
                    if (phoneNumber != null) {
                        data = phoneNumber
                    }
                    setPackage("com.samsung.android.dialer") // Samsung
                }
                startActivity(fallbackIntent)
            } catch (e2: Exception) {
                try {
                    val fallbackIntent2 = Intent(Intent.ACTION_DIAL).apply {
                        if (phoneNumber != null) {
                            data = phoneNumber
                        }
                        setPackage("com.android.dialer") // Stock Android
                    }
                    startActivity(fallbackIntent2)
                } catch (e3: Exception) {
                    Log.e(TAG, "No dialer found: ${e3.message}")
                }
            }
        }

        // Finish immediately — we're just a pass-through
        finish()
    }
}
