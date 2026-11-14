package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults.SecondaryIndicator
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.example.data.model.AdminSettings
import com.example.data.model.NewsEvent
import com.example.data.model.OrderRecord
import com.example.data.model.StoreProduct
import com.example.data.model.SubscriptionPlan
import com.example.data.model.UserProfile
import com.example.ui.components.DeterministicQrCodeCanvas
import com.example.ui.components.GlassCard
import com.example.ui.components.StatusPill
import com.example.ui.theme.CarbonSurface
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.TabularNumberStyle
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.util.ImageEncodingUtils
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPanelScreen(
    allOrders: List<OrderRecord>,
    allUsers: List<UserProfile>,
    plans: List<SubscriptionPlan>,
    adminSettings: AdminSettings?,
    isBusy: Boolean,
    onBack: () -> Unit,
    onApproveOrder: (OrderRecord, String) -> Unit,
    onRejectOrder: (String, String) -> Unit,
    onSavePaymentSettings: (upiId: String, qrBase64: String, wallet: String, network: String) -> Unit,
    onSavePlan: (SubscriptionPlan, onDone: () -> Unit) -> Unit,
    onDeletePlan: (String) -> Unit,
    onSaveProduct: (StoreProduct, fileLink: String, instructions: String) -> Unit,
    onAddNewsEvent: (NewsEvent) -> Unit,
    onToggleUserBlocked: (UserProfile, blockUser: Boolean) -> Unit,
    onSeedStarterData: () -> Unit
) {
    BackHandler { onBack() }

    var selectedTab by remember { mutableIntStateOf(0) }
    val pendingCount = remember(allOrders) { allOrders.count { it.status == OrderRecord.STATUS_PENDING } }
    val activeSubsCount = remember(allUsers) { allUsers.count { it.hasActiveSubscription } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
    ) {
        TopAppBar(
            title = {
                Column {
                    Text("Eagle FX Admin Desk", style = MaterialTheme.typography.titleLarge)
                    Text(
                        text = UserProfile.BOOTSTRAP_ADMIN_EMAIL,
                        style = MaterialTheme.typography.labelSmall,
                        color = GoldAccent
                    )
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack, modifier = Modifier.testTag("admin_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = CarbonSurface,
                titleContentColor = TextPrimary,
                navigationIconContentColor = TextPrimary
            )
        )

        // Admin Analytics Overview Row: Total Users, Active Subscriptions, Pending Orders
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            AdminMetricTile(
                label = "TOTAL USERS",
                value = "${allUsers.size}",
                accent = ElectricCyan,
                modifier = Modifier.weight(1f)
            )
            AdminMetricTile(
                label = "ACTIVE SUBS",
                value = "$activeSubsCount",
                accent = NeonProfit,
                modifier = Modifier.weight(1f)
            )
            AdminMetricTile(
                label = "PENDING ORDERS",
                value = "$pendingCount",
                accent = GoldAccent,
                modifier = Modifier.weight(1f)
            )
        }

        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = CarbonSurface,
            contentColor = GoldAccent,
            edgePadding = 12.dp,
            indicator = { tabPositions ->
                if (selectedTab < tabPositions.size) {
                    SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = GoldAccent
                    )
                }
            }
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Orders ($pendingCount)") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Users (${allUsers.size})") })
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("Plans (${plans.size})") })
            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text("Payment QR & Wallet") })
            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text("Add Bot/Software") })
            Tab(selected = selectedTab == 5, onClick = { selectedTab = 5 }, text = { Text("Macro News") })
        }

        when (selectedTab) {
            0 -> AdminOrdersTab(
                orders = allOrders,
                isBusy = isBusy,
                onApprove = onApproveOrder,
                onReject = onRejectOrder
            )
            1 -> AdminUsersTab(
                users = allUsers,
                onToggleUserBlocked = onToggleUserBlocked
            )
            2 -> AdminPlansTab(
                plans = plans,
                isBusy = isBusy,
                onSavePlan = onSavePlan,
                onDeletePlan = onDeletePlan
            )
            3 -> AdminPaymentSettingsTab(
                current = adminSettings,
                isBusy = isBusy,
                onSave = onSavePaymentSettings
            )
            4 -> AdminAddProductTab(
                isBusy = isBusy,
                onSaveProduct = onSaveProduct
            )
            5 -> AdminNewsAndSyncTab(
                isBusy = isBusy,
                onAddNews = onAddNewsEvent,
                onSeedStarter = onSeedStarterData
            )
        }
    }
}

