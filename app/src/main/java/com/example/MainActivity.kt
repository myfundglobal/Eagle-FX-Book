package com.example

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Newspaper
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Newspaper
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.credentials.CredentialManager
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.auth.authStateFlow
import com.example.auth.signOutUser
import com.example.data.model.OrderRecord
import com.example.data.repository.TradingRepository
import com.example.notifications.NewsNotificationScheduler
import com.example.ui.auth.AuthScreen
import com.example.ui.auth.ProfileSetupOrEditDialog
import com.example.ui.components.FloatingGoldPillNavBar
import com.example.ui.components.FloatingNavItem
import com.example.ui.components.GlassCard
import com.example.ui.components.StatusPill
import com.example.ui.screens.AdminPanelScreen
import com.example.ui.screens.CommunityScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.JournalScreen
import com.example.ui.screens.NewsScreen
import com.example.ui.screens.StoreScreen
import com.example.ui.theme.CarbonSurface
import com.example.ui.theme.EagleFxBookTheme
import com.example.ui.theme.ElectricCyan
import com.example.ui.theme.GlassDark
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.EmailReceiptNotice
import com.example.ui.viewmodel.TradingViewModel
import com.example.ui.viewmodel.UiState
import com.example.util.ImageEncodingUtils
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import kotlinx.coroutines.launch

private enum class MainTab(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String
) {
    Home("Home", Icons.Filled.Home, Icons.Outlined.Home, "nav_home"),
    Journal("Journal", Icons.Filled.Book, Icons.Outlined.Book, "nav_journal"),
    Community("Community", Icons.Filled.Forum, Icons.Outlined.Forum, "nav_community"),
    Store("Store", Icons.Filled.Storefront, Icons.Outlined.Storefront, "nav_store"),
    News("News", Icons.Filled.Newspaper, Icons.Outlined.Newspaper, "nav_news")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EagleFxBookTheme {
                EagleFxBookRoot()
            }
        }
    }
}

@Composable
fun EagleFxBookRoot(auth: FirebaseAuth = Firebase.auth) {
    val currentUser by auth.authStateFlow().collectAsStateWithLifecycle(initialValue = auth.currentUser)
    var splashDone by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        val user = currentUser
        if (user == null) {
            AuthScreen(onAuthSuccess = {})
        } else {
            val uid = user.uid
            key(uid) {
                AuthenticatedTerminalApp(
                    currentUserId = uid,
                    userDisplayName = user.displayName ?: user.email?.substringBefore("@") ?: "Trader",
                    userEmail = user.email ?: "",
                    isEmailVerified = user.isEmailVerified
                )
            }
        }

        AnimatedVisibility(
            visible = !splashDone,
            exit = fadeOut(animationSpec = tween(durationMillis = 320))
        ) {
            EagleSplashScreen(onComplete = { splashDone = true })
        }
    }
}

@Composable
private fun EagleSplashScreen(onComplete: () -> Unit) {
    val progress = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1750, easing = LinearEasing)
        )
        onComplete()
    }

    val pct = (progress.value * 100).toInt().coerceIn(0, 100)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(108.dp)
                    .shadow(
                        elevation = 28.dp,
                        shape = RoundedCornerShape(26.dp),
                        spotColor = GoldAccent.copy(alpha = 0.45f)
                    )
                    .clip(RoundedCornerShape(26.dp))
                    .border(1.dp, GoldAccent.copy(alpha = 0.45f), RoundedCornerShape(26.dp))
            ) {
                Image(
                    painter = painterResource(id = R.drawable.app_icon_emblem_1794684148106),
                    contentDescription = "Eagle FX Book",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Text(
                text = "EAGLE FX BOOK",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 2.4.sp,
                color = TextPrimary,
                textAlign = TextAlign.Center
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth(0.78f)
                    .padding(top = 6.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                LinearProgressIndicator(
                    progress = { progress.value },
                    color = GoldAccent,
                    trackColor = SlateElevated,
                    strokeCap = StrokeCap.Round,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(5.dp)
                        .clip(RoundedCornerShape(999.dp))
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Initializing terminal...",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                    Text(
                        text = "$pct%",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = GoldAccent
                    )
                }
            }

            Text(
                text = "Trade. Journal. Improve.",
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted,
                letterSpacing = 0.8.sp
            )
        }
    }
}

