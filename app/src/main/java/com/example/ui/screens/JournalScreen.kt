package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.model.TradeEntry
import com.example.ui.components.GlassCard
import com.example.ui.components.StatusPill
import com.example.ui.components.TerminalSectionHeader
import com.example.ui.theme.CarbonSurface
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GlassModal
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
import com.example.ui.viewmodel.UiState
import com.example.util.ImageEncodingUtils
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen(
    tradesState: UiState<List<TradeEntry>>,
    isBusy: Boolean,
    showLogSheetExternal: Boolean,
    onDismissExternalSheet: () -> Unit,
    onOpenLogSheet: () -> Unit,
    onLogTrade: (TradeEntry, () -> Unit) -> Unit,
    onDeleteTrade: (String) -> Unit
) {
    val allTrades = (tradesState as? UiState.Success)?.data.orEmpty()
    val monthOptions = remember(allTrades) {
        listOf("All Months") + allTrades.map { it.monthKey }.filter { it.isNotBlank() }.distinct().sortedDescending()
    }
    val strategyOptions = remember { listOf("All") + TradeEntry.STRATEGY_TAGS }

    var selectedMonth by remember { mutableStateOf("All Months") }
    var selectedStrategy by remember { mutableStateOf("All") }
    var previewScreenshotBase64 by remember { mutableStateOf<String?>(null) }

    val filteredTrades = remember(allTrades, selectedMonth, selectedStrategy) {
        allTrades.filter { trade ->
            val monthOk = selectedMonth == "All Months" || trade.monthKey == selectedMonth
            val stratOk = selectedStrategy == "All" || trade.strategyTags.contains(selectedStrategy)
            monthOk && stratOk
        }
    }

    val filteredPnl = remember(filteredTrades) { filteredTrades.sumOf { it.pnl } }
    val filteredWins = remember(filteredTrades) { filteredTrades.count { it.pnl >= 0 } }
    val filteredWinRate = if (filteredTrades.isNotEmpty()) (filteredWins * 100) / filteredTrades.size else 0

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 112.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                TerminalSectionHeader(
                    title = "Trading Journal",
                    subtitle = "Private execution log • Filtered by Month & Strategy"
                )
            }

            // Month Filter Row
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    monthOptions.forEach { month ->
                        FilterChip(
                            selected = selectedMonth == month,
                            onClick = { selectedMonth = month },
                            label = { Text(month, style = MaterialTheme.typography.labelMedium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = GoldAccent.copy(alpha = 0.2f),
                                selectedLabelColor = GoldAccent,
                                containerColor = CarbonSurface,
                                labelColor = TextSecondary
                            )
                        )
                    }
                }
            }

            // Strategy Filter Row
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    strategyOptions.forEach { tag ->
                        FilterChip(
                            selected = selectedStrategy == tag,
                            onClick = { selectedStrategy = tag },
                            label = { Text(tag, style = MaterialTheme.typography.labelMedium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = NeonProfit.copy(alpha = 0.2f),
                                selectedLabelColor = NeonProfit,
                                containerColor = CarbonSurface,
                                labelColor = TextSecondary
                            )
                        )
                    }
                }
            }

            // Filtered Summary Glass Strip
            item {
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevated = true
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("FILTERED P&L", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text(
                                text = formatCurrencyPnl(filteredPnl),
                                style = TabularNumberStyle.copy(fontSize = 18.sp, fontWeight = FontWeight.Bold),
                                color = if (filteredPnl >= 0) NeonProfit else LossCrimson
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("EXECUTIONS", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text(
                                text = "${filteredTrades.size}",
                                style = TabularNumberStyle.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("WIN RATE", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text(
                                text = "$filteredWinRate%",
                                style = TabularNumberStyle.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold),
                                color = NeonProfit
                            )
                        }
                    }
                }
            }

            if (filteredTrades.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "No trades match current filters",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary
                            )
                            Text(
                                text = "Tap the gold + button to log a new FX or Crypto execution with entry, exit, lot size, strategy tags, and chart screenshot.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            } else {
                items(filteredTrades, key = { it.id }) { trade ->
                    TradeDetailCard(
                        trade = trade,
                        onViewScreenshot = { previewScreenshotBase64 = trade.screenshotBase64 },
                        onDelete = { onDeleteTrade(trade.id) }
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = onOpenLogSheet,
            containerColor = GoldAccent,
            contentColor = TextPrimary,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 18.dp, bottom = 92.dp)
                .testTag("journal_add_trade_fab")
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Add Trade")
        }
    }

    if (showLogSheetExternal) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = onDismissExternalSheet,
            sheetState = sheetState,
            containerColor = GlassModal,
            contentColor = TextPrimary
        ) {
            LogTradeForm(
                isBusy = isBusy,
                onSubmit = { entry ->
                    onLogTrade(entry) { onDismissExternalSheet() }
                },
                onCancel = onDismissExternalSheet
            )
        }
    }

    if (previewScreenshotBase64 != null) {
        val bitmap = remember(previewScreenshotBase64) {
            ImageEncodingUtils.decodeBase64ToImageBitmap(previewScreenshotBase64!!)
        }
        Dialog(onDismissRequest = { previewScreenshotBase64 = null }) {
            GlassCard(elevated = true) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Trade Chart Screenshot", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap,
                            contentDescription = "Full trade chart screenshot",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(320.dp)
                                .clip(RoundedCornerShape(10.dp)),
                            contentScale = ContentScale.Fit
                        )
                    }
                    Button(
                        onClick = { previewScreenshotBase64 = null },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary)
                    ) {
                        Text("Close", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TradeDetailCard(
    trade: TradeEntry,
    onViewScreenshot: () -> Unit,
    onDelete: () -> Unit
) {
    val isWin = trade.pnl >= 0.0
    val pnlColor = if (isWin) NeonProfit else LossCrimson
    val sideColor = if (trade.side == TradeEntry.SIDE_BUY) NeonProfit else LossCrimson

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp)
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
                    StatusPill(text = trade.side.uppercase(), color = sideColor)
                    Text(
                        text = trade.pair,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                    Text(
                        text = trade.date,
                        style = MaterialTheme.typography.labelMedium,
                        color = TextMuted
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = formatCurrencyPnl(trade.pnl),
                        style = TabularNumberStyle.copy(fontSize = 17.sp, fontWeight = FontWeight.Bold),
                        color = pnlColor
                    )
                    IconButton(onClick = onDelete) {
                        Icon(
                            imageVector = Icons.Filled.DeleteOutline,
                            contentDescription = "Delete trade",
                            tint = TextMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                MetricCol("LOT SIZE", "${trade.lotSize}")
                MetricCol("ENTRY", "${trade.entryPrice}")
                MetricCol("EXIT", "${trade.exitPrice}")
                MetricCol("R:R", if (trade.riskReward > 0) "1:${String.format("%.2f", trade.riskReward)}" else "-")
            }

            if (trade.strategyTags.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    trade.strategyTags.forEach { tag ->
                        Surface(
                            color = SlateElevated,
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(1.dp, HairlineBorder)
                        ) {
                            Text(
                                text = tag,
                                style = MaterialTheme.typography.labelSmall,
                                color = ElectricCyan,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            if (trade.notes.isNotBlank()) {
                Text(
                    text = trade.notes,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            if (trade.screenshotBase64.isNotBlank()) {
                val thumb = remember(trade.screenshotBase64) {
                    ImageEncodingUtils.decodeBase64ToImageBitmap(trade.screenshotBase64)
                }
                if (thumb != null) {
                    Image(
                        bitmap = thumb,
                        contentDescription = "Trade chart screenshot",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable(onClick = onViewScreenshot),
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricCol(label: String, value: String) {
    Column {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = TextMuted)
        Text(
            text = value,
            style = TabularNumberStyle.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium),
            color = TextPrimary
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LogTradeForm(
    isBusy: Boolean,
    onSubmit: (TradeEntry) -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val todayDate = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

    var pair by remember { mutableStateOf("XAU/USD") }
    var side by remember { mutableStateOf(TradeEntry.SIDE_BUY) }
    var date by remember { mutableStateOf(todayDate) }
    var lotSizeStr by remember { mutableStateOf("0.50") }
    var entryStr by remember { mutableStateOf("") }
    var exitStr by remember { mutableStateOf("") }
    var slStr by remember { mutableStateOf("") }
    var tpStr by remember { mutableStateOf("") }
    var pnlStr by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedTags by remember { mutableStateOf(setOf("SMC")) }
    var screenshotBase64 by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val encoded = ImageEncodingUtils.uriToCompressedBase64(context, uri)
                if (encoded != null) {
                    screenshotBase64 = encoded
                } else {
                    errorMsg = "Could not process selected image"
                }
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
        Text("Log Trade Execution", style = MaterialTheme.typography.headlineSmall, color = TextPrimary)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            TradeEntry.PRESET_PAIRS.forEach { preset ->
                FilterChip(
                    selected = pair == preset,
                    onClick = { pair = preset },
                    label = { Text(preset, style = MaterialTheme.typography.labelMedium) }
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = pair,
                onValueChange = { pair = it },
                label = { Text("Pair") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = date,
                onValueChange = { date = it },
                label = { Text("Date (YYYY-MM-DD)") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            listOf(TradeEntry.SIDE_BUY, TradeEntry.SIDE_SELL).forEach { option ->
                val selected = side == option
                val color = if (option == TradeEntry.SIDE_BUY) NeonProfit else LossCrimson
                Surface(
                    onClick = { side = option },
                    color = if (selected) color.copy(alpha = 0.2f) else SlateElevated,
                    border = BorderStroke(1.dp, if (selected) color else HairlineBorder),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier.padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = option.uppercase(),
                            style = MaterialTheme.typography.labelLarge,
                            color = if (selected) color else TextSecondary
                        )
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = lotSizeStr,
                onValueChange = { lotSizeStr = it },
                label = { Text("Lot Size") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = pnlStr,
                onValueChange = { pnlStr = it },
                label = { Text("Net P&L ($)") },
                placeholder = { Text("e.g. 420 or -150") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = entryStr,
                onValueChange = { entryStr = it },
                label = { Text("Entry Price") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = exitStr,
                onValueChange = { exitStr = it },
                label = { Text("Exit Price") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = slStr,
                onValueChange = { slStr = it },
                label = { Text("Stop Loss (opt)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = tpStr,
                onValueChange = { tpStr = it },
                label = { Text("Take Profit (opt)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }

        Text("Strategy Tags", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            TradeEntry.STRATEGY_TAGS.forEach { tag ->
                val isSelected = selectedTags.contains(tag)
                FilterChip(
                    selected = isSelected,
                    onClick = {
                        selectedTags = if (isSelected) selectedTags - tag else selectedTags + tag
                    },
                    label = { Text(tag, style = MaterialTheme.typography.labelMedium) }
                )
            }
        }

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Execution Notes") },
            modifier = Modifier.fillMaxWidth(),
            maxLines = 3
        )

        OutlinedButton(
            onClick = {
                photoPickerLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                )
            },
            modifier = Modifier.fillMaxWidth(),
            border = BorderStroke(1.dp, HairlineBorder)
        ) {
            Icon(Icons.Filled.Image, contentDescription = null, tint = GoldAccent)
            Spacer(modifier = Modifier.size(8.dp))
            Text(
                text = if (screenshotBase64.isBlank()) "Attach Chart Screenshot" else "Chart Screenshot Attached (Tap to Replace)",
                color = GoldAccent
            )
        }

        if (errorMsg != null) {
            Text(errorMsg!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }
            Button(
                onClick = {
                    val lot = lotSizeStr.toDoubleOrNull()
                    val entry = entryStr.toDoubleOrNull()
                    val exit = exitStr.toDoubleOrNull()
                    val pnl = pnlStr.toDoubleOrNull()
                    val sl = slStr.toDoubleOrNull() ?: 0.0
                    val tp = tpStr.toDoubleOrNull() ?: 0.0

                    if (pair.isBlank() || lot == null || lot <= 0 || entry == null || entry <= 0 || exit == null || exit <= 0 || pnl == null) {
                        errorMsg = "Please enter valid Pair, Lot Size, Entry, Exit, and P&L."
                        return@Button
                    }

                    val rr = if (sl > 0.0 && abs(entry - sl) > 1e-6) {
                        val rewardDist = if (tp > 0.0) abs(tp - entry) else abs(exit - entry)
                        (rewardDist / abs(entry - sl)).coerceIn(0.0, 50.0)
                    } else if (pnl >= 0) {
                        2.0
                    } else {
                        1.0
                    }

                    val monthKey = if (date.length >= 7) date.substring(0, 7) else "2026-11"
                    onSubmit(
                        TradeEntry(
                            date = date,
                            monthKey = monthKey,
                            pair = pair.trim().uppercase(),
                            side = side,
                            lotSize = lot,
                            entryPrice = entry,
                            exitPrice = exit,
                            stopLoss = sl,
                            takeProfit = tp,
                            riskReward = rr,
                            strategyTags = selectedTags.toList(),
                            pnl = pnl,
                            notes = notes.trim(),
                            screenshotBase64 = screenshotBase64
                        )
                    )
                },
                enabled = !isBusy,
                colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                modifier = Modifier
                    .weight(1.4f)
                    .testTag("submit_trade_button")
            ) {
                Text("Save Trade", fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.height(18.dp))
    }
}
