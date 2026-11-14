package com.example.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.ui.theme.GlassBorderBottom
import com.example.ui.theme.GlassBorderTop
import com.example.ui.theme.GlassDark
import com.example.ui.theme.GlassElevated
import com.example.ui.theme.GlassModal
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.TextMuted

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(20.dp),
    accentBorderColor: Color? = null,
    elevated: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val fillBrush = Brush.verticalGradient(
        colors = if (elevated) {
            listOf(Color(0xF016161B), Color(0xEB0D0D10))
        } else {
            listOf(Color(0xEB121216), Color(0xE60D0D10))
        }
    )
    val borderBrush = if (accentBorderColor != null) {
        Brush.verticalGradient(
            listOf(accentBorderColor.copy(alpha = 0.55f), accentBorderColor.copy(alpha = 0.14f))
        )
    } else {
        Brush.verticalGradient(listOf(GlassBorderTop, GlassBorderBottom))
    }

    val clickableModifier = if (onClick != null) {
        Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = ripple(color = GoldAccent),
            onClick = onClick
        )
    } else {
        Modifier
    }

    Column(
        modifier = modifier
            .clip(shape)
            .background(fillBrush)
            .border(width = 1.dp, brush = borderBrush, shape = shape)
            .then(clickableModifier),
        content = content
    )
}

data class FloatingNavItem(
    val id: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String
)

@Composable
fun FloatingGoldPillNavBar(
    items: List<FloatingNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = GlassModal,
            shape = RoundedCornerShape(999.dp),
            border = BorderStroke(
                width = 1.dp,
                brush = Brush.verticalGradient(listOf(GlassBorderTop, GlassBorderBottom))
            ),
            modifier = Modifier
                .widthIn(max = 520.dp)
                .fillMaxWidth()
                .shadow(
                    elevation = 16.dp,
                    shape = RoundedCornerShape(999.dp),
                    ambientColor = ObsidianBlack,
                    spotColor = GoldAccent.copy(alpha = 0.25f)
                )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                items.forEach { item ->
                    val selected = item.id == selectedId
                    val pillBg by animateColorAsState(
                        targetValue = if (selected) GoldAccent else Color.Transparent,
                        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        label = "navPillBg"
                    )
                    val contentTint by animateColorAsState(
                        targetValue = if (selected) Color.White else TextMuted,
                        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        label = "navPillTint"
                    )

                    Row(
                        modifier = Modifier
                            .minimumInteractiveComponentSize()
                            .height(44.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(pillBg)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = ripple(bounded = true, color = GoldAccent),
                                onClick = { onSelect(item.id) }
                            )
                            .padding(horizontal = if (selected) 14.dp else 12.dp)
                            .testTag(item.testTag),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                            contentDescription = item.label,
                            tint = contentTint,
                            modifier = Modifier.size(20.dp)
                        )
                        if (selected) {
                            Spacer(modifier = Modifier.size(6.dp))
                            Text(
                                text = item.label,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
    }
}
