package com.example.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.AdminSettings
import com.example.data.model.CommunityPost
import com.example.data.model.NewsEvent
import com.example.data.model.OrderRecord
import com.example.data.model.StoreProduct
import com.example.data.model.SubscriptionPlan
import com.example.data.model.TradeEntry
import com.example.data.model.UnlockedProduct
import com.example.data.model.UserProfile
import com.example.data.network.LiveEconomicCalendarService
import com.example.data.repository.TradingRepository
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

data class DashboardMetrics(
    val totalPnl: Double = 0.0,
    val totalTrades: Int = 0,
    val winCount: Int = 0,
    val lossCount: Int = 0,
    val winRatePercent: Double = 0.0,
    val avgRiskReward: Double = 0.0,
    val profitFactor: Double = 0.0,
    val equityCurve: List<Double> = emptyList()
)

data class EmailReceiptNotice(
    val senderDisplay: String = "Eagle FX Book <support@eaglefxbook.app>",
    val recipientEmail: String,
    val subject: String,
    val body: String
)

@OptIn(ExperimentalCoroutinesApi::class)
class TradingViewModel(
    private val repository: TradingRepository,
    val currentUserId: String,
    val userDisplayName: String,
    val userEmail: String,
    val isEmailVerified: Boolean
) : ViewModel() {

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    private val _isBusy = MutableStateFlow(false)
    val isBusy: StateFlow<Boolean> = _isBusy.asStateFlow()

    private val _likedPostIds = MutableStateFlow<Set<String>>(emptySet())
    val likedPostIds: StateFlow<Set<String>> = _likedPostIds.asStateFlow()

    private val _liveCalendarEvents = MutableStateFlow<List<NewsEvent>>(emptyList())
    private val _isRefreshingCalendar = MutableStateFlow(false)
    val isRefreshingCalendar: StateFlow<Boolean> = _isRefreshingCalendar.asStateFlow()

    private val _liveCalendarConnected = MutableStateFlow(false)
    val liveCalendarConnected: StateFlow<Boolean> = _liveCalendarConnected.asStateFlow()

    private val _newCommunityPostAlert = MutableStateFlow<CommunityPost?>(null)
    val newCommunityPostAlert: StateFlow<CommunityPost?> = _newCommunityPostAlert.asStateFlow()

    private val _latestEmailReceipt = MutableStateFlow<EmailReceiptNotice?>(null)
    val latestEmailReceipt: StateFlow<EmailReceiptNotice?> = _latestEmailReceipt.asStateFlow()

    private var hasAttemptedAutoSeed = false
    private var hasInitializedCommunitySnapshot = false
    private var knownPostIds = emptySet<String>()

    val userProfileState: StateFlow<UiState<UserProfile?>> = repository.observeUserProfile(currentUserId)
        .toUiState("Failed to load profile")

    // Strictly locked to exact verified email Myfundglobal@gmail.com
    val isAdmin: StateFlow<Boolean> = MutableStateFlow(
        isEmailVerified && userEmail.equals(UserProfile.BOOTSTRAP_ADMIN_EMAIL, ignoreCase = true)
    ).asStateFlow()

    val tradesState: StateFlow<UiState<List<TradeEntry>>> = repository.observeTrades(currentUserId)
        .toUiState("Failed to load trade journal")

    val communityPostsState: StateFlow<UiState<List<CommunityPost>>> = repository.observeCommunityPosts()
        .toUiState("Failed to load community feed")

    private val firestoreNewsState: StateFlow<UiState<List<NewsEvent>>> = repository.observeNewsCalendar()
        .toUiState("Failed to load economic calendar")

    val newsState: StateFlow<UiState<List<NewsEvent>>> = combine(
        firestoreNewsState,
        _liveCalendarEvents
    ) { fsState, liveEvents ->
        when (fsState) {
            is UiState.Loading -> if (liveEvents.isNotEmpty()) UiState.Success(liveEvents) else UiState.Loading
            is UiState.Error -> if (liveEvents.isNotEmpty()) UiState.Success(liveEvents) else fsState
            is UiState.Success -> {
                val merged = mergeNewsFeeds(fsState.data, liveEvents)
                UiState.Success(merged)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val subscriptionPlansState: StateFlow<UiState<List<SubscriptionPlan>>> = repository.observeSubscriptionPlans()
        .toUiState("Failed to load subscription plans")

    val productsState: StateFlow<UiState<List<StoreProduct>>> = repository.observeProducts()
        .toUiState("Failed to load store catalog")

    val unlockedProductsState: StateFlow<UiState<List<UnlockedProduct>>> =
        repository.observeUnlockedProducts(currentUserId)
            .toUiState("Failed to load unlocked downloads")

    val userOrdersState: StateFlow<UiState<List<OrderRecord>>> =
        repository.observeUserOrders(currentUserId)
            .toUiState("Failed to load your orders")

    val adminSettingsState: StateFlow<AdminSettings?> = repository.observeAdminSettings()
        .catch { error ->
            unwrapAndLog("admin_settings", error)
            emit(null)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    val adminAllOrdersState: StateFlow<List<OrderRecord>> = isAdmin
        .flatMapLatest { admin ->
            if (admin) repository.observeAllOrdersForAdmin().catch { emit(emptyList()) }
            else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), emptyList())

    val adminAllUsersState: StateFlow<List<UserProfile>> = isAdmin
        .flatMapLatest { admin ->
            if (admin) repository.observeAllUsersForAdmin().catch { emit(emptyList()) }
            else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), emptyList())

    val dashboardMetrics: StateFlow<DashboardMetrics> = tradesState
        .map { state ->
            val trades = (state as? UiState.Success)?.data.orEmpty()
            computeMetrics(trades)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), DashboardMetrics())

    val nextHighImpactNews: StateFlow<NewsEvent?> = newsState
        .map { state ->
            val events = (state as? UiState.Success)?.data.orEmpty()
            val now = System.currentTimeMillis()
            val upcomingHigh = events.filter { it.impact == NewsEvent.IMPACT_HIGH && it.timestampMillis >= now - 3600_000L }
            upcomingHigh.firstOrNull() ?: events.firstOrNull { it.impact == NewsEvent.IMPACT_HIGH }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    init {
        viewModelScope.launch {
            val res = repository.ensureUserProfile(
                uid = currentUserId,
                displayName = userDisplayName,
                email = userEmail,
                isEmailVerified = isEmailVerified
            )
            if (res.isFailure) {
                Log.w(TAG, "Profile sync note: ${res.exceptionOrNull()?.message}")
            }
        }

        // Fetch live macroeconomic calendar feed on startup
        refreshLiveCalendar(silent = true)

        // Observe community posts for likes & instant new-post notifications
        viewModelScope.launch {
            communityPostsState.collect { state ->
                val posts = (state as? UiState.Success)?.data ?: return@collect
                if (posts.isNotEmpty()) {
                    _likedPostIds.value = repository.fetchLikedPostIds(posts.map { it.id }, currentUserId)
                }
                val currentIds = posts.map { it.id }.toSet()
                if (!hasInitializedCommunitySnapshot) {
                    hasInitializedCommunitySnapshot = true
                    knownPostIds = currentIds
                } else {
                    val newestAdded = posts.firstOrNull { !knownPostIds.contains(it.id) }
                    if (newestAdded != null && newestAdded.authorId != currentUserId) {
                        _newCommunityPostAlert.value = newestAdded
                    }
                    knownPostIds = currentIds
                }
            }
        }

        // Seed starter plans/products/news/settings automatically once when Admin signs in
        viewModelScope.launch {
            isAdmin.collect { admin ->
                if (admin && !hasAttemptedAutoSeed) {
                    hasAttemptedAutoSeed = true
                    repository.seedDemoDataIfEmpty(userDisplayName)
                }
            }
        }
    }

    fun clearActionMessage() {
        _actionMessage.value = null
    }

    fun clearCommunityPostAlert() {
        _newCommunityPostAlert.value = null
    }

    fun clearEmailReceipt() {
        _latestEmailReceipt.value = null
    }

    fun refreshLiveCalendar(silent: Boolean = false) {
        viewModelScope.launch {
            _isRefreshingCalendar.value = true
            val res = LiveEconomicCalendarService.fetchThisWeekEvents()
            _isRefreshingCalendar.value = false
            if (res.isSuccess) {
                val items = res.getOrThrow()
                if (items.isNotEmpty()) {
                    _liveCalendarEvents.value = items
                    _liveCalendarConnected.value = true
                }
                if (!silent) {
                    _actionMessage.value = "Live economic calendar synced (${items.size} events)"
                }
            } else {
                _liveCalendarConnected.value = false
                if (!silent) {
                    _actionMessage.value = "Using Eagle Desk calendar (live feed unreachable)"
                }
            }
        }
    }

    fun updateProfileDetails(
        firstName: String,
        surname: String,
        countryCode: String,
        phoneNumber: String,
        profilePictureBase64: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.updateUserProfileDetails(
                firstName = firstName,
                surname = surname,
                countryCode = countryCode,
                phoneNumber = phoneNumber,
                profilePictureBase64 = profilePictureBase64
            )
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Eagle FX Book profile updated"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Could not update profile"
            }
        }
    }

    fun logTrade(trade: TradeEntry, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.addTrade(trade)
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Trade logged to private journal"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Failed to save trade"
            }
        }
    }

    fun deleteTrade(tradeId: String) {
        viewModelScope.launch {
            val res = repository.deleteTrade(tradeId)
            _actionMessage.value = if (res.isSuccess) "Trade removed" else "Could not remove trade"
        }
    }

    fun toggleLike(postId: String) {
        val currentlyLiked = _likedPostIds.value.contains(postId)
        _likedPostIds.value = if (currentlyLiked) _likedPostIds.value - postId else _likedPostIds.value + postId
        viewModelScope.launch {
            val res = repository.togglePostLike(postId, currentlyLiked)
            if (res.isFailure) {
                _likedPostIds.value = if (currentlyLiked) _likedPostIds.value + postId else _likedPostIds.value - postId
                _actionMessage.value = "Unable to update like"
            }
        }
    }

    fun createCommunityPost(
        title: String,
        message: String,
        pairTag: String,
        bias: String,
        chartImageKey: String,
        dateLabel: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.createCommunityPost(
                authorName = userDisplayName.ifBlank { "Eagle FX Desk" },
                dateLabel = dateLabel,
                title = title,
                adminMessage = message,
                pairTag = pairTag,
                bias = bias,
                chartImageKey = chartImageKey
            )
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Market setup published & alerted"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Failed to publish post"
            }
        }
    }

    fun deleteCommunityPost(postId: String) {
        viewModelScope.launch {
            val res = repository.deleteCommunityPost(postId)
            _actionMessage.value = if (res.isSuccess) "Post deleted" else "Delete failed"
        }
    }

    fun submitOrder(
        itemId: String,
        itemName: String,
        itemType: String,
        durationDays: Int,
        priceUsd: Double,
        priceInr: Double,
        paymentMethod: String,
        transactionId: String,
        screenshotBase64: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _isBusy.value = true
            val amountLabel = "$${priceUsd.toInt()} / ₹${priceInr.toInt()}"
            val buyerName = ((userProfileState.value as? UiState.Success)?.data?.name)
                ?.ifBlank { userDisplayName }
                ?: userDisplayName.ifBlank { "Trader" }
            val order = OrderRecord(
                userId = currentUserId,
                userEmail = userEmail.ifBlank { "trader@eaglefxbook.app" },
                userName = buyerName,
                productId = itemId,
                productName = itemName,
                itemType = itemType,
                durationDays = durationDays,
                amountLabel = amountLabel,
                paymentMethod = paymentMethod,
                transactionId = transactionId,
                paymentScreenshotBase64 = screenshotBase64
            )
            val res = repository.submitOrder(order)
            _isBusy.value = false
            if (res.isSuccess) {
                val settings = adminSettingsState.value
                val paymentDestination = if (paymentMethod == OrderRecord.METHOD_UPI) {
                    "UPI ID: ${settings?.currentUpiId ?: "Configured in Store"}"
                } else {
                    "${settings?.cryptoNetwork ?: "TRC20"} Wallet: ${settings?.currentCryptoWalletAddress ?: "Configured in Store"}"
                }
                _latestEmailReceipt.value = EmailReceiptNotice(
                    senderDisplay = "Eagle FX Book <support@eaglefxbook.app>",
                    recipientEmail = order.userEmail,
                    subject = "Eagle FX Book — Order Confirmation & Payment Verification (${res.getOrThrow().takeLast(6).uppercase()})",
                    body = """
                        From: Eagle FX Book <support@eaglefxbook.app>
                        To: ${order.userEmail}

                        Hello $buyerName,

                        Thank you for your order with Eagle FX Book!

                        Item: $itemName ($itemType)
                        Amount: $amountLabel
                        Payment Method: $paymentMethod
                        Reference / Txn ID: ${transactionId.trim()}
                        Destination: $paymentDestination
                        Status: Pending Admin Verification

                        Once our desk verifies your transaction, your license/subscription will unlock automatically inside the Eagle FX Book Store tab.

                        — Eagle FX Book Desk
                    """.trimIndent()
                )
                _actionMessage.value = "Order submitted — Eagle FX Book confirmation generated"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Order submission failed"
            }
        }
    }

    fun approveOrder(order: OrderRecord, adminNote: String = "Payment verified") {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.approveOrder(order, adminNote)
            _isBusy.value = false
            _actionMessage.value = if (res.isSuccess) {
                "Order approved & unlocked for ${order.userName}"
            } else {
                res.exceptionOrNull()?.message ?: "Approval failed"
            }
        }
    }

    fun rejectOrder(orderId: String, adminNote: String) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.rejectOrder(orderId, adminNote)
            _isBusy.value = false
            _actionMessage.value = if (res.isSuccess) "Order marked Rejected" else "Failed to reject order"
        }
    }

    fun updatePaymentSettings(
        upiId: String,
        upiQrBase64: String,
        cryptoWallet: String,
        cryptoNetwork: String
    ) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.updateAdminSettings(upiId, upiQrBase64, cryptoWallet, cryptoNetwork)
            _isBusy.value = false
            _actionMessage.value = if (res.isSuccess) {
                "Live payment details updated"
            } else {
                res.exceptionOrNull()?.message ?: "Failed to update settings"
            }
        }
    }

    fun saveSubscriptionPlan(plan: SubscriptionPlan, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.saveSubscriptionPlan(plan)
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Subscription plan saved"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Failed to save plan"
            }
        }
    }

    fun deleteSubscriptionPlan(planId: String) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.deleteSubscriptionPlan(planId)
            _isBusy.value = false
            _actionMessage.value = if (res.isSuccess) "Subscription plan deleted" else "Delete failed"
        }
    }

    fun saveProduct(
        product: StoreProduct,
        fileLink: String,
        licenseInstructions: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.saveProductWithDeliverable(product, fileLink, licenseInstructions)
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Product saved to store"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Failed to save product"
            }
        }
    }

    fun addNewsEvent(news: NewsEvent, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.addNewsEvent(news)
            _isBusy.value = false
            if (res.isSuccess) {
                _actionMessage.value = "Economic event added"
                onSuccess()
            } else {
                _actionMessage.value = res.exceptionOrNull()?.message ?: "Failed to add news event"
            }
        }
    }

    fun toggleUserBlocked(targetUser: UserProfile, blockUser: Boolean) {
        viewModelScope.launch {
            val res = repository.toggleUserBlockedStatus(targetUser, blockUser)
            _actionMessage.value = if (res.isSuccess) {
                if (blockUser) "${targetUser.name} blocked database-wide" else "${targetUser.name} unblocked"
            } else {
                res.exceptionOrNull()?.message ?: "Failed to update user access"
            }
        }
    }

    fun seedStarterData() {
        viewModelScope.launch {
            _isBusy.value = true
            val res = repository.seedDemoDataIfEmpty(userDisplayName)
            _isBusy.value = false
            _actionMessage.value = if (res.isSuccess) "Eagle FX Book starter data synced" else "Seed failed"
        }
    }

    private fun mergeNewsFeeds(firestoreList: List<NewsEvent>, liveList: List<NewsEvent>): List<NewsEvent> {
        val seen = mutableSetOf<String>()
        val combined = mutableListOf<NewsEvent>()
        (liveList + firestoreList).forEach { ev ->
            val key = "${ev.currency.uppercase()}_${ev.event.lowercase().trim()}_${ev.date}"
            if (seen.add(key)) {
                combined.add(ev)
            }
        }
        return combined.sortedBy { it.timestampMillis }
    }

    private fun <T> Flow<T>.toUiState(fallbackError: String): StateFlow<UiState<T>> {
        return map<T, UiState<T>> { UiState.Success(it) }
            .catch { error ->
                val root = unwrapAndLog(fallbackError, error)
                emit(UiState.Error(root.message ?: fallbackError))
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS),
                initialValue = UiState.Loading
            )
    }

    private fun unwrapAndLog(label: String, error: Throwable): Throwable {
        val firestoreError = generateSequence(error) { it.cause }
            .filterIsInstance<FirebaseFirestoreException>()
            .firstOrNull()
        if (firestoreError == null && error is CancellationException) throw error
        val rootError = firestoreError ?: error
        Log.w(TAG, "$label: ${rootError.message}", rootError)
        return rootError
    }

    private fun computeMetrics(trades: List<TradeEntry>): DashboardMetrics {
        if (trades.isEmpty()) return DashboardMetrics()
        val ordered = trades.asReversed()
        var running = 0.0
        val curve = mutableListOf(0.0)
        var grossProfit = 0.0
        var grossLoss = 0.0
        var wins = 0
        var losses = 0
        var rrSum = 0.0
        var rrCount = 0

        for (t in ordered) {
            running += t.pnl
            curve.add(running)
            if (t.pnl >= 0) {
                wins++
                grossProfit += t.pnl
            } else {
                losses++
                grossLoss += kotlin.math.abs(t.pnl)
            }
            if (t.riskReward > 0.0) {
                rrSum += t.riskReward
                rrCount++
            }
        }

        val total = trades.size
        val winRate = (wins.toDouble() / total.toDouble()) * 100.0
        val avgRr = if (rrCount > 0) rrSum / rrCount else 0.0
        val pf = when {
            grossLoss > 0.0 -> grossProfit / grossLoss
            grossProfit > 0.0 -> 9.99
            else -> 0.0
        }

        return DashboardMetrics(
            totalPnl = running,
            totalTrades = total,
            winCount = wins,
            lossCount = losses,
            winRatePercent = winRate,
            avgRiskReward = avgRr,
            profitFactor = pf,
            equityCurve = curve
        )
    }

    private companion object {
        const val TAG = "EagleTradingVM"
        const val STOP_TIMEOUT_MS = 5000L
    }
}
