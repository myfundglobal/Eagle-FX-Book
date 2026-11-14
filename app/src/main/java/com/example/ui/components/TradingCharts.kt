package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.CommunityPost
import com.example.data.model.StoreProduct
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TabularNumberStyle
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.util.ImageEncodingUtils
import kotlin.math.max

@Composable
fun EquityCurveChart(
    points: List<Double>,
    modifier: Modifier = Modifier
) {
    val isPositive = (points.lastOrNull() ?: 0.0) >= 0.0
    val accent = if (isPositive) NeonProfit else LossCrimson

    if (points.size < 2) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(110.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(ObsidianBlack.copy(alpha = 0.55f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Log trades to plot equity curve",
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted
            )
        }
        return
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(116.dp)
    ) {
        val w = size.width
        val h = size.height
        val pad = 8.dp.toPx()

        val minVal = points.minOrNull() ?: 0.0
        val maxVal = points.maxOrNull() ?: 0.0
        val span = max(1.0, maxVal - minVal)

        fun mapY(v: Double): Float {
            val norm = ((v - minVal) / span).toFloat()
            return (h - pad) - norm * (h - pad * 2f)
        }

        // Zero baseline dashed line
        val zeroY = mapY(0.0).coerceIn(pad, h - pad)
        drawLine(
            color = HairlineBorder,
            start = Offset(0f, zeroY),
            end = Offset(w, zeroY),
            strokeWidth = 1.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
        )

        val linePath = Path()
        val fillPath = Path()
        val stepX = w / (points.size - 1).coerceAtLeast(1)

        points.forEachIndexed { idx, value ->
            val x = idx * stepX
            val y = mapY(value)
            if (idx == 0) {
                linePath.moveTo(x, y)
                fillPath.moveTo(x, h)
                fillPath.lineTo(x, y)
            } else {
                linePath.lineTo(x, y)
                fillPath.lineTo(x, y)
            }
            if (idx == points.lastIndex) {
                fillPath.lineTo(x, h)
                fillPath.close()
            }
        }

        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                colors = listOf(accent.copy(alpha = 0.32f), Color.Transparent)
            )
        )

        drawPath(
            path = linePath,
            color = accent,
            style = Stroke(
                width = 2.5.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )

        val lastX = (points.size - 1) * stepX
        val lastY = mapY(points.last())
        drawCircle(
            color = accent.copy(alpha = 0.25f),
            radius = 8.dp.toPx(),
            center = Offset(lastX, lastY)
        )
        drawCircle(
            color = accent,
            radius = 4.dp.toPx(),
            center = Offset(lastX, lastY)
        )
    }
}

@Composable
fun WinRateDonutChart(
    winRatePercent: Double,
    winCount: Int,
    lossCount: Int,
    modifier: Modifier = Modifier
) {
    val total = winCount + lossCount
    val winSweep = if (total > 0) (winCount.toFloat() / total.toFloat()) * 360f else 0f

    Box(
        modifier = modifier.size(84.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val stroke = 8.dp.toPx()
            val inset = stroke / 2f
            val arcSize = Size(size.width - stroke, size.height - stroke)

            drawArc(
                color = SlateElevated,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round)
            )

            if (total > 0) {
                drawArc(
                    color = LossCrimson,
                    startAngle = -90f + winSweep,
                    sweepAngle = 360f - winSweep,
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )
                drawArc(
                    color = NeonProfit,
                    startAngle = -90f,
                    sweepAngle = winSweep,
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )
            }
        }
        Text(
            text = "${winRatePercent.toInt()}%",
            style = TabularNumberStyle.copy(
                fontSize = MaterialTheme.typography.titleMedium.fontSize,
                fontWeight = FontWeight.Bold
            ),
            color = if (winRatePercent >= 50.0 || total == 0) NeonProfit else LossCrimson
        )
    }
}

