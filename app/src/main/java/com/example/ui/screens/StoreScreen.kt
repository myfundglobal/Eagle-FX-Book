package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults.SecondaryIndicator
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AdminSettings
import com.example.data.model.OrderRecord
import com.example.data.model.StoreProduct
import com.example.data.model.SubscriptionPlan
import com.example.data.model.UnlockedProduct
import com.example.data.model.UserProfile
import com.example.ui.components.DeterministicQrCodeCanvas
import com.example.ui.components.GlassCard
import com.example.ui.components.PresetOrBase64Image
import com.example.ui.components.StatusPill
import com.example.ui.components.TerminalSectionHeader
import com.example.ui.theme.AmberGold
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

private data class CheckoutItem(
    val itemId: String,
    val itemName: String,
    val itemType: String,
    val durationDays: Int,
    val priceUsd: Double,
    val priceInr: Double
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreScreen(
    subscriptionPlansState: UiState<List<SubscriptionPlan>>,
    productsState: UiState<List<StoreProduct>>,
    unlockedProductsState: UiState<List<UnlockedProduct>>,
    userOrdersState: UiState<List<OrderRecord>>,
    userProfile: UserProfile?,
    adminSettings: AdminSettings?,
    isBusy: Boolean,
    onSubmitOrder: (
        itemId: String,
        itemName: String,
        itemType: String,
        durationDays: Int,
        priceUsd: Double,
        priceInr: Double,
        paymentMethod: String,
        transactionId: String,
        screenshotBase64: String,
        onDone: () -> Unit
    ) -> Unit,
    onNotify: (String) -> Unit
) {
    val plans = (subscriptionPlansState as? UiState.Success)?.data.orEmpty().filter { it.isActive }
    val products = (productsState as? UiState.Success)?.data.orEmpty().filter { it.isActive }
    val unlockedList = (unlockedProductsState as? UiState.Success)?.data.orEmpty()
    val orders = (userOrdersState as? UiState.Success)?.data.orEmpty()

    val unlockedByProductId = remember(unlockedList) { unlockedList.associateBy { it.productId } }
    val pendingByItemId = remember(orders) {
        orders.filter { it.status == OrderRecord.STATUS_PENDING }.associateBy { it.productId }
    }

    var selectedTab by remember { mutableIntStateOf(0) }
    var checkoutItem by remember { mutableStateOf<CheckoutItem?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
    ) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = CarbonSurface,
            contentColor = GoldAccent,
            indicator = { tabPositions ->
                if (selectedTab < tabPositions.size) {
                    SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = GoldAccent
                    )
                }
            }
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Plans & Store", style = MaterialTheme.typography.titleSmall) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("My Orders (${orders.size})", style = MaterialTheme.typography.titleSmall) }
            )
        }

        if (selectedTab == 0) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 104.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Eagle FX Book Membership Plans
                item {
                    TerminalSectionHeader(
                        title = "Eagle FX Book Plans",
                        subtitle = if (userProfile?.hasActiveSubscription == true) {
                            "Active Plan: ${userProfile.activePlanName}"
                        } else {
                            "Unlock Pro Desk Insights, Alerts & Cloud Sync"
                        }
                    )
                }

                if (plans.isNotEmpty()) {
                    items(plans, key = { "plan_${it.id}" }) { plan ->
                        SubscriptionPlanCard(
                            plan = plan,
                            isCurrentActive = userProfile?.hasActiveSubscription == true &&
                                userProfile.activePlanName.equals(plan.name, ignoreCase = true),
                            pendingOrder = pendingByItemId[plan.id],
                            onSubscribeClick = {
                                checkoutItem = CheckoutItem(
                                    itemId = plan.id,
                                    itemName = plan.name,
                                    itemType = OrderRecord.TYPE_PLAN,
                                    durationDays = plan.durationDays,
                                    priceUsd = plan.priceUsd,
                                    priceInr = plan.priceInr
                                )
                            }
                        )
                    }
                }

                // 2. Algo Bots & Software Catalog
                item {
                    TerminalSectionHeader(
                        title = "Algo Bots & Trading Software",
                        subtitle = "Download links unlock automatically once Admin verifies payment"
                    )
                }

                if (products.isEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Filled.ShoppingBag, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(32.dp))
                                Text("Software catalog is updating", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                                Text(
                                    "Admin can publish Algo Bots and Trading Software from the Admin Control Desk.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                } else {
                    items(products, key = { "prod_${it.id}" }) { product ->
                        ProductCatalogCard(
                            product = product,
                            unlocked = unlockedByProductId[product.id],
                            pendingOrder = pendingByItemId[product.id],
                            onBuyClick = {
                                checkoutItem = CheckoutItem(
                                    itemId = product.id,
                                    itemName = product.name,
                                    itemType = OrderRecord.TYPE_PRODUCT,
                                    durationDays = 0,
                                    priceUsd = product.priceUsd,
                                    priceInr = product.priceInr
                                )
                            },
                            onNotify = onNotify
                        )
                    }
                }
            }
        } else {
            MyOrdersAndDownloadsList(
                orders = orders,
                unlockedByProductId = unlockedByProductId,
                onNotify = onNotify
            )
        }
    }

    if (checkoutItem != null) {
        val currentCheckout = checkoutItem!!
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { checkoutItem = null },
            sheetState = sheetState,
            containerColor = GlassModal,
            contentColor = TextPrimary
        ) {
            ExternalPaymentCheckoutSheet(
                item = currentCheckout,
                adminSettings = adminSettings,
                isBusy = isBusy,
                onSubmit = { method, txnId, screenshot ->
                    onSubmitOrder(
                        currentCheckout.itemId,
                        currentCheckout.itemName,
                        currentCheckout.itemType,
                        currentCheckout.durationDays,
                        currentCheckout.priceUsd,
                        currentCheckout.priceInr,
                        method,
                        txnId,
                        screenshot
                    ) {
                        checkoutItem = null
                        selectedTab = 1
                    }
                },
                onCancel = { checkoutItem = null },
                onNotify = onNotify
            )
        }
    }
}

