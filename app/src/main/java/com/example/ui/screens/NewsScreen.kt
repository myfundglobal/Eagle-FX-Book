package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.NewsEvent
import com.example.ui.components.GlassCard
import com.example.ui.components.StatusPill
import com.example.ui.components.TerminalSectionHeader
import com.example.ui.theme.AmberGold
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.UiState

@Composable
fun NewsScreen(
    newsState: UiState<List<NewsEvent>>,
    liveCalendarConnected: Boolean,
    isRefreshingCalendar: Boolean,
    hasNotificationPermission: Boolean,
    onRefreshCalendar: () -> Unit,
    onRequestNotificationAlerts: () -> Unit
) {
    val allEvents = (newsState as? UiState.Success)?.data.orEmpty()
    var selectedImpact by remember { mutableStateOf("All") }
    var selectedCurrency by remember { mutableStateOf("All") }

    val currencies = remember(allEvents) {
        listOf("All") + allEvents.map { it.currency }.filter { it.isNotBlank() }.distinct()
    }

    val filtered = remember(allEvents, selectedImpact, selectedCurrency) {
        allEvents.filter { ev ->
            val impOk = selectedImpact == "All" || ev.impact == selectedImpact
            val curOk = selectedCurrency == "All" || ev.currency == selectedCurrency
            impOk && curOk
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 104.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            TerminalSectionHeader(
                title = "Live Economic Calendar",
                subtitle = "Real-time macroeconomic catalysts & 20m pre-event alerts",
                trailing = {
                    IconButton(
                        onClick = onRefreshCalendar,
                        enabled = !isRefreshingCalendar,
                        modifier = Modifier.testTag("refresh_live_calendar_button")
                    ) {
                        if (isRefreshingCalendar) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = GoldAccent,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(Icons.Filled.Refresh, contentDescription = "Sync Live Calendar", tint = GoldAccent)
                        }
                    }
                }
            )
        }

        // Live Calendar + Alert Banner
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                accentBorderColor = if (liveCalendarConnected) NeonProfit.copy(alpha = 0.45f) else GoldAccent.copy(alpha = 0.45f)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Public,
                                contentDescription = null,
                                tint = if (liveCalendarConnected) NeonProfit else ElectricCyan,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = if (liveCalendarConnected) "ForexFactory Live Feed Connected" else "Eagle Desk Macro Schedule",
                                style = MaterialTheme.typography.titleSmall,
                                color = TextPrimary
                            )
                        }
                        StatusPill(
                            text = if (liveCalendarConnected) "LIVE" else "SYNCED",
                            color = if (liveCalendarConnected) NeonProfit else ElectricCyan
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.NotificationsActive,
                                contentDescription = null,
                                tint = if (hasNotificationPermission) GoldAccent else LossCrimson,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = if (hasNotificationPermission) {
                                    "Automated 20-min High-Impact alerts active"
                                } else {
                                    "Enable alerts for 20-min High-Impact warnings"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                        Button(
                            onClick = onRequestNotificationAlerts,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (hasNotificationPermission) GoldAccent.copy(alpha = 0.2f) else GoldAccent,
                                contentColor = if (hasNotificationPermission) GoldAccent else TextPrimary
                            ),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = if (hasNotificationPermission) "Reschedule" else "Enable",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("All", NewsEvent.IMPACT_HIGH, NewsEvent.IMPACT_MEDIUM, NewsEvent.IMPACT_LOW).forEach { imp ->
                    FilterChip(
                        selected = selectedImpact == imp,
                        onClick = { selectedImpact = imp },
                        label = { Text(if (imp == "All") "All Impact" else "$imp Impact") }
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                currencies.forEach { cur ->
                    FilterChip(
                        selected = selectedCurrency == cur,
                        onClick = { selectedCurrency = cur },
                        label = { Text(cur) }
                    )
                }
            }
        }

        if (filtered.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No scheduled macro events match your filter.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        modifier = Modifier.padding(20.dp)
                    )
                }
            }
        } else {
            items(filtered, key = { it.id }) { event ->
                NewsEventCard(event = event)
            }
        }
    }
}

@Composable
private fun NewsEventCard(event: NewsEvent) {
    val impactColor = when (event.impact) {
        NewsEvent.IMPACT_HIGH -> LossCrimson
        NewsEvent.IMPACT_MEDIUM -> AmberGold
        else -> NeonProfit
    }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        accentBorderColor = if (event.impact == NewsEvent.IMPACT_HIGH) LossCrimson.copy(alpha = 0.55f) else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(54.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(impactColor)
            )

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StatusPill(text = event.currency, color = impactColor)
                    StatusPill(text = "${event.impact.uppercase()} IMPACT", color = impactColor)
                    if (event.isLiveFeed) {
                        StatusPill(text = "LIVE", color = ElectricCyan)
                    }
                }
                Text(
                    text = event.event,
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
                Text(
                    text = "${event.date} • ${event.time}",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextMuted
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("FCST", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                Text(event.forecast.ifBlank { "-" }, style = MaterialTheme.typography.labelMedium, color = TextPrimary)
                Spacer(modifier = Modifier.height(4.dp))
                Text("PREV", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                Text(event.previous.ifBlank { "-" }, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
            }
        }
    }
}
