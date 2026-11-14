package com.example.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MacroNewsAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val currency = intent.getStringExtra(EXTRA_CURRENCY).orEmpty().ifBlank { "FX" }
        val eventTitle = intent.getStringExtra(EXTRA_EVENT_TITLE).orEmpty().ifBlank { "High-Impact News Event" }
        val timeLabel = intent.getStringExtra(EXTRA_TIME_LABEL).orEmpty()
        val eventId = intent.getStringExtra(EXTRA_EVENT_ID).orEmpty()

        NewsNotificationScheduler.showHighImpactNewsNotification(
            context = context,
            eventId = eventId,
            currency = currency,
            eventTitle = eventTitle,
            timeLabel = timeLabel
        )
    }

    companion object {
        const val EXTRA_EVENT_ID = "extra_event_id"
        const val EXTRA_CURRENCY = "extra_currency"
        const val EXTRA_EVENT_TITLE = "extra_event_title"
        const val EXTRA_TIME_LABEL = "extra_time_label"
    }
}
