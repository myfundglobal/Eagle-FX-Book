package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Newspaper
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.NewsEvent
import com.example.data.model.TradeEntry
import com.example.ui.components.EquityCurveChart
import com.example.ui.components.GlassCard
import com.example.ui.components.RiskRewardBarChart
import com.example.ui.components.StatusPill
import com.example.ui.components.TerminalSectionHeader
import com.example.ui.components.WinRateDonutChart
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.LossCrimsonGlow
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.NeonProfitGlow
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TabularNumberStyle
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.DashboardMetrics
import com.example.ui.viewmodel.UiState
import kotlin.math.abs

@Composable
fun DashboardScreen(
    metrics: DashboardMetrics,
    tradesState: UiState<List<TradeEntry>>,
    nextHighImpactNews: NewsEvent?,
    onNavigateToJournal: () -> Unit,
    onNavigateToNews: () -> Unit,
    onOpenLogTrade: () -> Unit
) {
    val trades = (tradesState as? UiState.Success)?.data.orEmpty()
    val pnlPositive = metrics.totalPnl >= 0.0
    val pnlColor = if (pnlPositive) NeonProfit else LossCrimson

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 104.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Hero Net P&L + Equity Curve Glass Card + Gold "+ Add Trade" CTA
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 720.dp),
                accentBorderColor = pnlColor.copy(alpha = 0.45f),
                elevated = true
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "NET REALIZED P&L",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = formatCurrencyPnl(metrics.totalPnl),
                                style = TabularNumberStyle.copy(
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Bold
                                ),
                                color = pnlColor
                            )
                        }
                        Surface(
                            color = if (pnlPositive) NeonProfitGlow else LossCrimsonGlow,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, pnlColor.copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = if (pnlPositive) Icons.AutoMirrored.Filled.TrendingUp else Icons.AutoMirrored.Filled.TrendingDown,
                                    contentDescription = null,
                                    tint = pnlColor,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "${metrics.totalTrades} Trades",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = pnlColor
                                )
                            }
                        }
                    }

                    EquityCurveChart(points = metrics.equityCurve)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "PROFIT FACTOR",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextMuted
                            )
                            Text(
                                text = String.format("%.2f", metrics.profitFactor),
                                style = TabularNumberStyle.copy(
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                ),
                                color = GoldAccent
                            )
                        }
                        Button(
                            onClick = onOpenLogTrade,
                            modifier = Modifier.testTag("dashboard_log_trade_btn"),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GoldAccent,
                                contentColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Add,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.size(6.dp))
                            Text(
                                text = "Add Trade",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // 2. Win Rate Donut + Avg Risk:Reward Glass Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                GlassCard(modifier = Modifier.weight(1f)) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "WIN RATE",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        WinRateDonutChart(
                            winRatePercent = metrics.winRatePercent,
                            winCount = metrics.winCount,
                            lossCount = metrics.lossCount
                        )
                        Text(
                            text = "${metrics.winCount}W / ${metrics.lossCount}L",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextPrimary
                        )
                    }
                }

                GlassCard(modifier = Modifier.weight(1.25f)) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "AVG RISK : REWARD",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        Text(
                            text = "1 : ${String.format("%.2f", metrics.avgRiskReward)}",
                            style = TabularNumberStyle.copy(
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold
                            ),
                            color = ElectricCyan
                        )
                        RiskRewardBarChart(avgRiskReward = metrics.avgRiskReward)
                    }
                }
            }
        }

        // 3. Next High-Impact Macro Catalyst Highlight
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("dashboard_high_impact_news_card"),
                accentBorderColor = if (nextHighImpactNews != null) LossCrimson else null,
                onClick = onNavigateToNews
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
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
                                imageVector = Icons.Filled.Bolt,
                                contentDescription = null,
                                tint = LossCrimson,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "NEXT HIGH-IMPACT CATALYST",
                                style = MaterialTheme.typography.labelSmall,
                                color = LossCrimson,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "View economic calendar",
                            tint = TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    if (nextHighImpactNews != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            StatusPill(
                                text = nextHighImpactNews.currency,
                                color = LossCrimson
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = nextHighImpactNews.event,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TextPrimary,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${nextHighImpactNews.date} • ${nextHighImpactNews.time} • Fcst ${nextHighImpactNews.forecast.ifBlank { "-" }} / Prev ${nextHighImpactNews.previous.ifBlank { "-" }}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                            }
                        }
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Newspaper,
                                contentDescription = null,
                                tint = TextMuted
                            )
                            Text(
                                text = "Tap to view live economic calendar & 20m alert schedule.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // 4. Recent Executions
        item {
            TerminalSectionHeader(
                title = "Recent Executions",
                subtitle = "Private to your Eagle FX Book",
                trailing = {
                    Surface(
                        color = SlateElevated,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, GoldAccent.copy(alpha = 0.4f)),
                        modifier = Modifier.clickable(onClick = onNavigateToJournal)
                    ) {
                        Text(
                            text = "All (${trades.size})",
                            style = MaterialTheme.typography.labelMedium,
                            color = GoldAccent,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            )
        }

        if (trades.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.CalendarMonth,
                            contentDescription = null,
                            tint = GoldAccent,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "No trades logged yet",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = "Tap + Add Trade to record your Forex or Crypto setup and compute live Equity Curve, Profit Factor, and R:R.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            }
        } else {
            items(trades.take(4), key = { it.id }) { trade ->
                CompactTradeRowCard(trade = trade, onClick = onNavigateToJournal)
            }
        }
    }
}

@Composable
private fun CompactTradeRowCard(
    trade: TradeEntry,
    onClick: () -> Unit
) {
    val isWin = trade.pnl >= 0.0
    val pnlColor = if (isWin) NeonProfit else LossCrimson
    val sideColor = if (trade.side == TradeEntry.SIDE_BUY) NeonProfit else LossCrimson

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                StatusPill(text = trade.side.uppercase(), color = sideColor)
                Column {
                    Text(
                        text = trade.pair,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "${trade.date} • ${trade.lotSize} lots • ${trade.strategyTags.joinToString(", ").ifBlank { "Discretionary" }}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = formatCurrencyPnl(trade.pnl),
                    style = TabularNumberStyle.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = pnlColor
                )
                if (trade.riskReward > 0.0) {
                    Text(
                        text = "1:${String.format("%.1f", trade.riskReward)} R:R",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

fun formatCurrencyPnl(value: Double): String {
    val prefix = if (value >= 0) "+" else "-"
    return "$prefix$${String.format("%,.2f", abs(value))}"
}
