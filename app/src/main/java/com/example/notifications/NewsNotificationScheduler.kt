package com.example.notifications

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.MainActivity
import com.example.R
import com.example.data.model.CommunityPost
import com.example.data.model.NewsEvent

object NewsNotificationScheduler {
    private const val TAG = "EagleNotifications"
    const val CHANNEL_NEWS = "eagle_fx_news_alerts"
    const val CHANNEL_COMMUNITY = "eagle_fx_community_alerts"
    private const val LEAD_TIME_MS = 20L * 60L * 1000L // 20 minutes before High Impact news

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val newsChannel = NotificationChannel(
                CHANNEL_NEWS,
                "High-Impact Economic Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts 20 minutes before High-Impact macroeconomic events."
            }
            val communityChannel = NotificationChannel(
                CHANNEL_COMMUNITY,
                "Eagle Desk Community Setups",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Instant market updates and chart setups posted by Eagle FX Book Admin."
            }
            manager.createNotificationChannel(newsChannel)
            manager.createNotificationChannel(communityChannel)
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun scheduleHighImpactAlerts(context: Context, events: List<NewsEvent>): Int {
        ensureChannels(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return 0
        val now = System.currentTimeMillis()
        var scheduledCount = 0

        events.filter { it.impact == NewsEvent.IMPACT_HIGH }
            .filter { it.timestampMillis > now }
            .take(10)
            .forEach { event ->
                val triggerAt = event.timestampMillis - LEAD_TIME_MS
                val effectiveTrigger = if (triggerAt <= now && event.timestampMillis - now <= 30L * 60L * 1000L) {
                    now + 3_000L
                } else {
                    triggerAt
                }
                if (effectiveTrigger <= now) return@forEach

                val intent = Intent(context, MacroNewsAlarmReceiver::class.java).apply {
                    putExtra(MacroNewsAlarmReceiver.EXTRA_EVENT_ID, event.id)
                    putExtra(MacroNewsAlarmReceiver.EXTRA_CURRENCY, event.currency)
                    putExtra(MacroNewsAlarmReceiver.EXTRA_EVENT_TITLE, event.event)
                    putExtra(MacroNewsAlarmReceiver.EXTRA_TIME_LABEL, event.time)
                }
                val requestCode = (event.id.hashCode() and 0x7FFFFFFF)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                try {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, effectiveTrigger, pendingIntent)
                    scheduledCount++
                } catch (e: Exception) {
                    Log.w(TAG, "Unable to schedule alarm for ${event.event}: ${e.message}")
                }
            }
        return scheduledCount
    }

    fun showHighImpactNewsNotification(
        context: Context,
        eventId: String,
        currency: String,
        eventTitle: String,
        timeLabel: String
    ) {
        if (!hasNotificationPermission(context)) return
        ensureChannels(context)

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_NEWS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Eagle FX Book • High-Impact $currency Alert")
            .setContentText("$eventTitle starts soon ($timeLabel). Manage open risk.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$currency Red-Folder Catalyst: $eventTitle ($timeLabel). Protect stops and check volatility windows.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()

        runCatching {
            NotificationManagerCompat.from(context).notify((eventId.hashCode() and 0x7FFFFFFF) + 1000, notification)
        }
    }

    fun showNewCommunityPostNotification(context: Context, post: CommunityPost) {
        if (!hasNotificationPermission(context)) return
        ensureChannels(context)

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            post.id.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Eagle FX Book • New ${post.pairTag} ${post.bias} Setup")
            .setContentText(post.title)
            .setStyle(NotificationCompat.BigTextStyle().bigText("${post.title}\n${post.adminMessage}"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()

        runCatching {
            NotificationManagerCompat.from(context).notify((post.id.hashCode() and 0x7FFFFFFF) + 2000, notification)
        }
    }
}
