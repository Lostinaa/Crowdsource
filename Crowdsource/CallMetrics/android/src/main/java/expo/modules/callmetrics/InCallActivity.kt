package expo.modules.callmetrics

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.Manifest
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.net.Uri
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Space

/**
 * Minimal in-call activity providing basic call controls.
 * Required because IN_CALL_SERVICE_UI=true means our app
 * provides the call screen when it's the default dialer.
 *
 * Supports:
 * - Outgoing/active calls: hangup, speaker, mute
 * - Incoming calls: answer + decline buttons
 * - Call duration timer
 */
class InCallActivity : Activity() {

    companion object {
        private const val TAG = "InCallActivity"
        var instance: InCallActivity? = null
    }

    private lateinit var avatarContainer: LinearLayout
    private lateinit var avatarText: TextView
    private lateinit var callerNameText: TextView
    private lateinit var callerNumberText: TextView
    private lateinit var statusText: TextView
    private lateinit var timerText: TextView
    private lateinit var muteBtn: LinearLayout
    private lateinit var speakerBtn: LinearLayout
    private lateinit var hangupBtn: LinearLayout
    private lateinit var answerBtn: LinearLayout
    private lateinit var declineBtn: LinearLayout
    private lateinit var inCallControls: LinearLayout
    private lateinit var incomingControls: LinearLayout

    private val timerHandler = Handler(Looper.getMainLooper())
    private var callStartTime = 0L
    private var isMuted = false
    private var isSpeaker = false

    private val timerRunnable = object : Runnable {
        override fun run() {
            if (callStartTime > 0) {
                val elapsed = (System.currentTimeMillis() - callStartTime) / 1000
                val min = elapsed / 60
                val sec = elapsed % 60
                timerText.text = String.format("%02d:%02d", min, sec)
            }
            timerHandler.postDelayed(this, 1000)
        }
    }

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            runOnUiThread {
                updateUIForState(state)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this
        Log.d(TAG, "InCallActivity created")

        // Show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            km.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        buildUI()
        setupCallbacks()
    }

    private fun buildUI() {
        val dp = { value: Int -> TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics
        ).toInt() }

