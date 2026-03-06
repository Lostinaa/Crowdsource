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
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView

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

    private lateinit var callerText: TextView
    private lateinit var statusText: TextView
    private lateinit var timerText: TextView
    private lateinit var muteBtn: TextView
    private lateinit var speakerBtn: TextView
    private lateinit var hangupBtn: TextView
    private lateinit var answerBtn: TextView
    private lateinit var declineBtn: TextView
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
            setBackgroundColor(Color.parseColor("#1A1A2E"))
            setPadding(dp(24), dp(60), dp(24), dp(40))
        }

        // Caller info
        callerText = TextView(this).apply {
            text = "Unknown"
            setTextColor(Color.WHITE)
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        root.addView(callerText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(40) })

        // Status text
        statusText = TextView(this).apply {
            text = "Calling..."
            setTextColor(Color.parseColor("#8888AA"))
            textSize = 16f
            gravity = Gravity.CENTER
        }
        root.addView(statusText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(8) })

        // Timer
        timerText = TextView(this).apply {
            text = "00:00"
            setTextColor(Color.WHITE)
            textSize = 48f
            typeface = Typeface.DEFAULT
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        root.addView(timerText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(40) })

        // Spacer
        val spacer = View(this)
        root.addView(spacer, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        // ── In-call controls (mute, speaker, hangup) ──
        inCallControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        muteBtn = createCircleButton("🎤", Color.parseColor("#2D2D44"), dp(64)) {
            toggleMute()
        }
        speakerBtn = createCircleButton("🔊", Color.parseColor("#2D2D44"), dp(64)) {
            toggleSpeaker()
        }
        hangupBtn = createCircleButton("✕", Color.parseColor("#FF3B30"), dp(72)) {
            hangUp()
        }

        inCallControls.addView(muteBtn, LinearLayout.LayoutParams(dp(64), dp(64)).apply {
            marginEnd = dp(24)
        })
        inCallControls.addView(hangupBtn, LinearLayout.LayoutParams(dp(72), dp(72)).apply {
            marginEnd = dp(24)
        })
        inCallControls.addView(speakerBtn, LinearLayout.LayoutParams(dp(64), dp(64)))

        root.addView(inCallControls, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(40) })

        // ── Incoming call controls (answer, decline) ──
        incomingControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            visibility = View.GONE
        }

        declineBtn = createCircleButton("✕", Color.parseColor("#FF3B30"), dp(72)) {
            rejectCall()
        }
        answerBtn = createCircleButton("✓", Color.parseColor("#34C759"), dp(72)) {
            answerCall()
        }

        incomingControls.addView(declineBtn, LinearLayout.LayoutParams(dp(72), dp(72)).apply {
            marginEnd = dp(60)
        })
        incomingControls.addView(answerBtn, LinearLayout.LayoutParams(dp(72), dp(72)))

        root.addView(incomingControls, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(40) })

        setContentView(root)
    }

    private fun createCircleButton(label: String, bgColor: Int, size: Int, onClick: () -> Unit): TextView {
        return TextView(this).apply {
            text = label
            textSize = 24f
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
        callerText.text = number
    }

    private fun updateUIForState(state: Int) {
        when (state) {
            Call.STATE_RINGING -> {
                statusText.text = "Incoming Call"
                inCallControls.visibility = View.GONE
                incomingControls.visibility = View.VISIBLE
                timerText.visibility = View.GONE
            }
            Call.STATE_DIALING, Call.STATE_CONNECTING -> {
                statusText.text = "Calling..."
                inCallControls.visibility = View.VISIBLE
                incomingControls.visibility = View.GONE
                timerText.visibility = View.GONE
            }
            Call.STATE_ACTIVE -> {
                statusText.text = "Connected"
                inCallControls.visibility = View.VISIBLE
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
        muteBtn.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(if (isMuted) Color.parseColor("#5856D6") else Color.parseColor("#2D2D44"))
        }
    }

    private fun toggleSpeaker() {
        isSpeaker = !isSpeaker
        CallDropService.currentService?.setAudioRoute(
            if (isSpeaker) android.telecom.CallAudioState.ROUTE_SPEAKER
            else android.telecom.CallAudioState.ROUTE_EARPIECE
        )
        speakerBtn.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(if (isSpeaker) Color.parseColor("#5856D6") else Color.parseColor("#2D2D44"))
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
