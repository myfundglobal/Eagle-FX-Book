package com.example.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

@IgnoreExtraProperties
data class UserProfile(
    @DocumentId val id: String = "",
    val userId: String = "",
    val name: String = "",
    val firstName: String = "",
    val surname: String = "",
    val countryCode: String = "+1",
    val phoneNumber: String = "",
    val email: String = "",
    val profilePictureBase64: String = "",
    val role: String = ROLE_USER,
    val accessStatus: String = STATUS_ACTIVE,
    val activePlanName: String = "Free Tier",
    val subscriptionStatus: String = SUB_NONE,
    val subscriptionExpiresAtMillis: Long = 0L,
    val profileCompleted: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    val isAdmin: Boolean
        get() = email.equals(BOOTSTRAP_ADMIN_EMAIL, ignoreCase = true)

    val isBlocked: Boolean
        get() = accessStatus == STATUS_BLOCKED || accessStatus == STATUS_SUSPENDED

    val hasActiveSubscription: Boolean
        get() = subscriptionStatus == SUB_LIFETIME ||
            (subscriptionStatus == SUB_ACTIVE && subscriptionExpiresAtMillis > System.currentTimeMillis())

    companion object {
        const val ROLE_ADMIN = "Admin"
        const val ROLE_USER = "User"
        const val STATUS_ACTIVE = "Active"
        const val STATUS_BLOCKED = "Blocked"
        const val STATUS_SUSPENDED = "Suspended"
        const val SUB_NONE = "None"
        const val SUB_ACTIVE = "Active"
        const val SUB_LIFETIME = "Lifetime"
        const val BOOTSTRAP_ADMIN_EMAIL = "Myfundglobal@gmail.com"
    }
}

@IgnoreExtraProperties
data class SubscriptionPlan(
    @DocumentId val id: String = "",
    val name: String = "",
    val durationLabel: String = "30 Days",
    val durationDays: Int = 30,
    val priceUsd: Double = 29.0,
    val priceInr: Double = 2499.0,
    val features: List<String> = emptyList(),
    val badgeText: String = "",
    val isActive: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class TradeEntry(
    @DocumentId val id: String = "",
    val userId: String = "",
    val date: String = "",
    val monthKey: String = "",
    val pair: String = "",
    val side: String = SIDE_BUY,
    val lotSize: Double = 0.01,
    val entryPrice: Double = 0.0,
    val exitPrice: Double = 0.0,
    val stopLoss: Double = 0.0,
    val takeProfit: Double = 0.0,
    val riskReward: Double = 0.0,
    val strategyTags: List<String> = emptyList(),
    val pnl: Double = 0.0,
    val notes: String = "",
    val screenshotBase64: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    val isWin: Boolean get() = pnl >= 0.0

    companion object {
        const val SIDE_BUY = "Buy"
        const val SIDE_SELL = "Sell"
        val PRESET_PAIRS = listOf(
            "EUR/USD", "GBP/USD", "XAU/USD", "USD/JPY",
            "GBP/JPY", "BTC/USDT", "ETH/USDT", "NAS100"
        )
        val STRATEGY_TAGS = listOf(
            "SMC", "ICT", "Liquidity", "OrderBlock", "FVG", "Breakout"
        )
    }
}

@IgnoreExtraProperties
data class CommunityPost(
    @DocumentId val id: String = "",
    val authorId: String = "",
    val authorName: String = "",
    val dateLabel: String = "",
    val title: String = "",
    val adminMessage: String = "",
    val pairTag: String = "",
    val bias: String = BIAS_BULLISH,
    val chartImageKey: String = "",
    val likesCount: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    companion object {
        const val BIAS_BULLISH = "Bullish"
        const val BIAS_BEARISH = "Bearish"
        const val BIAS_NEUTRAL = "Neutral"
        const val PRESET_COMMUNITY_CHART = "preset_community_chart"
    }
}

@IgnoreExtraProperties
data class NewsEvent(
    @DocumentId val id: String = "",
    val date: String = "",
    val time: String = "",
    val timestampMillis: Long = 0L,
    val currency: String = "",
    val event: String = "",
    val impact: String = IMPACT_HIGH,
    val forecast: String = "",
    val previous: String = "",
    val isLiveFeed: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    companion object {
        const val IMPACT_HIGH = "High"
        const val IMPACT_MEDIUM = "Medium"
        const val IMPACT_LOW = "Low"
    }
}

@IgnoreExtraProperties
data class StoreProduct(
    @DocumentId val id: String = "",
    val name: String = "",
    val category: String = CATEGORY_ALGO_BOT,
    val description: String = "",
    val version: String = "1.0",
    val priceUsd: Double = 0.0,
    val priceInr: Double = 0.0,
    val coverImageKey: String = "",
    val features: List<String> = emptyList(),
    val isActive: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    companion object {
        const val CATEGORY_ALGO_BOT = "Algo Bot"
        const val CATEGORY_SOFTWARE = "Trading Software"
        const val CATEGORY_INDICATOR = "Indicator"
        const val PRESET_ALGO_BOT = "preset_algo_bot"
        const val PRESET_SMC_SUITE = "preset_smc_suite"
    }
}

@IgnoreExtraProperties
data class ProductDeliverable(
    @DocumentId val id: String = "",
    val productId: String = "",
    val fileLink: String = "",
    val licenseInstructions: String = "",
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class UnlockedProduct(
    @DocumentId val id: String = "",
    val productId: String = "",
    val orderId: String = "",
    val productName: String = "",
    val fileLink: String = "",
    val licenseKey: String = "",
    @ServerTimestamp val unlockedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class OrderRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",
    val productId: String = "",
    val productName: String = "",
    val itemType: String = TYPE_PRODUCT,
    val durationDays: Int = 0,
    val amountLabel: String = "",
    val paymentMethod: String = METHOD_UPI,
    val transactionId: String = "",
    val paymentScreenshotBase64: String = "",
    val status: String = STATUS_PENDING,
    val adminNote: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    companion object {
        const val TYPE_PRODUCT = "Product"
        const val TYPE_PLAN = "Plan"
        const val METHOD_UPI = "UPI"
        const val METHOD_CRYPTO = "Crypto"
        const val STATUS_PENDING = "Pending"
        const val STATUS_APPROVED = "Approved"
        const val STATUS_REJECTED = "Rejected"
    }
}

@IgnoreExtraProperties
data class AdminSettings(
    @DocumentId val id: String = "",
    val currentUpiId: String = "",
    val currentUpiQrImageBase64: String = "",
    val currentCryptoWalletAddress: String = "",
    val cryptoNetwork: String = "TRC20 (USDT)",
    val updatedBy: String = "",
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    companion object {
        const val DOC_ID = "payment_config"
    }
}
