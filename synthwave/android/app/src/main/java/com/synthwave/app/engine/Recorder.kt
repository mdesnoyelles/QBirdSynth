package com.qbirdsynth.app.engine

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class Recorder(ctx: Context) {
    private var rec: MediaRecorder? = null
    private var on = false
    private var file: File? = null
    val isRecording get() = on

    fun start(): File? {
        if (on) return null
        val dir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_MUSIC) ?: context.filesDir
        file = File(dir, "qbirdsynth_\${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.ogg")
        rec = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()).apply {
            setAudioSource(MediaRecorder.AudioSource.DEFAULT)
            setOutputFormat(MediaRecorder.OutputFormat.OGG)
            setAudioEncoder(MediaRecorder.AudioEncoder.OPUS)
            setAudioSamplingRate(44100)
            setOutputFile(file!!.absolutePath)
            try { prepare(); start(); on = true } catch (e: Exception) { release(); return null }
        }
        return file
    }

    fun stop(): File? {
        if (!on || rec == null) return null
        return try { rec?.stop(); rec?.release(); rec = null; on = false; file }
        catch (e: Exception) { rec?.release(); rec = null; on = false; null }
    }

    private val context = ctx
}