@Composable
private fun SubscriptionPlanCard(
    plan: SubscriptionPlan,
    isCurrentActive: Boolean,
    pendingOrder: OrderRecord?,
    onSubscribeClick: () -> Unit
) {
    val highlightColor = if (isCurrentActive) NeonProfit else GoldAccent

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        accentBorderColor = highlightColor.copy(alpha = if (plan.badgeText.isNotBlank() || isCurrentActive) 0.55f else 0.22f),
        elevated = true
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.WorkspacePremium,
                            contentDescription = null,
                            tint = highlightColor,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(plan.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusPill(text = plan.durationLabel, color = ElectricCyan)
                        if (plan.badgeText.isNotBlank()) {
                            StatusPill(text = plan.badgeText.uppercase(), color = GoldAccent)
                        }
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$${plan.priceUsd.toInt()}",
                        style = TabularNumberStyle.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold),
                        color = GoldAccent
                    )
                    Text(
                        text = "₹${plan.priceInr.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }

            if (plan.features.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    plan.features.forEach { feat ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = NeonProfit,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(text = feat, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                        }
                    }
                }
            }

            when {
                isCurrentActive -> {
                    Surface(
                        color = NeonProfit.copy(alpha = 0.14f),
                        border = BorderStroke(1.dp, NeonProfit.copy(alpha = 0.45f)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = "ACTIVE MEMBERSHIP ON YOUR ACCOUNT",
                            style = MaterialTheme.typography.labelMedium,
                            color = NeonProfit,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        )
                    }
                }

                pendingOrder != null -> {
                    Surface(
                        color = GoldAccent.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, GoldAccent.copy(alpha = 0.45f)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Filled.HourglassTop, contentDescription = null, tint = GoldAccent)
                            Text(
                                text = "Verification Pending • Txn: ${pendingOrder.transactionId}",
                                style = MaterialTheme.typography.bodySmall,
                                color = GoldAccent
                            )
                        }
                    }
                }

                else -> {
                    Button(
                        onClick = onSubscribeClick,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("buy_plan_button_${plan.id}")
                    ) {
                        Text("Subscribe • ${plan.durationLabel}", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductCatalogCard(
    product: StoreProduct,
    unlocked: UnlockedProduct?,
    pendingOrder: OrderRecord?,
    onBuyClick: () -> Unit,
    onNotify: (String) -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        accentBorderColor = if (unlocked != null) NeonProfit.copy(alpha = 0.55f) else null
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(170.dp)
            ) {
                PresetOrBase64Image(
                    imageKey = product.coverImageKey.ifBlank { StoreProduct.PRESET_ALGO_BOT },
                    contentDescription = product.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatusPill(text = product.category, color = ElectricCyan)
                    StatusPill(text = "v${product.version}", color = TextPrimary)
                }
            }

            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "$${product.priceUsd.toInt()}",
                            style = TabularNumberStyle.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold),
                            color = NeonProfit
                        )
                        Text(
                            text = "₹${product.priceInr.toInt()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }
                }

                Text(
                    text = product.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )

                if (product.features.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        product.features.forEach { feat ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.CheckCircle,
                                    contentDescription = null,
                                    tint = NeonProfit,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(text = feat, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                            }
                        }
                    }
                }

                when {
                    unlocked != null -> {
                        Surface(
                            color = NeonProfit.copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, NeonProfit.copy(alpha = 0.45f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Filled.Download, contentDescription = null, tint = NeonProfit)
                                    Text(
                                        text = "UNLOCKED • LICENSE ${unlocked.licenseKey}",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = NeonProfit
                                    )
                                }
                                Text(
                                    text = unlocked.fileLink,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = ElectricCyan
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = {
                                            runCatching {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(unlocked.fileLink)))
                                            }.onFailure {
                                                clipboard.setText(AnnotatedString(unlocked.fileLink))
                                                onNotify("Download link copied to clipboard")
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = NeonProfit, contentColor = ObsidianBlack),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Open Download", fontWeight = FontWeight.Bold)
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            clipboard.setText(AnnotatedString(unlocked.fileLink))
                                            onNotify("Link copied")
                                        }
                                    ) {
                                        Icon(Icons.Filled.ContentCopy, contentDescription = "Copy link", modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }

                    pendingOrder != null -> {
                        Surface(
                            color = AmberGold.copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, AmberGold.copy(alpha = 0.45f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Filled.HourglassTop, contentDescription = null, tint = AmberGold)
                                Column {
                                    Text("Payment Verification Pending", style = MaterialTheme.typography.titleSmall, color = AmberGold)
                                    Text("Txn: ${pendingOrder.transactionId}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                            }
                        }
                    }

                    else -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Filled.Lock, contentDescription = null, tint = TextMuted, modifier = Modifier.size(15.dp))
                                Text("File link hidden until approved", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                            }
                            Button(
                                onClick = onBuyClick,
                                colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.testTag("buy_product_button_${product.id}")
                            ) {
                                Text("Buy Now", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExternalPaymentCheckoutSheet(
    item: CheckoutItem,
    adminSettings: AdminSettings?,
    isBusy: Boolean,
    onSubmit: (method: String, txnId: String, screenshotBase64: String) -> Unit,
    onCancel: () -> Unit,
    onNotify: (String) -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var method by remember { mutableStateOf(OrderRecord.METHOD_UPI) }
    var transactionId by remember { mutableStateOf("") }
    var screenshotBase64 by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val encoded = ImageEncodingUtils.uriToCompressedBase64(context, uri)
                if (encoded != null) {
                    screenshotBase64 = encoded
                } else {
                    errorMsg = "Could not load payment screenshot"
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
        Text("Eagle FX Book Checkout", style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
        Text(
            text = "${item.itemName} (${item.itemType}) • $${item.priceUsd.toInt()} / ₹${item.priceInr.toInt()}",
            style = MaterialTheme.typography.titleSmall,
            color = GoldAccent
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            listOf(OrderRecord.METHOD_UPI, OrderRecord.METHOD_CRYPTO).forEach { opt ->
                val selected = method == opt
                Surface(
                    onClick = { method = opt },
                    color = if (selected) GoldAccent.copy(alpha = 0.2f) else SlateElevated,
                    border = BorderStroke(1.dp, if (selected) GoldAccent else HairlineBorder),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(modifier = Modifier.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (opt == OrderRecord.METHOD_UPI) "UPI Transfer" else "Crypto (${adminSettings?.cryptoNetwork ?: "TRC20"})",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (selected) GoldAccent else TextSecondary
                        )
                    }
                }
            }
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (adminSettings == null) {
                    Text(
                        text = "Live payment settings have not been configured by Admin yet. Please check back shortly.",
                        style = MaterialTheme.typography.bodySmall,
                        color = GoldAccent
                    )
                } else if (method == OrderRecord.METHOD_UPI) {
                    Text("Scan UPI QR or Pay via UPI ID", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    val customQr = remember(adminSettings.currentUpiQrImageBase64) {
                        ImageEncodingUtils.decodeBase64ToImageBitmap(adminSettings.currentUpiQrImageBase64)
                    }
                    if (customQr != null) {
                        Image(
                            bitmap = customQr,
                            contentDescription = "Live Admin UPI QR Code",
                            modifier = Modifier
                                .size(170.dp)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        DeterministicQrCodeCanvas(
                            payload = "upi://pay?pa=${adminSettings.currentUpiId}&am=${item.priceInr.toInt()}",
                            modifier = Modifier.size(170.dp)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("CURRENT UPI ID", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                            Text(adminSettings.currentUpiId, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                        }
                        IconButton(
                            onClick = {
                                clipboard.setText(AnnotatedString(adminSettings.currentUpiId))
                                onNotify("UPI ID copied")
                            }
                        ) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy UPI ID", tint = GoldAccent)
                        }
                    }
                } else {
                    StatusPill(text = adminSettings.cryptoNetwork, color = ElectricCyan)
                    DeterministicQrCodeCanvas(
                        payload = adminSettings.currentCryptoWalletAddress,
                        modifier = Modifier.size(160.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("WALLET ADDRESS", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                            Text(
                                text = adminSettings.currentCryptoWalletAddress,
                                style = MaterialTheme.typography.labelMedium,
                                color = TextPrimary
                            )
                        }
                        IconButton(
                            onClick = {
                                clipboard.setText(AnnotatedString(adminSettings.currentCryptoWalletAddress))
                                onNotify("Wallet address copied")
                            }
                        ) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy Wallet", tint = GoldAccent)
                        }
                    }
                }
            }
        }

        Text(
            text = "After completing payment, enter your Transaction ID / UTR / TxHash and upload the screenshot. Confirmation details from Eagle FX Book will appear immediately.",
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )

        OutlinedTextField(
            value = transactionId,
            onValueChange = { transactionId = it },
            label = { Text("Transaction ID / UTR / TxHash") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("checkout_txn_id_input")
        )

        OutlinedButton(
            onClick = {
                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.Image, contentDescription = null, tint = GoldAccent)
            Spacer(modifier = Modifier.size(8.dp))
            Text(
                text = if (screenshotBase64.isBlank()) "Upload Payment Screenshot" else "Payment Screenshot Ready (Tap to Replace)",
                color = GoldAccent
            )
        }

        if (errorMsg != null) {
            Text(errorMsg!!, style = MaterialTheme.typography.bodySmall, color = LossCrimson)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("Cancel") }
            Button(
                onClick = {
                    if (transactionId.trim().length < 4) {
                        errorMsg = "Please enter a valid Transaction ID (min 4 characters)."
                        return@Button
                    }
                    onSubmit(method, transactionId.trim(), screenshotBase64)
                },
                enabled = !isBusy && adminSettings != null,
                colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                modifier = Modifier
                    .weight(1.4f)
                    .testTag("submit_order_button")
            ) {
                Text("Submit Order", fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.height(18.dp))
    }
}

@Composable
private fun MyOrdersAndDownloadsList(
    orders: List<OrderRecord>,
    unlockedByProductId: Map<String, UnlockedProduct>,
    onNotify: (String) -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 104.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            TerminalSectionHeader(
                title = "Your Orders & Licenses",
                subtitle = "Strictly private to your account"
            )
        }

        if (orders.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "You haven't submitted any orders yet. Select a Plan or Algo Bot in the Store tab to purchase.",
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
                val unlocked = unlockedByProductId[order.productId]

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
                                Text(order.productName, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                                Text(order.itemType.uppercase(), style = MaterialTheme.typography.labelSmall, color = ElectricCyan)
                            }
                            StatusPill(text = order.status.uppercase(), color = statusColor)
                        }
                        Text(
                            text = "${order.paymentMethod} • ${order.amountLabel} • Txn: ${order.transactionId}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                        if (order.adminNote.isNotBlank()) {
                            Text(
                                text = "Desk Note: ${order.adminNote}",
                                style = MaterialTheme.typography.bodySmall,
                                color = statusColor
                            )
                        }
                        if (order.itemType == OrderRecord.TYPE_PRODUCT &&
                            order.status == OrderRecord.STATUS_APPROVED &&
                            unlocked != null
                        ) {
                            Button(
                                onClick = {
                                    runCatching {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(unlocked.fileLink)))
                                    }.onFailure {
                                        clipboard.setText(AnnotatedString(unlocked.fileLink))
                                        onNotify("Download URL copied to clipboard")
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = NeonProfit, contentColor = ObsidianBlack),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Filled.Download, contentDescription = null)
                                Spacer(modifier = Modifier.size(8.dp))
                                Text("Download (${unlocked.licenseKey})", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
