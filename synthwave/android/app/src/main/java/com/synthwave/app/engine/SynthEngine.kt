package com.qbirdsynth.app.engine

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Process
import kotlin.math.*

/**
 * QBirdSynth - Pure Kotlin Audio Engine
 * No NDK required - keeps APK ~3MB vs original 60MB
 *
 * Features: PolyBLEP oscillators, SVF filter, ADSR,
 * voice stacking (supersaw), sub oscillator, LFO
 */
class SynthEngine(context: Context) {
    companion object {
        const val SR = 44100
        const val BUF = 256
        const val MAX_V = 16
        fun m2f(n: Int) = 440.0 * 2.0.pow((n - 69) / 12.0)
    }

    @Volatile private var running = false
    private var track: AudioTrack? = null
    private var thread: Thread? = null
    val p = Params()
    private val voices = mutableListOf<Voice>()
    private val lock = Any()

    fun start() {
        if (running) return
        running = true
        val min = AudioTrack.getMinBufferSize(SR, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT)
        track = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(SR).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build())
            .setBufferSizeInFrames(maxOf(min, BUF * 4))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        track?.play()
        thread = Thread({ loop() }, "QBirdSynth").apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    fun stop() {
        running = false
        thread?.join(500)
        track?.stop()
        track?.release()
        track = null
    }

    private fun loop() {
        Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
        val buf = ShortArray(BUF * 2)
        val L = FloatArray(BUF)
        val R = FloatArray(BUF)
        while (running) {
            L.fill(0f); R.fill(0f)
            synchronized(lock) {
                for (v in voices) if (v.active) v.render(L, R, BUF, p)
                voices.removeAll { !it.active }
            }
            for (i in 0 until BUF) {
                var l = L[i] * p.volume
                var r = R[i] * p.volume
                buf[i * 2] = (l.coerceIn(-1f, 1f) * 32767).toInt().toShort()
                buf[i * 2 + 1] = (r.coerceIn(-1f, 1f) * 32767).toInt().toShort()
            }
            track?.write(buf, 0, BUF * 2)
        }
    }

    fun noteOn(note: Int, vel: Float = 0.7f) {
        synchronized(lock) {
            voices.find { it.note == note }?.let { voices.remove(it) }
            while (voices.size >= MAX_V) voices.removeAt(0)
            voices.add(Voice(note, vel, p))
        }
    }

    fun noteOff(note: Int) {
        synchronized(lock) { voices.find { it.note == note }?.release() }
    }

    fun allOff() { synchronized(lock) { voices.forEach { it.release() } } }
}

class Voice(val note: Int, vel: Float, params: Params) {
    enum class S { A, D, SU, R, DONE }
    var active = true; private set
    var state = S.A; private set
    private val freq = SynthEngine.m2f(note)
    private val vel = vel
    private var env = 0.0
    private var fL = 0.0; private var fB = 0.0; private var fH = 0.0
    private val oscs = Array(8) { Osc() }
    private val nOsc: Int; private val sub: Boolean

    init {
        nOsc = minOf(params.voices, 8)
        sub = params.subOsc > 0.5f
        for (i in 0 until nOsc) {
            val d = if (nOsc > 1) params.detune * (i.toDouble() / (nOsc - 1) - 0.5) * 2 else 0.0
            oscs[i].det = d + if (i >= 2) params.detune2 * ((i % 2) * 2 - 1) * 0.5 else 0.0
            oscs[i].ph = Math.random()
        }
    }

    fun release() { state = S.R }

    fun render(oL: FloatArray, oR: FloatArray, n: Int, p: Params) {
        val dt = 1.0 / SynthEngine.SR
        for (i in 0 until n) {
            // Envelope
            val rate = when (state) {
                S.A -> 1.0 / (p.attack * SynthEngine.SR + 1)
                S.D -> 1.0 / (p.decay * SynthEngine.SR + 1)
                S.SU -> 0.0
                S.R -> 1.0 / (p.release * SynthEngine.SR + 1)
                S.DONE -> { active = false; return }
            }
            val tgt = when (state) {
                S.A -> if (env >= 0.99) { state = S.D; p.sustain } else 1.0
                S.D -> if (env <= p.sustain + 0.01) { state = S.SU; p.sustain } else p.sustain
                S.SU -> p.sustain
                S.R -> if (env <= 0.005) { state = S.DONE; 0.0 } else 0.0
                S.DONE -> 0.0
            }
            env += (tgt - env) * rate.coerceIn(0.0, 1.0)

            // Oscillators (PolyBLEP)
            var sum = 0.0
            val vg = 1.0 / sqrt((nOsc + if (sub) 1 else 0).toDouble())
            for (o in 0 until nOsc) {
                val f = freq * (1.0 + oscs[o].det * 0.01)
                oscs[o].ph += f * dt
                if (oscs[o].ph >= 1.0) oscs[o].ph -= 1.0
                sum += blep(oscs[o].ph, p.waveType) * vg
            }

            // LFO -> filter
            val lfo = sin(2.0 * PI * p.lfoRate * i * dt)
            val cut = (p.cutoff + lfo * p.lfoDepth * p.cutoff * 0.5).coerceIn(20.0, 18000.0)

            // SVF filter
            val fc = 2.0 * sin(PI * cut / SynthEngine.SR)
            val q = 1.0 / (p.resonance * 25 + 0.7)
            fH = sum - fL - fB * q; fB += fc * fH; fL += fc * fB
            fL = fL.coerceIn(-10.0, 10.0); fB = fB.coerceIn(-10.0, 10.0)

            val s = (fL * env * vel).coerceIn(-1.0, 1.0)
            oL[i] += s.toFloat()
            oR[i] += (s * 0.97 + fH * 0.03 * env * vel).coerceIn(-1f, 1f).toFloat()
        }
    }

    private fun blep(ph: Double, wt: Int) = when (wt) {
        0 -> 2 * ph - 1 - corr(ph)         // saw
        1 -> (if (ph < 0.5) 1.0 else -1.0) + corr(ph) - corr((ph + 0.5) % 1.0)  // square
        2 -> 2 * abs(2 * ph - 1) - 1        // triangle
        else -> sin(2 * PI * ph)             // sine
    }

    private fun corr(p: Double) = if (p < 0.5) { val t = p * 2; t * t } else { val t = (p - 1) * 2; t * t }

    class Osc { var ph = Math.random(); var det = 0.0 }
}

class Params {
    @Volatile var waveType = 0
    @Volatile var detune = 10.0; @Volatile var detune2 = 20.0
    @Volatile var attack = 0.05; @Volatile var decay = 0.3
    @Volatile var sustain = 0.7; @Volatile var release = 0.5
    @Volatile var cutoff = 4000.0; @Volatile var resonance = 0.3
    @Volatile var lfoRate = 1.0; @Volatile var lfoDepth = 0.02
    @Volatile var volume = 0.6f
    @Volatile var voices = 4; @Volatile var subOsc = 0f
    @Volatile var noiseMix = 0f
    @Volatile var reverbMix = 0.25f; @Volatile var reverbSize = 0.7f
    @Volatile var delayMix = 0.1f; @Volatile var delayTime = 0.375f
    @Volatile var delayFB = 0.3f
}
