package com.example.ui.theme

import android.app.Activity
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

private val EagleFxDarkColorScheme = darkColorScheme(
    primary = GoldAccent,
    onPrimary = ObsidianBlack,
    primaryContainer = GoldGlow,
    onPrimaryContainer = GoldAccent,
    secondary = NeonProfit,
    onSecondary = ObsidianBlack,
    secondaryContainer = NeonProfitGlow,
    onSecondaryContainer = NeonProfit,
    tertiary = ElectricCyan,
    onTertiary = ObsidianBlack,
    tertiaryContainer = ElectricCyanGlow,
    onTertiaryContainer = ElectricCyan,
    error = LossCrimson,
    onError = TextPrimary,
    errorContainer = LossCrimsonGlow,
    onErrorContainer = LossCrimson,
    background = ObsidianBlack,
    onBackground = TextPrimary,
    surface = CarbonSurface,
    onSurface = TextPrimary,
    surfaceVariant = SlateElevated,
    onSurfaceVariant = TextSecondary,
    surfaceContainerLowest = ObsidianBlack,
    surfaceContainerLow = CarbonSurface,
    surfaceContainer = SlateElevated,
    surfaceContainerHigh = SlateBright,
    outline = HairlineBorder,
    outlineVariant = Color(0xFF1B2332)
)

private val EagleFxShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(26.dp)
)

@Composable
fun EagleFxBookTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                WindowCompat.getInsetsController(window, view).apply {
                    isAppearanceLightStatusBars = false
                    isAppearanceLightNavigationBars = false
                }
            }
        }
    }

    MaterialTheme(
        colorScheme = EagleFxDarkColorScheme,
        typography = PipLedgerTypography,
        shapes = EagleFxShapes,
        content = content
    )
}