        // Root layout
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            // Deep sleek gradient background
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#0F2027"), Color.parseColor("#203A43"), Color.parseColor("#2C5364"))
            )
            setPadding(dp(24), dp(80), dp(24), dp(40))
        }

        // Avatar Circle
        avatarContainer = LinearLayout(this).apply {
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#4AB3A1"))
            }
        }
        avatarText = TextView(this).apply {
            text = "?"
            setTextColor(Color.WHITE)
            textSize = 52f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        avatarContainer.addView(avatarText, LinearLayout.LayoutParams(dp(110), dp(110)))
        root.addView(avatarContainer, LinearLayout.LayoutParams(dp(110), dp(110)).apply {
            bottomMargin = dp(24)
        })

        // Caller Name
        callerNameText = TextView(this).apply {
            text = "Unknown"
            setTextColor(Color.WHITE)
            textSize = 34f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        root.addView(callerNameText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(4) })

        // Caller Number
        callerNumberText = TextView(this).apply {
            text = ""
            setTextColor(Color.parseColor("#BBBBCC"))
            textSize = 18f
            gravity = Gravity.CENTER
        }
        root.addView(callerNumberText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(24) })

        // Status text
        statusText = TextView(this).apply {
            text = "Calling..."
            setTextColor(Color.parseColor("#88C0D0"))
            textSize = 18f
            gravity = Gravity.CENTER
        }
        root.addView(statusText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(8) })

        // Timer
        timerText = TextView(this).apply {
            text = "00:00"
            setTextColor(Color.WHITE)
            textSize = 36f
            typeface = Typeface.DEFAULT
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        root.addView(timerText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        // Spacer
        val spacer = Space(this)
        root.addView(spacer, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        // ── In-call controls (mute, keypad, speaker) ──
        inCallControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(40) }
        }

        muteBtn = createIconButton("🎤", "Mute", Color.parseColor("#3B4252"), dp(72)) {
            toggleMute()
        }
        val keypadBtn = createIconButton("▦", "Keypad", Color.parseColor("#3B4252"), dp(72)) {
            // Placeholder for keypad
        }
        speakerBtn = createIconButton("🔊", "Speaker", Color.parseColor("#3B4252"), dp(72)) {
            toggleSpeaker()
        }

        inCallControls.addView(muteBtn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        inCallControls.addView(keypadBtn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        inCallControls.addView(speakerBtn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        root.addView(inCallControls)

        // ── Bottom Action row (Hangup / Answer) ──
        incomingControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            visibility = View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(32) }
        }

        hangupBtn = createIconButton("📞", "End", Color.parseColor("#BF616A"), dp(84)) {
            hangUp()
        }
        declineBtn = createIconButton("📞", "Decline", Color.parseColor("#BF616A"), dp(84)) {
            rejectCall()
        }
        answerBtn = createIconButton("📞", "Answer", Color.parseColor("#A3BE8C"), dp(84)) {
            answerCall()
        }

        // Active call hangup row
        val activeCallActions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(32) }
        }
        activeCallActions.addView(hangupBtn, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        
        // Setup incoming UI
        incomingControls.addView(declineBtn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        incomingControls.addView(answerBtn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        // We will toggle visibility of the hangup row and incoming controls dynamically
        hangupBtn.tag = "activeActions" // used to identify in toggle
        root.addView(activeCallActions)
        root.addView(incomingControls)

        // Save reference to active actions parent for easy toggling
        inCallControls.tag = activeCallActions

        setContentView(root)
    }

    private fun createIconButton(iconText: String, label: String, bgColor: Int, size: Int, onClick: () -> Unit): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            
            val btn = TextView(this@InCallActivity).apply {
                text = iconText
                textSize = 32f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(bgColor)
                }
                setOnClickListener { onClick() }
                isClickable = true
                isFocusable = true
            }
            // Add slight shadow
            btn.elevation = 8f

            val labelText = TextView(this@InCallActivity).apply {
                text = label
                setTextColor(Color.parseColor("#E5E9F0"))
                textSize = 14f
                gravity = Gravity.CENTER
            }

            addView(btn, LinearLayout.LayoutParams(size, size).apply { bottomMargin = 8 })
            addView(labelText, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        }
    }



    private fun setupCallbacks() {
        val call = CallDropService.currentCall
        if (call != null) {
            call.registerCallback(callCallback)
            updateUIForState(call.state)
            updateCallerInfo(call)
        } else {
            Log.w(TAG, "No current call")
            statusText.text = "No active call"
        }
    }

    private fun updateCallerInfo(call: Call) {
        val handle = call.details?.handle
        val number = handle?.schemeSpecificPart ?: "Unknown"

        var contactName: String? = null

        // Try to fetch contact name if permission is granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
                contactName = resolveContactName(number)
            } else {
                Log.w(TAG, "READ_CONTACTS permission not granted, cannot resolve name")
            }
        } else {
            contactName = resolveContactName(number)
        }

        if (contactName != null) {
            callerNameText.text = contactName
            callerNumberText.text = number
            avatarText.text = contactName.firstOrNull()?.uppercase() ?: "?"
        } else {
            callerNameText.text = number
            callerNumberText.text = "Unknown Contact"
            avatarText.text = "#"
        }
    }

    private fun resolveContactName(phoneNumber: String): String? {
        try {
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber))
            val projection = arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME)
            val cursor = contentResolver.query(uri, projection, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(ContactsContract.PhoneLookup.DISPLAY_NAME)
                    return it.getString(nameIndex)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed resolving contact name", e)
        }
        return null
    }

    private fun updateUIForState(state: Int) {
        val activeCallActions = inCallControls.tag as LinearLayout
        when (state) {
            Call.STATE_RINGING -> {
                statusText.text = "Incoming Call"
                inCallControls.visibility = View.GONE
                activeCallActions.visibility = View.GONE
                incomingControls.visibility = View.VISIBLE
                timerText.visibility = View.GONE
            }
            Call.STATE_DIALING, Call.STATE_CONNECTING -> {
                statusText.text = "Calling..."
                inCallControls.visibility = View.VISIBLE
                activeCallActions.visibility = View.VISIBLE
                incomingControls.visibility = View.GONE
                timerText.visibility = View.GONE
            }
            Call.STATE_ACTIVE -> {
                statusText.text = "Connected"
                inCallControls.visibility = View.VISIBLE
                activeCallActions.visibility = View.VISIBLE
                incomingControls.visibility = View.GONE
                timerText.visibility = View.VISIBLE
                if (callStartTime == 0L) {
                    callStartTime = System.currentTimeMillis()
                    timerHandler.post(timerRunnable)
                }
            }
            Call.STATE_DISCONNECTED -> {
                statusText.text = "Call Ended"
                timerHandler.removeCallbacks(timerRunnable)
                // Auto-close after 1.5 seconds
                Handler(Looper.getMainLooper()).postDelayed({
                    finishAndRemoveTask()
                }, 1500)
            }
        }
    }

    private fun toggleMute() {
        isMuted = !isMuted
        CallDropService.currentService?.setMuted(isMuted)
        muteBtn.getChildAt(0).background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(if (isMuted) Color.parseColor("#5E81AC") else Color.parseColor("#3B4252"))
        }
    }

    private fun toggleSpeaker() {
        isSpeaker = !isSpeaker
        CallDropService.currentService?.setAudioRoute(
            if (isSpeaker) android.telecom.CallAudioState.ROUTE_SPEAKER
            else android.telecom.CallAudioState.ROUTE_EARPIECE
        )
        speakerBtn.getChildAt(0).background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(if (isSpeaker) Color.parseColor("#5E81AC") else Color.parseColor("#3B4252"))
        }
    }

    private fun hangUp() {
        CallDropService.currentCall?.disconnect()
    }

    private fun answerCall() {
        CallDropService.currentCall?.answer(android.telecom.VideoProfile.STATE_AUDIO_ONLY)
    }

    private fun rejectCall() {
        CallDropService.currentCall?.reject(false, null)
    }

    override fun onDestroy() {
        super.onDestroy()
        timerHandler.removeCallbacks(timerRunnable)
        CallDropService.currentCall?.unregisterCallback(callCallback)
        instance = null
        Log.d(TAG, "InCallActivity destroyed")
    }

    override fun onBackPressed() {
        // Don't allow back to dismiss during call — user must hangup
        val call = CallDropService.currentCall
        if (call != null && call.state != Call.STATE_DISCONNECTED) {
            return
        }
        super.onBackPressed()
    }
}
