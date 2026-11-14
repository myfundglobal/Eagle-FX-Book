package com.example.data.network

import android.util.Log
import com.example.data.model.NewsEvent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

object LiveEconomicCalendarService {
    private const val TAG = "EagleLiveCalendar"
    private const val CALENDAR_FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

    suspend fun fetchThisWeekEvents(): Result<List<NewsEvent>> = withContext(Dispatchers.IO) {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(CALENDAR_FEED_URL)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "EagleFXBook/1.0 (Android)")
            }
            val code = connection.responseCode
            if (code !in 200..299) {
                return@withContext Result.failure(IllegalStateException("Calendar feed HTTP $code"))
            }
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val jsonArray = JSONArray(body)
            val parsed = mutableListOf<NewsEvent>()

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.optJSONObject(i) ?: continue
                val title = obj.optString("title").trim()
                val country = obj.optString("country").trim().uppercase(Locale.US)
                val dateIso = obj.optString("date").trim()
                val impactRaw = obj.optString("impact").trim()
                val forecast = obj.optString("forecast").trim()
                val previous = obj.optString("previous").trim()

                if (title.isBlank() || country.isBlank()) continue
                val impact = when {
                    impactRaw.equals("High", ignoreCase = true) -> NewsEvent.IMPACT_HIGH
                    impactRaw.equals("Medium", ignoreCase = true) -> NewsEvent.IMPACT_MEDIUM
                    impactRaw.equals("Low", ignoreCase = true) -> NewsEvent.IMPACT_LOW
                    else -> continue // Skip non-economic bank holidays ("Holiday")
                }

                val millis = parseIsoMillis(dateIso)
                val (dateStr, timeStr) = formatUtcDateAndTime(millis, dateIso)
                parsed.add(
                    NewsEvent(
                        id = "live_${country}_${millis}_${title.hashCode()}",
                        date = dateStr,
                        time = timeStr,
                        timestampMillis = millis,
                        currency = country,
                        event = title,
                        impact = impact,
                        forecast = forecast.ifBlank { "-" },
                        previous = previous.ifBlank { "-" },
                        isLiveFeed = true
                    )
                )
            }

            Result.success(parsed.sortedBy { it.timestampMillis })
        } catch (e: Exception) {
            Log.w(TAG, "Live economic calendar fetch unavailable: ${e.message}")
            Result.failure(e)
        } finally {
            connection?.disconnect()
        }
    }

    private fun parseIsoMillis(iso: String): Long {
        if (iso.isBlank()) return System.currentTimeMillis()
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
        )
        for (pattern in formats) {
            try {
                val sdf = SimpleDateFormat(pattern, Locale.US).apply {
                    if (pattern.endsWith("'Z'")) timeZone = TimeZone.getTimeZone("UTC")
                }
                val parsed = sdf.parse(iso)
                if (parsed != null) return parsed.time
            } catch (_: Exception) {
            }
        }
        return System.currentTimeMillis()
    }

    private fun formatUtcDateAndTime(millis: Long, fallbackIso: String): Pair<String, String> {
        return try {
            val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val timeFmt = SimpleDateFormat("HH:mm 'UTC'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            dateFmt.format(millis) to timeFmt.format(millis)
        } catch (_: Exception) {
            val datePart = fallbackIso.take(10).ifBlank { "2026-11-14" }
            val timePart = fallbackIso.drop(11).take(5).ifBlank { "00:00" } + " UTC"
            datePart to timePart
        }
    }
}