@Composable
private fun AuthenticatedTerminalApp(
    currentUserId: String,
    userDisplayName: String,
    userEmail: String,
    isEmailVerified: Boolean
) {
    val viewModel: TradingViewModel = viewModel(
        key = currentUserId,
        factory = viewModelFactory {
            initializer {
                val app = checkNotNull(this[APPLICATION_KEY])
                TradingViewModel(
                    repository = TradingRepository(app),
                    currentUserId = currentUserId,
                    userDisplayName = userDisplayName,
                    userEmail = userEmail,
                    isEmailVerified = isEmailVerified
                )
            }
        }
    )

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }

    val userProfileState by viewModel.userProfileState.collectAsStateWithLifecycle()
    val isAdmin by viewModel.isAdmin.collectAsStateWithLifecycle()
    val tradesState by viewModel.tradesState.collectAsStateWithLifecycle()
    val communityPostsState by viewModel.communityPostsState.collectAsStateWithLifecycle()
    val likedPostIds by viewModel.likedPostIds.collectAsStateWithLifecycle()
    val newsState by viewModel.newsState.collectAsStateWithLifecycle()
    val isRefreshingCalendar by viewModel.isRefreshingCalendar.collectAsStateWithLifecycle()
    val liveCalendarConnected by viewModel.liveCalendarConnected.collectAsStateWithLifecycle()
    val subscriptionPlansState by viewModel.subscriptionPlansState.collectAsStateWithLifecycle()
    val productsState by viewModel.productsState.collectAsStateWithLifecycle()
    val unlockedProductsState by viewModel.unlockedProductsState.collectAsStateWithLifecycle()
    val userOrdersState by viewModel.userOrdersState.collectAsStateWithLifecycle()
    val adminSettings by viewModel.adminSettingsState.collectAsStateWithLifecycle()
    val adminAllOrders by viewModel.adminAllOrdersState.collectAsStateWithLifecycle()
    val adminAllUsers by viewModel.adminAllUsersState.collectAsStateWithLifecycle()
    val metrics by viewModel.dashboardMetrics.collectAsStateWithLifecycle()
    val nextHighImpactNews by viewModel.nextHighImpactNews.collectAsStateWithLifecycle()
    val isBusy by viewModel.isBusy.collectAsStateWithLifecycle()
    val actionMessage by viewModel.actionMessage.collectAsStateWithLifecycle()
    val newCommunityPostAlert by viewModel.newCommunityPostAlert.collectAsStateWithLifecycle()
    val latestEmailReceipt by viewModel.latestEmailReceipt.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }
    var currentTab by remember { mutableStateOf(MainTab.Home) }
    var showAdminPanel by remember { mutableStateOf(false) }
    var showLogTradeSheet by remember { mutableStateOf(false) }
    var showProfileDialog by remember { mutableStateOf(false) }
    var hasNotificationPermission by remember {
        mutableStateOf(NewsNotificationScheduler.hasNotificationPermission(context))
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasNotificationPermission = granted || NewsNotificationScheduler.hasNotificationPermission(context)
        if (granted) {
            val events = (newsState as? UiState.Success)?.data.orEmpty()
            val count = NewsNotificationScheduler.scheduleHighImpactAlerts(context, events)
            scope.launch {
                snackbarHostState.showSnackbar("High-Impact news alerts enabled ($count upcoming alarms scheduled)")
            }
        }
    }

    LaunchedEffect(Unit) {
        NewsNotificationScheduler.ensureChannels(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Automatically schedule 20-minute pre-event High-Impact alarms whenever news updates
    LaunchedEffect(newsState, hasNotificationPermission) {
        val events = (newsState as? UiState.Success)?.data.orEmpty()
        if (events.isNotEmpty()) {
            NewsNotificationScheduler.scheduleHighImpactAlerts(context, events)
        }
    }

    // Instant notification whenever Admin publishes a new Community setup
    LaunchedEffect(newCommunityPostAlert) {
        val post = newCommunityPostAlert ?: return@LaunchedEffect
        NewsNotificationScheduler.showNewCommunityPostNotification(context, post)
        viewModel.clearCommunityPostAlert()
    }

    LaunchedEffect(actionMessage) {
        val msg = actionMessage
        if (msg != null) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearActionMessage()
        }
    }

    val profile = (userProfileState as? UiState.Success)?.data
    val needsOnboarding = profile != null && !profile.profileCompleted && !isAdmin

    // Enforce Admin Block status immediately
    if (profile?.isBlocked == true && !isAdmin) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(ObsidianBlack)
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            GlassCard(
                accentBorderColor = LossCrimson.copy(alpha = 0.6f),
                elevated = true
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Account Blocked", style = MaterialTheme.typography.headlineSmall, color = LossCrimson)
                    Text(
                        "Your Eagle FX Book access has been blocked by the administrator.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    Button(
                        onClick = { signOutUser(credentialManager, scope) },
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary)
                    ) {
                        Text("Sign Out", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        return
    }

    // Strict Admin Panel Guard: ONLY accessible to Myfundglobal@gmail.com
    if (showAdminPanel && isAdmin) {
        val plans = (subscriptionPlansState as? UiState.Success)?.data.orEmpty()
        Scaffold(
            containerColor = ObsidianBlack,
            snackbarHost = { SnackbarHost(snackbarHostState) },
            contentWindowInsets = WindowInsets.navigationBars
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                AdminPanelScreen(
                    allOrders = adminAllOrders,
                    allUsers = adminAllUsers,
                    plans = plans,
                    adminSettings = adminSettings,
                    isBusy = isBusy,
                    onBack = { showAdminPanel = false },
                    onApproveOrder = viewModel::approveOrder,
                    onRejectOrder = viewModel::rejectOrder,
                    onSavePaymentSettings = viewModel::updatePaymentSettings,
                    onSavePlan = { plan, onDone -> viewModel.saveSubscriptionPlan(plan, onDone) },
                    onDeletePlan = viewModel::deleteSubscriptionPlan,
                    onSaveProduct = { product, link, instr -> viewModel.saveProduct(product, link, instr) },
                    onAddNewsEvent = { event -> viewModel.addNewsEvent(event) },
                    onToggleUserBlocked = viewModel::toggleUserBlocked,
                    onSeedStarterData = viewModel::seedStarterData
                )
            }
        }
        return
    }

    val pendingAdminOrders = remember(adminAllOrders) {
        adminAllOrders.count { it.status == OrderRecord.STATUS_PENDING }
    }

    val floatingNavItems = remember {
        MainTab.entries.map { tab ->
            FloatingNavItem(
                id = tab.name,
                label = tab.label,
                selectedIcon = tab.selectedIcon,
                unselectedIcon = tab.unselectedIcon,
                testTag = tab.testTag
            )
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBlack)
    ) {
        val useRail = maxWidth >= 600.dp

        Box(modifier = Modifier.fillMaxSize()) {
            Scaffold(
                containerColor = ObsidianBlack,
                snackbarHost = {
                    SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier.padding(bottom = if (useRail) 8.dp else 80.dp)
                    )
                },
                topBar = {
                    TerminalTopBar(
                        userName = profile?.name?.ifBlank { userDisplayName } ?: userDisplayName,
                        dpBase64 = profile?.profilePictureBase64.orEmpty(),
                        activePlan = profile?.activePlanName.orEmpty(),
                        hasActiveSub = profile?.hasActiveSubscription == true,
                        isAdmin = isAdmin,
                        pendingOrdersCount = pendingAdminOrders,
                        onOpenProfile = { showProfileDialog = true },
                        onOpenAdmin = { showAdminPanel = true },
                        onSignOut = { signOutUser(credentialManager, scope) }
                    )
                }
            ) { innerPadding ->
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    if (useRail) {
                        NavigationRail(
                            containerColor = CarbonSurface,
                            modifier = Modifier.fillMaxHeight()
                        ) {
                            Spacer(modifier = Modifier.size(12.dp))
                            MainTab.entries.forEach { tab ->
                                val selected = currentTab == tab
                                NavigationRailItem(
                                    selected = selected,
                                    onClick = { currentTab = tab },
                                    icon = {
                                        Icon(
                                            imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                            contentDescription = tab.label
                                        )
                                    },
                                    label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                                    colors = NavigationRailItemDefaults.colors(
                                        selectedIconColor = TextPrimary,
                                        selectedTextColor = GoldAccent,
                                        indicatorColor = GoldAccent,
                                        unselectedIconColor = TextMuted,
                                        unselectedTextColor = TextMuted
                                    ),
                                    modifier = Modifier.testTag(tab.testTag)
                                )
                            }
                        }
                    }

                    Box(modifier = Modifier.weight(1f)) {
                        when (currentTab) {
                            MainTab.Home -> DashboardScreen(
                                metrics = metrics,
                                tradesState = tradesState,
                                nextHighImpactNews = nextHighImpactNews,
                                onNavigateToJournal = { currentTab = MainTab.Journal },
                                onNavigateToNews = { currentTab = MainTab.News },
                                onOpenLogTrade = {
                                    currentTab = MainTab.Journal
                                    showLogTradeSheet = true
                                }
                            )

                            MainTab.Journal -> JournalScreen(
                                tradesState = tradesState,
                                isBusy = isBusy,
                                showLogSheetExternal = showLogTradeSheet,
                                onDismissExternalSheet = { showLogTradeSheet = false },
                                onOpenLogSheet = { showLogTradeSheet = true },
                                onLogTrade = { entry, onDone -> viewModel.logTrade(entry, onDone) },
                                onDeleteTrade = viewModel::deleteTrade
                            )

                            MainTab.Community -> CommunityScreen(
                                postsState = communityPostsState,
                                likedPostIds = likedPostIds,
                                isAdmin = isAdmin,
                                isBusy = isBusy,
                                onToggleLike = viewModel::toggleLike,
                                onCreatePost = { title, msg, pair, bias, chartKey, dateLabel, onDone ->
                                    viewModel.createCommunityPost(title, msg, pair, bias, chartKey, dateLabel, onDone)
                                },
                                onDeletePost = viewModel::deleteCommunityPost
                            )

                            MainTab.Store -> StoreScreen(
                                subscriptionPlansState = subscriptionPlansState,
                                productsState = productsState,
                                unlockedProductsState = unlockedProductsState,
                                userOrdersState = userOrdersState,
                                userProfile = profile,
                                adminSettings = adminSettings,
                                isBusy = isBusy,
                                onSubmitOrder = { itemId, itemName, itemType, days, usd, inr, method, txn, shot, onDone ->
                                    viewModel.submitOrder(itemId, itemName, itemType, days, usd, inr, method, txn, shot, onDone)
                                },
                                onNotify = { msg ->
                                    scope.launch { snackbarHostState.showSnackbar(msg) }
                                }
                            )

                            MainTab.News -> NewsScreen(
                                newsState = newsState,
                                liveCalendarConnected = liveCalendarConnected,
                                isRefreshingCalendar = isRefreshingCalendar,
                                hasNotificationPermission = hasNotificationPermission,
                                onRefreshCalendar = { viewModel.refreshLiveCalendar(silent = false) },
                                onRequestNotificationAlerts = {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission) {
                                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                    } else {
                                        val events = (newsState as? UiState.Success)?.data.orEmpty()
                                        val count = NewsNotificationScheduler.scheduleHighImpactAlerts(context, events)
                                        scope.launch {
                                            snackbarHostState.showSnackbar("Scheduled $count High-Impact 20-minute pre-news alerts")
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }

            if (!useRail) {
                FloatingGoldPillNavBar(
                    items = floatingNavItems,
                    selectedId = currentTab.name,
                    onSelect = { selectedId ->
                        currentTab = MainTab.valueOf(selectedId)
                    },
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }
        }
    }

    if (needsOnboarding || showProfileDialog) {
        ProfileSetupOrEditDialog(
            profile = profile,
            userEmail = userEmail,
            isOnboarding = needsOnboarding,
            isBusy = isBusy,
            onSave = { first, last, code, phone, dp ->
                viewModel.updateProfileDetails(first, last, code, phone, dp) {
                    showProfileDialog = false
                }
            },
            onDismiss = { showProfileDialog = false },
            onSignOut = { signOutUser(credentialManager, scope) }
        )
    }

    if (latestEmailReceipt != null) {
        EmailConfirmationReceiptDialog(
            receipt = latestEmailReceipt!!,
            onDismiss = { viewModel.clearEmailReceipt() }
        )
    }
}

@Composable
private fun TerminalTopBar(
    userName: String,
    dpBase64: String,
    activePlan: String,
    hasActiveSub: Boolean,
    isAdmin: Boolean,
    pendingOrdersCount: Int,
    onOpenProfile: () -> Unit,
    onOpenAdmin: () -> Unit,
    onSignOut: () -> Unit
) {
    val avatarBitmap = remember(dpBase64) { ImageEncodingUtils.decodeBase64ToImageBitmap(dpBase64) }
    val initial = userName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "E"

    Surface(
        color = GlassDark,
        border = BorderStroke(1.dp, HairlineBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .clickable(onClick = onOpenProfile)
                    .testTag("open_profile_button")
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(SlateElevated)
                        .border(1.5.dp, GoldAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (avatarBitmap != null) {
                        Image(
                            bitmap = avatarBitmap,
                            contentDescription = "User profile picture",
                            modifier = Modifier.size(38.dp),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            text = initial,
                            style = MaterialTheme.typography.titleSmall,
                            color = GoldAccent,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Column {
                    Text(
                        text = "EAGLE FX BOOK",
                        style = MaterialTheme.typography.titleMedium,
                        color = GoldAccent,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = buildString {
                            append(userName)
                            append(" • ")
                            append(if (isAdmin) "ADMIN" else if (hasActiveSub) activePlan else "TRADER")
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isAdmin) NeonProfit else TextSecondary
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (isAdmin) {
                    Surface(
                        color = GoldAccent,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .clickable(onClick = onOpenAdmin)
                            .testTag("open_admin_panel_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            BadgedBox(
                                badge = {
                                    if (pendingOrdersCount > 0) {
                                        Badge(containerColor = LossCrimson, contentColor = TextPrimary) {
                                            Text("$pendingOrdersCount")
                                        }
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.AdminPanelSettings,
                                    contentDescription = "Admin Panel",
                                    tint = TextPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Text(
                                text = "Admin",
                                style = MaterialTheme.typography.labelLarge,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                IconButton(
                    onClick = onSignOut,
                    modifier = Modifier.testTag("sign_out_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Logout,
                        contentDescription = "Sign out",
                        tint = TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun EmailConfirmationReceiptDialog(
    receipt: EmailReceiptNotice,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    Dialog(onDismissRequest = onDismiss) {
        GlassCard(
            accentBorderColor = GoldAccent.copy(alpha = 0.55f),
            elevated = true
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.Email, contentDescription = null, tint = GoldAccent)
                    Column {
                        Text("Eagle FX Book Email Notice", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        Text(receipt.senderDisplay, style = MaterialTheme.typography.labelSmall, color = GoldAccent)
                    }
                }

                StatusPill(text = "To: ${receipt.recipientEmail}", color = ElectricCyan)

                Text(
                    text = receipt.subject,
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary
                )

                Surface(
                    color = SlateElevated,
                    border = BorderStroke(1.dp, HairlineBorder),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = receipt.body,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        modifier = Modifier.padding(12.dp)
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        onClick = {
                            val mailIntent = Intent(Intent.ACTION_SENDTO).apply {
                                data = Uri.parse("mailto:")
                                putExtra(Intent.EXTRA_EMAIL, arrayOf(receipt.recipientEmail))
                                putExtra(Intent.EXTRA_SUBJECT, receipt.subject)
                                putExtra(Intent.EXTRA_TEXT, receipt.body)
                            }
                            runCatching { context.startActivity(mailIntent) }
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Open Email")
                    }
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Done", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