@Composable
private fun AdminMetricTile(
    label: String,
    value: String,
    accent: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        accentBorderColor = accent.copy(alpha = 0.35f)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = TextMuted)
            Text(
                text = value,
                style = TabularNumberStyle.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold),
                color = accent
            )
        }
    }
}

@Composable
private fun AdminOrdersTab(
    orders: List<OrderRecord>,
    isBusy: Boolean,
    onApprove: (OrderRecord, String) -> Unit,
    onReject: (String, String) -> Unit
) {
    var proofPreview by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (orders.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No customer orders yet. Submitted UPI/Crypto Plan & Bot orders appear here for approval.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        modifier = Modifier.padding(20.dp)
                    )
                }
            }
        } else {
            items(orders, key = { it.id }) { order ->
                val statusColor = when (order.status) {
                    OrderRecord.STATUS_APPROVED -> NeonProfit
                    OrderRecord.STATUS_REJECTED -> LossCrimson
                    else -> GoldAccent
                }
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(order.productName, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                                    StatusPill(text = order.itemType.uppercase(), color = ElectricCyan)
                                }
                                Text("${order.userName} (${order.userEmail})", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            StatusPill(text = order.status.uppercase(), color = statusColor)
                        }

                        Text(
                            text = "${order.paymentMethod} • ${order.amountLabel} • Txn ID: ${order.transactionId}",
                            style = MaterialTheme.typography.labelMedium,
                            color = ElectricCyan
                        )

                        if (order.paymentScreenshotBase64.isNotBlank()) {
                            val thumb = remember(order.paymentScreenshotBase64) {
                                ImageEncodingUtils.decodeBase64ToImageBitmap(order.paymentScreenshotBase64)
                            }
                            if (thumb != null) {
                                Image(
                                    bitmap = thumb,
                                    contentDescription = "Payment proof screenshot",
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(140.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable { proofPreview = order.paymentScreenshotBase64 },
                                    contentScale = ContentScale.Crop
                                )
                            }
                        }

                        if (order.status == OrderRecord.STATUS_PENDING) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                OutlinedButton(
                                    onClick = { onReject(order.id, "Payment reference not matched") },
                                    enabled = !isBusy,
                                    border = BorderStroke(1.dp, LossCrimson),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Filled.Close, contentDescription = null, tint = LossCrimson, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.size(6.dp))
                                    Text("Reject", color = LossCrimson)
                                }
                                Button(
                                    onClick = { onApprove(order, "Payment verified & activated") },
                                    enabled = !isBusy,
                                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                                    modifier = Modifier
                                        .weight(1.3f)
                                        .testTag("admin_approve_order_${order.id}")
                                ) {
                                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.size(6.dp))
                                    Text("Approve & Unlock", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (proofPreview != null) {
        val bmp = remember(proofPreview) { ImageEncodingUtils.decodeBase64ToImageBitmap(proofPreview!!) }
        Dialog(onDismissRequest = { proofPreview = null }) {
            GlassCard(elevated = true) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Payment Screenshot", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    if (bmp != null) {
                        Image(
                            bitmap = bmp,
                            contentDescription = "Full payment proof",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(340.dp),
                            contentScale = ContentScale.Fit
                        )
                    }
                    Button(
                        onClick = { proofPreview = null },
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

@Composable
private fun AdminUsersTab(
    users: List<UserProfile>,
    onToggleUserBlocked: (UserProfile, blockUser: Boolean) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "Instant Database-Wide User Access Control",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
            Text(
                text = "Toggling Block immediately revokes Firestore read/write access for that trader.",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }

        items(users, key = { it.userId }) { user ->
            val isBootstrapAdmin = user.email.equals(UserProfile.BOOTSTRAP_ADMIN_EMAIL, ignoreCase = true)
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                accentBorderColor = if (user.isBlocked) LossCrimson.copy(alpha = 0.55f) else null
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(user.name.ifBlank { "Unnamed Trader" }, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                        Text(user.email, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                        if (user.phoneNumber.isNotBlank()) {
                            Text("${user.countryCode} ${user.phoneNumber}", style = MaterialTheme.typography.labelSmall, color = ElectricCyan)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 2.dp)) {
                            StatusPill(
                                text = user.activePlanName.uppercase(),
                                color = if (user.hasActiveSubscription) GoldAccent else TextMuted
                            )
                            StatusPill(
                                text = if (user.isBlocked) "BLOCKED" else "ACTIVE",
                                color = if (user.isBlocked) LossCrimson else NeonProfit
                            )
                        }
                    }

                    if (!isBootstrapAdmin) {
                        Column(horizontalAlignment = Alignment.End) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Block,
                                    contentDescription = null,
                                    tint = if (user.isBlocked) LossCrimson else TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = if (user.isBlocked) "Blocked" else "Block",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (user.isBlocked) LossCrimson else TextSecondary
                                )
                                Switch(
                                    checked = user.isBlocked,
                                    onCheckedChange = { shouldBlock ->
                                        onToggleUserBlocked(user, shouldBlock)
                                    },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = TextPrimary,
                                        checkedTrackColor = LossCrimson
                                    ),
                                    modifier = Modifier.testTag("block_user_switch_${user.userId}")
                                )
                            }
                        }
                    } else {
                        StatusPill(text = "ROOT ADMIN", color = GoldAccent)
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminPlansTab(
    plans: List<SubscriptionPlan>,
    isBusy: Boolean,
    onSavePlan: (SubscriptionPlan, onDone: () -> Unit) -> Unit,
    onDeletePlan: (String) -> Unit
) {
    var editingId by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var durationLabel by remember { mutableStateOf("30 Days") }
    var durationDaysStr by remember { mutableStateOf("30") }
    var priceUsdStr by remember { mutableStateOf("29") }
    var priceInrStr by remember { mutableStateOf("2499") }
    var badgeText by remember { mutableStateOf("") }
    var featuresCsv by remember { mutableStateOf("Unlimited Trades, Live Economic Alerts, Desk Signals") }
    var isActive by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), accentBorderColor = GoldAccent.copy(alpha = 0.4f)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = if (editingId.isBlank()) "Create FX Book Plan" else "Edit Subscription Plan",
                        style = MaterialTheme.typography.titleMedium,
                        color = GoldAccent
                    )
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Plan Name (e.g. 30 Days Pro)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = durationLabel,
                            onValueChange = { durationLabel = it },
                            label = { Text("Duration Label") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = durationDaysStr,
                            onValueChange = { durationDaysStr = it },
                            label = { Text("Days (0 = Lifetime)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = priceUsdStr,
                            onValueChange = { priceUsdStr = it },
                            label = { Text("USD ($)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = priceInrStr,
                            onValueChange = { priceInrStr = it },
                            label = { Text("INR (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = badgeText,
                            onValueChange = { badgeText = it },
                            label = { Text("Badge") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedTextField(
                        value = featuresCsv,
                        onValueChange = { featuresCsv = it },
                        label = { Text("Plan Features (comma-separated)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Visible to Buyers", style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                        Switch(checked = isActive, onCheckedChange = { isActive = it })
                    }

                    if (errorMsg != null) {
                        Text(errorMsg!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        if (editingId.isNotBlank()) {
                            OutlinedButton(
                                onClick = {
                                    editingId = ""
                                    name = ""
                                    badgeText = ""
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Clear Edit")
                            }
                        }
                        Button(
                            onClick = {
                                val days = durationDaysStr.toIntOrNull()
                                val usd = priceUsdStr.toDoubleOrNull()
                                val inr = priceInrStr.toDoubleOrNull()
                                if (name.trim().length < 2 || days == null || days < 0 || usd == null || usd < 0 || inr == null || inr < 0) {
                                    errorMsg = "Provide valid Plan Name, Duration Days (>=0), and prices."
                                    return@Button
                                }
                                errorMsg = null
                                onSavePlan(
                                    SubscriptionPlan(
                                        id = editingId,
                                        name = name.trim(),
                                        durationLabel = durationLabel.trim().ifBlank { if (days == 0) "Lifetime" else "$days Days" },
                                        durationDays = days,
                                        priceUsd = usd,
                                        priceInr = inr,
                                        features = featuresCsv.split(",").map { it.trim() }.filter { it.isNotBlank() },
                                        badgeText = badgeText.trim(),
                                        isActive = isActive
                                    )
                                ) {
                                    editingId = ""
                                    name = ""
                                    badgeText = ""
                                }
                            },
                            enabled = !isBusy,
                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                            modifier = Modifier
                                .weight(1.4f)
                                .testTag("save_plan_button")
                        ) {
                            Text(if (editingId.isBlank()) "Publish Plan" else "Update Plan", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        items(plans, key = { it.id }) { plan ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(plan.name, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                        Text(
                            text = "${plan.durationLabel} • $${plan.priceUsd.toInt()} / ₹${plan.priceInr.toInt()}",
                            style = MaterialTheme.typography.bodySmall,
                            color = GoldAccent
                        )
                    }
                    Row {
                        IconButton(
                            onClick = {
                                editingId = plan.id
                                name = plan.name
                                durationLabel = plan.durationLabel
                                durationDaysStr = plan.durationDays.toString()
                                priceUsdStr = plan.priceUsd.toInt().toString()
                                priceInrStr = plan.priceInr.toInt().toString()
                                badgeText = plan.badgeText
                                featuresCsv = plan.features.joinToString(", ")
                                isActive = plan.isActive
                            }
                        ) {
                            Icon(Icons.Filled.Edit, contentDescription = "Edit plan", tint = ElectricCyan)
                        }
                        IconButton(onClick = { onDeletePlan(plan.id) }) {
                            Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete plan", tint = LossCrimson)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminPaymentSettingsTab(
    current: AdminSettings?,
    isBusy: Boolean,
    onSave: (upiId: String, qrBase64: String, wallet: String, network: String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var upiId by remember(current) { mutableStateOf(current?.currentUpiId ?: "eaglefxbook@okaxis") }
    var upiQrBase64 by remember(current) { mutableStateOf(current?.currentUpiQrImageBase64 ?: "") }
    var cryptoWallet by remember(current) { mutableStateOf(current?.currentCryptoWalletAddress ?: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE") }
    var cryptoNetwork by remember(current) { mutableStateOf(current?.cryptoNetwork ?: "TRC20 (USDT)") }
    var validationErr by remember { mutableStateOf<String?>(null) }

    val qrPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val encoded = ImageEncodingUtils.uriToCompressedBase64(context, uri)
                if (encoded != null) upiQrBase64 = encoded
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Live Store Payment Destination", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                    Text(
                        "Updates take effect immediately for all buyers clicking Subscribe or Buy in the Store.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )

                    OutlinedTextField(
                        value = upiId,
                        onValueChange = { upiId = it },
                        label = { Text("Current UPI ID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val customQr = remember(upiQrBase64) { ImageEncodingUtils.decodeBase64ToImageBitmap(upiQrBase64) }
                        if (customQr != null) {
                            Image(
                                bitmap = customQr,
                                contentDescription = "Custom UPI QR preview",
                                modifier = Modifier
                                    .size(90.dp)
                                    .clip(RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            DeterministicQrCodeCanvas(
                                payload = "upi://pay?pa=$upiId",
                                modifier = Modifier.size(90.dp)
                            )
                        }

                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(
                                onClick = {
                                    qrPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Filled.QrCode2, contentDescription = null)
                                Spacer(modifier = Modifier.size(6.dp))
                                Text("Upload Custom UPI QR")
                            }
                            if (upiQrBase64.isNotBlank()) {
                                OutlinedButton(
                                    onClick = { upiQrBase64 = "" },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Revert to Dynamic QR")
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = cryptoWallet,
                        onValueChange = { cryptoWallet = it },
                        label = { Text("Current Crypto Wallet Address") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("TRC20 (USDT)", "BEP20 (USDT)", "ERC20 (USDC)").forEach { net ->
                            FilterChip(
                                selected = cryptoNetwork == net,
                                onClick = { cryptoNetwork = net },
                                label = { Text(net, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    if (validationErr != null) {
                        Text(validationErr!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
                    }

                    Button(
                        onClick = {
                            if (upiId.trim().length < 3 || cryptoWallet.trim().length < 8) {
                                validationErr = "Enter valid UPI ID and Crypto wallet address."
                                return@Button
                            }
                            validationErr = null
                            onSave(upiId, upiQrBase64, cryptoWallet, cryptoNetwork)
                        },
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("save_admin_settings_btn")
                    ) {
                        Text("Publish Live Payment Settings", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminAddProductTab(
    isBusy: Boolean,
    onSaveProduct: (StoreProduct, fileLink: String, instructions: String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(StoreProduct.CATEGORY_ALGO_BOT) }
    var version by remember { mutableStateOf("1.0.0") }
    var description by remember { mutableStateOf("") }
    var priceUsdStr by remember { mutableStateOf("129") }
    var priceInrStr by remember { mutableStateOf("10999") }
    var featuresCsv by remember { mutableStateOf("Auto SL/TP, News Guard, Lifetime License") }
    var fileLink by remember { mutableStateOf("") }
    var instructions by remember { mutableStateOf("") }
    var coverKey by remember { mutableStateOf(StoreProduct.PRESET_ALGO_BOT) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val coverPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val encoded = ImageEncodingUtils.uriToCompressedBase64(context, uri)
                if (encoded != null) coverKey = encoded
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Publish Algo Bot / Software", style = MaterialTheme.typography.titleLarge, color = TextPrimary)

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Product Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(StoreProduct.CATEGORY_ALGO_BOT, StoreProduct.CATEGORY_SOFTWARE, StoreProduct.CATEGORY_INDICATOR).forEach { cat ->
                            FilterChip(
                                selected = category == cat,
                                onClick = { category = cat },
                                label = { Text(cat, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = priceUsdStr,
                            onValueChange = { priceUsdStr = it },
                            label = { Text("Price USD ($)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = priceInrStr,
                            onValueChange = { priceInrStr = it },
                            label = { Text("Price INR (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = version,
                            onValueChange = { version = it },
                            label = { Text("Version") },
                            singleLine = true,
                            modifier = Modifier.weight(0.8f)
                        )
                    }

                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("Description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )

                    OutlinedTextField(
                        value = featuresCsv,
                        onValueChange = { featuresCsv = it },
                        label = { Text("Features (comma-separated)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = fileLink,
                        onValueChange = { fileLink = it },
                        label = { Text("Hidden File_Link (revealed only after approval)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = instructions,
                        onValueChange = { instructions = it },
                        label = { Text("Install / License Instructions") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = {
                                coverPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Filled.Image, contentDescription = null)
                            Spacer(modifier = Modifier.size(6.dp))
                            Text("Custom Cover")
                        }
                        OutlinedButton(
                            onClick = { coverKey = StoreProduct.PRESET_SMC_SUITE },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Preset Cover")
                        }
                    }

                    if (errorMsg != null) {
                        Text(errorMsg!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
                    }

                    Button(
                        onClick = {
                            val usd = priceUsdStr.toDoubleOrNull()
                            val inr = priceInrStr.toDoubleOrNull()
                            if (name.trim().length < 2 || description.trim().length < 2 || usd == null || usd <= 0 || inr == null || inr <= 0 || fileLink.trim().length < 4) {
                                errorMsg = "Enter name, description, valid prices, and hidden File_Link."
                                return@Button
                            }
                            errorMsg = null
                            onSaveProduct(
                                StoreProduct(
                                    name = name.trim(),
                                    category = category,
                                    description = description.trim(),
                                    version = version.ifBlank { "1.0" },
                                    priceUsd = usd,
                                    priceInr = inr,
                                    coverImageKey = coverKey,
                                    features = featuresCsv.split(",").map { it.trim() }.filter { it.isNotBlank() }.take(8),
                                    isActive = true
                                ),
                                fileLink.trim(),
                                instructions.trim()
                            )
                            name = ""
                            description = ""
                            fileLink = ""
                        },
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Publish Product to Store", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminNewsAndSyncTab(
    isBusy: Boolean,
    onAddNews: (NewsEvent) -> Unit,
    onSeedStarter: () -> Unit
) {
    var date by remember { mutableStateOf("2026-11-19") }
    var time by remember { mutableStateOf("14:30 UTC") }
    var currency by remember { mutableStateOf("USD") }
    var eventTitle by remember { mutableStateOf("") }
    var impact by remember { mutableStateOf(NewsEvent.IMPACT_HIGH) }
    var forecast by remember { mutableStateOf("") }
    var previous by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            OutlinedButton(
                onClick = onSeedStarter,
                enabled = !isBusy,
                border = BorderStroke(1.dp, GoldAccent),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Sync Eagle FX Book Plans, Store & Macro Defaults", color = GoldAccent)
            }
        }

        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Add Custom High-Impact News Event", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = date, onValueChange = { date = it }, label = { Text("Date") }, singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = time, onValueChange = { time = it }, label = { Text("Time") }, singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = currency, onValueChange = { currency = it }, label = { Text("CCY") }, singleLine = true, modifier = Modifier.weight(0.7f))
                    }
                    OutlinedTextField(
                        value = eventTitle,
                        onValueChange = { eventTitle = it },
                        label = { Text("Event Headline") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(NewsEvent.IMPACT_HIGH, NewsEvent.IMPACT_MEDIUM, NewsEvent.IMPACT_LOW).forEach { imp ->
                            FilterChip(selected = impact == imp, onClick = { impact = imp }, label = { Text(imp) })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = forecast, onValueChange = { forecast = it }, label = { Text("Forecast") }, singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = previous, onValueChange = { previous = it }, label = { Text("Previous") }, singleLine = true, modifier = Modifier.weight(1f))
                    }
                    Button(
                        onClick = {
                            if (eventTitle.trim().length >= 2) {
                                onAddNews(
                                    NewsEvent(
                                        date = date,
                                        time = time,
                                        timestampMillis = System.currentTimeMillis() + 25L * 60L * 1000L,
                                        currency = currency,
                                        event = eventTitle.trim(),
                                        impact = impact,
                                        forecast = forecast,
                                        previous = previous
                                    )
                                )
                                eventTitle = ""
                            }
                        },
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Publish News Event", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