@Composable
fun RiskRewardBarChart(
    avgRiskReward: Double,
    modifier: Modifier = Modifier
) {
    val clampedReward = avgRiskReward.coerceIn(0.0, 5.0).toFloat()
    val rewardRatio = if (clampedReward > 0f) (clampedReward / 5f).coerceIn(0.18f, 1f) else 0.1f

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("RISK (1R)", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 10.dp)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(SlateElevated)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.22f)
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(LossCrimson)
                )
            }
            Text("1.0", style = MaterialTheme.typography.labelSmall, color = LossCrimson)
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("REWARD", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 10.dp)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(SlateElevated)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(rewardRatio)
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(NeonProfit)
                )
            }
            Text(
                text = String.format("%.2fR", avgRiskReward),
                style = MaterialTheme.typography.labelSmall,
                color = NeonProfit
            )
        }
    }
}

@Composable
fun DeterministicQrCodeCanvas(
    payload: String,
    modifier: Modifier = Modifier
) {
    val size = 21
    val matrix = remember(payload) {
        val grid = Array(size) { BooleanArray(size) }
        fun setFinder(top: Int, left: Int) {
            for (r in 0 until 7) {
                for (c in 0 until 7) {
                    val isBorder = r == 0 || r == 6 || c == 0 || c == 6
                    val isCenter = r in 2..4 && c in 2..4
                    grid[top + r][left + c] = isBorder || isCenter
                }
            }
        }
        setFinder(0, 0)
        setFinder(0, size - 7)
        setFinder(size - 7, 0)

        var seed = payload.hashCode().toLong() and 0xFFFFFFFFL
        if (seed == 0L) seed = 0x5A5A5A5AL
        for (r in 0 until size) {
            for (c in 0 until size) {
                val inTopLeft = r < 8 && c < 8
                val inTopRight = r < 8 && c >= size - 8
                val inBottomLeft = r >= size - 8 && c < 8
                if (!inTopLeft && !inTopRight && !inBottomLeft) {
                    seed = (seed * 1103515245L + 12345L) and 0x7FFFFFFFL
                    grid[r][c] = (seed % 11L) < 5L
                }
            }
        }
        grid
    }

    Surface(
        color = Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, HairlineBorder),
        modifier = modifier
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            val cell = this.size.width / size.toFloat()
            for (r in 0 until size) {
                for (c in 0 until size) {
                    if (matrix[r][c]) {
                        drawRect(
                            color = ObsidianBlack,
                            topLeft = Offset(c * cell, r * cell),
                            size = Size(cell + 0.4f, cell + 0.4f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StatusPill(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = color.copy(alpha = 0.14f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.4f)),
        shape = RoundedCornerShape(999.dp),
        modifier = modifier
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun PresetOrBase64Image(
    imageKey: String,
    contentDescription: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
) {
    val presetDrawable = when (imageKey) {
        StoreProduct.PRESET_ALGO_BOT -> R.drawable.img_product_algo_bot
        StoreProduct.PRESET_SMC_SUITE -> R.drawable.img_product_smc_suite
        CommunityPost.PRESET_COMMUNITY_CHART -> R.drawable.img_community_setup_chart
        else -> null
    }

    if (presetDrawable != null) {
        Image(
            painter = painterResource(id = presetDrawable),
            contentDescription = contentDescription,
            modifier = modifier,
            contentScale = contentScale
        )
    } else {
        val decoded = remember(imageKey) { ImageEncodingUtils.decodeBase64ToImageBitmap(imageKey) }
        if (decoded != null) {
            Image(
                bitmap = decoded,
                contentDescription = contentDescription,
                modifier = modifier,
                contentScale = contentScale
            )
        } else {
            Image(
                painter = painterResource(id = R.drawable.img_hero_terminal),
                contentDescription = contentDescription,
                modifier = modifier,
                contentScale = contentScale
            )
        }
    }
}

@Composable
fun TerminalSectionHeader(
    title: String,
    subtitle: String? = null,
    trailing: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
        trailing?.invoke()
    }
}
