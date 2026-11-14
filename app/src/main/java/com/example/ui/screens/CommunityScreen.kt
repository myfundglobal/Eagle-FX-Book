package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.CommunityPost
import com.example.ui.components.GlassCard
import com.example.ui.components.PresetOrBase64Image
import com.example.ui.components.StatusPill
import com.example.ui.components.TerminalSectionHeader
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GlassModal
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.UiState
import com.example.util.ImageEncodingUtils
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityScreen(
    postsState: UiState<List<CommunityPost>>,
    likedPostIds: Set<String>,
    isAdmin: Boolean,
    isBusy: Boolean,
    onToggleLike: (String) -> Unit,
    onCreatePost: (title: String, msg: String, pair: String, bias: String, chartKey: String, dateLabel: String, onDone: () -> Unit) -> Unit,
    onDeletePost: (String) -> Unit
) {
    val posts = (postsState as? UiState.Success)?.data.orEmpty()
    var showComposer by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 112.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                TerminalSectionHeader(
                    title = "Eagle FX Community",
                    subtitle = if (isAdmin) {
                        "Admin Broadcast Mode • Posts trigger instant trader alerts"
                    } else {
                        "Curated Desk Setups • Verified Admin Commentary"
                    }
                )
            }

            if (posts.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("No desk updates yet", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                            Text(
                                text = if (isAdmin) "Tap the gold + button to broadcast your first market setup." else "Official Eagle FX Book market setups will appear here live.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            } else {
                items(posts, key = { it.id }) { post ->
                    val isLiked = likedPostIds.contains(post.id)
                    CommunityPostCard(
                        post = post,
                        isLiked = isLiked,
                        isAdmin = isAdmin,
                        onToggleLike = { onToggleLike(post.id) },
                        onDelete = { onDeletePost(post.id) }
                    )
                }
            }
        }

        if (isAdmin) {
            FloatingActionButton(
                onClick = { showComposer = true },
                containerColor = GoldAccent,
                contentColor = TextPrimary,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 18.dp, bottom = 92.dp)
                    .testTag("community_add_post_fab")
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Publish Desk Setup")
            }
        }
    }

    if (showComposer && isAdmin) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showComposer = false },
            sheetState = sheetState,
            containerColor = GlassModal,
            contentColor = TextPrimary
        ) {
            AdminPostComposer(
                isBusy = isBusy,
                onPublish = { title, msg, pair, bias, chartKey, dateLabel ->
                    onCreatePost(title, msg, pair, bias, chartKey, dateLabel) {
                        showComposer = false
                    }
                },
                onCancel = { showComposer = false }
            )
        }
    }
}

@Composable
private fun CommunityPostCard(
    post: CommunityPost,
    isLiked: Boolean,
    isAdmin: Boolean,
    onToggleLike: () -> Unit,
    onDelete: () -> Unit
) {
    val biasColor = when (post.bias) {
        CommunityPost.BIAS_BULLISH -> NeonProfit
        CommunityPost.BIAS_BEARISH -> LossCrimson
        else -> ElectricCyan
    }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        accentBorderColor = biasColor.copy(alpha = 0.25f),
        elevated = true
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
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
                        imageVector = Icons.Filled.Verified,
                        contentDescription = "Verified Eagle FX Book Admin",
                        tint = GoldAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Column {
                        Text(
                            text = post.authorName.ifBlank { "Eagle FX Desk" },
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                        Text(
                            text = post.dateLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (post.pairTag.isNotBlank()) {
                        StatusPill(text = post.pairTag, color = ElectricCyan)
                    }
                    StatusPill(text = post.bias.uppercase(), color = biasColor)
                    if (isAdmin) {
                        IconButton(onClick = onDelete) {
                            Icon(
                                imageVector = Icons.Filled.DeleteOutline,
                                contentDescription = "Delete post",
                                tint = TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            Text(
                text = post.title,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary
            )

            Text(
                text = post.adminMessage,
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary
            )

            if (post.chartImageKey.isNotBlank()) {
                PresetOrBase64Image(
                    imageKey = post.chartImageKey,
                    contentDescription = "Trade setup chart",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    onClick = onToggleLike,
                    color = if (isLiked) LossCrimson.copy(alpha = 0.16f) else SlateElevated,
                    border = BorderStroke(1.dp, if (isLiked) LossCrimson else HairlineBorder),
                    shape = RoundedCornerShape(999.dp),
                    modifier = Modifier.testTag("like_post_button_${post.id}")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = if (isLiked) "Unlike post" else "Like post",
                            tint = if (isLiked) LossCrimson else TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "${post.likesCount} Likes",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (isLiked) LossCrimson else TextPrimary
                        )
                    }
                }
                Text(
                    text = "Eagle FX Book Desk",
                    style = MaterialTheme.typography.labelSmall,
                    color = GoldAccent
                )
            }
        }
    }
}

@Composable
private fun AdminPostComposer(
    isBusy: Boolean,
    onPublish: (title: String, msg: String, pair: String, bias: String, chartKey: String, dateLabel: String) -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val dateLabelDefault = remember { SimpleDateFormat("MMM dd • HH:mm", Locale.US).format(Date()) }

    var title by remember { mutableStateOf("") }
    var pairTag by remember { mutableStateOf("XAU/USD") }
    var bias by remember { mutableStateOf(CommunityPost.BIAS_BULLISH) }
    var message by remember { mutableStateOf("") }
    var chartKey by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                chartKey = ImageEncodingUtils.uriToCompressedBase64(context, uri).orEmpty()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Publish Desk Setup (Admin)", style = MaterialTheme.typography.headlineSmall, color = TextPrimary)

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Setup Headline") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = pairTag,
                onValueChange = { pairTag = it },
                label = { Text("Pair Tag") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Row(
                modifier = Modifier.weight(1.4f),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(CommunityPost.BIAS_BULLISH, CommunityPost.BIAS_BEARISH, CommunityPost.BIAS_NEUTRAL).forEach { opt ->
                    FilterChip(
                        selected = bias == opt,
                        onClick = { bias = opt },
                        label = { Text(opt, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
        }

        OutlinedTextField(
            value = message,
            onValueChange = { message = it },
            label = { Text("Analysis & Invalidation Levels") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Filled.Image, contentDescription = null)
                Spacer(modifier = Modifier.size(6.dp))
                Text(if (chartKey.isBlank() || chartKey == CommunityPost.PRESET_COMMUNITY_CHART) "Upload Chart" else "Chart Selected")
            }
            OutlinedButton(
                onClick = { chartKey = CommunityPost.PRESET_COMMUNITY_CHART },
                modifier = Modifier.weight(1f)
            ) {
                Text("Use Preset Chart")
            }
        }

        if (errorMsg != null) {
            Text(errorMsg!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("Cancel") }
            Button(
                onClick = {
                    if (title.trim().length < 2 || message.trim().length < 2) {
                        errorMsg = "Enter a headline and analysis message."
                        return@Button
                    }
                    onPublish(title, message, pairTag.ifBlank { "FX" }, bias, chartKey, dateLabelDefault)
                },
                enabled = !isBusy,
                colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                modifier = Modifier.weight(1.4f)
            ) {
                Text("Publish Setup", fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}
