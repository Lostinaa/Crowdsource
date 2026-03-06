package expo.modules.callmetrics

import android.Manifest
import android.content.ContentResolver
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallDisconnectModule : Module() {
  private var contentObserver: ContentObserver? = null
  private var isListening = false
  private var lastCallId: Long = -1
  // Skip the first call log read after registration to avoid emitting stale data
  private var isFirstChange = true

  override fun definition() = ModuleDefinition {
    Name("CallDisconnectModule")

    Events("CallDisconnectEvent")

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_CALL_LOG
      ) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("startListening") {
      val context = appContext.reactContext ?: return@AsyncFunction false

      if (ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_CALL_LOG
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        throw SecurityException("READ_CALL_LOG permission is required")
      }

      if (isListening) {
        return@AsyncFunction true // Already listening
      }

      val contentResolver: ContentResolver = context.contentResolver
      
      // Seed lastCallId with the current most-recent call so we never emit it
      seedLastCallId(contentResolver)

      // Create a ContentObserver to watch for changes in CallLog
      contentObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean, uri: Uri?) {
          super.onChange(selfChange, uri)
          
          if (uri == null) return
          
          // Only process if it's a call log change
          if (uri.toString().contains("call_log")) {
            checkLatestCallDisconnectCause(context, contentResolver)
          }
        }
      }

      // Register observer for CallLog.CONTENT_URI
      contentResolver.registerContentObserver(
        CallLog.Calls.CONTENT_URI,
        true, // notifyForDescendants
        contentObserver!!
      )

      isListening = true
      // NOTE: we intentionally do NOT call checkLatestCallDisconnectCause here.
      // The observer will fire only for NEW calls that happen after registration.
      
      true
    }

    AsyncFunction("stopListening") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      
      contentObserver?.let { observer ->
        context.contentResolver.unregisterContentObserver(observer)
        contentObserver = null
      }
      
      isListening = false
      lastCallId = -1
      isFirstChange = true
      true
    }

    AsyncFunction("getRecentCalls") { limit: Int ->
      val context = appContext.reactContext
        ?: return@AsyncFunction emptyList<Map<String, Any?>>()

      if (ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_CALL_LOG
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        return@AsyncFunction emptyList<Map<String, Any?>>()
      }

      val calls = mutableListOf<Map<String, Any?>>()
      val cursor = context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        arrayOf(
          CallLog.Calls.CACHED_NAME,
          CallLog.Calls.NUMBER,
          CallLog.Calls.TYPE,
          CallLog.Calls.DATE,
          CallLog.Calls.DURATION
        ),
        null, null,
        "${CallLog.Calls.DATE} DESC"
      )

      cursor?.use {
        val nameIdx = it.getColumnIndex(CallLog.Calls.CACHED_NAME)
        val numberIdx = it.getColumnIndex(CallLog.Calls.NUMBER)
        val typeIdx = it.getColumnIndex(CallLog.Calls.TYPE)
        val dateIdx = it.getColumnIndex(CallLog.Calls.DATE)
        val durationIdx = it.getColumnIndex(CallLog.Calls.DURATION)

        var count = 0
        while (it.moveToNext() && count < limit) {
          val type = it.getInt(typeIdx)
          val typeName = when (type) {
            CallLog.Calls.INCOMING_TYPE -> "INCOMING"
            CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
            CallLog.Calls.MISSED_TYPE -> "MISSED"
            CallLog.Calls.REJECTED_TYPE -> "REJECTED"
            CallLog.Calls.BLOCKED_TYPE -> "BLOCKED"
            else -> "UNKNOWN"
          }

          val dateMs = it.getLong(dateIdx)
          val isoDate = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date(dateMs))

          calls.add(mapOf(
            "name" to (if (nameIdx >= 0) it.getString(nameIdx) else null),
            "number" to (if (numberIdx >= 0) it.getString(numberIdx) else ""),
            "type" to typeName,
            "date" to isoDate,
            "duration" to (if (durationIdx >= 0) it.getInt(durationIdx) else 0)
          ))
          count++
        }
      }

      calls
    }

    AsyncFunction("placeCall") { phoneNumber: String ->
      val context = appContext.reactContext
        ?: return@AsyncFunction false

      // Check CALL_PHONE permission
      if (ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.CALL_PHONE
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        return@AsyncFunction false
      }

      try {
        val telecomManager = context.getSystemService(android.content.Context.TELECOM_SERVICE)
          as? android.telecom.TelecomManager
        if (telecomManager != null) {
          val uri = android.net.Uri.fromParts("tel", phoneNumber, null)
          val extras = android.os.Bundle()
          telecomManager.placeCall(uri, extras)
          true
        } else {
          // Fallback: use ACTION_CALL intent
          val intent = android.content.Intent(android.content.Intent.ACTION_CALL).apply {
            data = android.net.Uri.parse("tel:$phoneNumber")
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
          }
          context.startActivity(intent)
          true
        }
      } catch (e: Exception) {
        android.util.Log.e("CallDisconnectModule", "placeCall failed", e)
        false
      }
    }
  }

  /**
   * Read the current most-recent call ID so we never emit stale history.
   */
  private fun seedLastCallId(contentResolver: ContentResolver) {
    try {
      val cursor = contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        arrayOf(CallLog.Calls._ID),
        null,
        null,
        "${CallLog.Calls.DATE} DESC"
      )
      cursor?.use {
        if (it.moveToFirst()) {
          lastCallId = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls._ID))
        }
      }
    } catch (e: Exception) {
      android.util.Log.w("CallDisconnectModule", "Could not seed lastCallId: ${e.message}")
    }
  }

  private fun checkLatestCallDisconnectCause(context: android.content.Context, contentResolver: ContentResolver) {
    try {
      val projection = arrayOf(
        CallLog.Calls._ID,
        CallLog.Calls.TYPE,
        CallLog.Calls.DURATION,
        CallLog.Calls.DATE,
        CallLog.Calls.NUMBER
      )

      // Query the most recent call
      val cursor = contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        null,
        null,
        "${CallLog.Calls.DATE} DESC"
      )

      cursor?.use {
        // Only check the most recent call (first result)
        if (it.moveToFirst() && !it.isAfterLast) {
          val callId = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls._ID))
          
          // Only process if this is a new call (different ID from last seen)
          if (callId != lastCallId) {
            lastCallId = callId
            
            val callType = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
            val duration = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
            val date = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))

            // Determine disconnect cause based on call type and duration
            // CallLog.Calls.TYPE: INCOMING_TYPE=1, OUTGOING_TYPE=2, MISSED_TYPE=3
            val (causeCode, causeLabel) = when (callType) {
              CallLog.Calls.MISSED_TYPE -> Pair(1, "MISSED")
              CallLog.Calls.INCOMING_TYPE -> {
                if (duration == 0) Pair(2, "INCOMING_REJECTED")
                else Pair(0, "NORMAL")
              }
              CallLog.Calls.OUTGOING_TYPE -> {
                // duration=0 means caller hung up before the other side answered
                // This is a user-initiated cancel, NOT a network failure
                if (duration == 0) Pair(4, "OUTGOING_CANCELED")
                else Pair(0, "NORMAL")
              }
              else -> Pair(-1, "UNKNOWN")
            }

            val event = mapOf(
              "causeCode" to causeCode,
              "causeLabel" to causeLabel,
              "timestamp" to date,
              "duration" to duration,
              "callType" to callType,
              "phoneNumber" to "", // Intentionally empty — avoid leaking PII
              "source" to "calllog"
            )
            
            sendEvent("CallDisconnectEvent", event)
          }
        }
      }
    } catch (e: Exception) {
      // Log error but don't crash
      android.util.Log.e("CallDisconnectModule", "Error reading call log: ${e.message}", e)
    }
  }
}
