package expo.modules.callmetrics

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

data class CallEvent(
  val state: String,
  val timestamp: Long,
)

class CallMetricsModule : Module() {
  private var telephonyManager: TelephonyManager? = null

  // Legacy listener for API < 31
  @Suppress("DEPRECATION")
  private var legacyListener: PhoneStateListener? = null

  // Modern callback for API 31+
  private var telephonyCallback: TelephonyCallback? = null

  override fun definition() = ModuleDefinition {
    Name("CallMetrics")

    Events("callMetrics:update")

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_PHONE_STATE
      ) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("start") {
      val context = appContext.reactContext ?: return@AsyncFunction false

      if (ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_PHONE_STATE
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        // JS must request permission first.
        return@AsyncFunction false
      }

      if (telephonyManager == null) {
        telephonyManager =
          context.getSystemService(TelephonyManager::class.java)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // API 31+ — use TelephonyCallback (non-deprecated)
        registerModernCallback()
      } else {
        // API < 31 — fall back to PhoneStateListener
        registerLegacyListener()
      }

      true
    }

    AsyncFunction("stop") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        unregisterModernCallback()
      } else {
        unregisterLegacyListener()
      }
      true
    }
  }

  // ── Modern path (API 31+) ──────────────────────────────────────────

  @RequiresApi(Build.VERSION_CODES.S)
  private fun registerModernCallback() {
    if (telephonyCallback != null) return // already registered

    telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
      override fun onCallStateChanged(state: Int) {
        emitCallState(state)
      }
    }

    telephonyManager?.registerTelephonyCallback(
      Executors.newSingleThreadExecutor(),
      telephonyCallback!!
    )
  }

  @RequiresApi(Build.VERSION_CODES.S)
  private fun unregisterModernCallback() {
    telephonyCallback?.let {
      telephonyManager?.unregisterTelephonyCallback(it)
    }
    telephonyCallback = null
  }

  // ── Legacy path (API < 31) ────────────────────────────────────────

  @Suppress("DEPRECATION")
  private fun registerLegacyListener() {
    if (legacyListener != null) return // already registered

    legacyListener = object : PhoneStateListener() {
      override fun onCallStateChanged(state: Int, phoneNumber: String?) {
        super.onCallStateChanged(state, phoneNumber)
        emitCallState(state)
      }
    }

    telephonyManager?.listen(
      legacyListener,
      PhoneStateListener.LISTEN_CALL_STATE
    )
  }

  @Suppress("DEPRECATION")
  private fun unregisterLegacyListener() {
    legacyListener?.let {
      telephonyManager?.listen(it, PhoneStateListener.LISTEN_NONE)
    }
    legacyListener = null
  }

  // ── Shared helper ─────────────────────────────────────────────────

  private fun emitCallState(state: Int) {
    val stateName = when (state) {
      TelephonyManager.CALL_STATE_IDLE -> "idle"
      TelephonyManager.CALL_STATE_RINGING -> "ringing"
      TelephonyManager.CALL_STATE_OFFHOOK -> "offhook"
      else -> "unknown"
    }

    val event = mapOf(
      "state" to stateName,
      "timestamp" to System.currentTimeMillis(),
      "phoneNumber" to "" // Intentionally empty — avoid leaking PII
    )
    sendEvent("callMetrics:update", event)
  }
}
