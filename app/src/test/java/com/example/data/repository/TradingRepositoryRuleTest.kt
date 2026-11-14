package com.example.data.repository

import com.example.base.FirestoreEmulatorTestBase
import com.example.data.model.CommunityPost
import com.example.data.model.OrderRecord
import com.example.data.model.StoreProduct
import com.example.data.model.SubscriptionPlan
import com.example.data.model.TradeEntry
import com.example.data.model.UserProfile
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class TradingRepositoryRuleTest : FirestoreEmulatorTestBase() {

    @Test
    fun userCanLogAndObservePrivateTrades_andOtherUserCannotReadThem() = runBlocking {
        val aliceUid = signInTestUser(ALICE_EMAIL, markEmailVerified = true)
        val aliceRepo = TradingRepository(firestore, auth)

        val trade = TradeEntry(
            date = "2026-11-14",
            monthKey = "2026-11",
            pair = "XAU/USD",
            side = TradeEntry.SIDE_BUY,
            lotSize = 0.5,
            entryPrice = 2650.0,
            exitPrice = 2665.0,
            stopLoss = 2642.0,
            takeProfit = 2666.0,
            riskReward = 2.0,
            strategyTags = listOf("SMC", "Liquidity"),
            pnl = 750.0,
            notes = "London killzone sweep"
        )
        val addRes = withTimeout(DEFAULT_TIMEOUT_MS) { aliceRepo.addTrade(trade) }
        assertTrue("Expected addTrade success: ${addRes.exceptionOrNull()}", addRes.isSuccess)
        val tradeId = addRes.getOrThrow()

        val aliceTrades = withTimeout(FLOW_TIMEOUT_MS) {
            aliceRepo.observeTrades(aliceUid).first { list -> list.any { it.id == tradeId } }
        }
        assertTrue(aliceTrades.any { it.id == tradeId && it.pair == "XAU/USD" })

        signInTestUser(BOB_EMAIL, markEmailVerified = true)
        val bobRepo = TradingRepository(firestore, auth)
        val error = runCatching {
            withTimeout(FLOW_TIMEOUT_MS) { bobRepo.observeTrades(aliceUid).first() }
        }.exceptionOrNull()
        val fsErr = checkNotNull(error?.unwrapFirestoreException()) {
            "Expected PERMISSION_DENIED for Bob reading Alice's trades, got $error"
        }
        assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, fsErr.code)
    }

    @Test
    fun unauthenticatedUser_failsWithPermissionDenied() = runBlocking {
        auth.signOut()
        val repo = TradingRepository(firestore, auth)

        val error = runCatching {
            withTimeout(FLOW_TIMEOUT_MS) { repo.observeProducts().first() }
        }.exceptionOrNull()
        val fsErr = checkNotNull(error?.unwrapFirestoreException()) {
            "Expected PERMISSION_DENIED when unauthenticated, got $error"
        }
        assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, fsErr.code)
    }

    @Test
    fun adminManagesPlansAndProducts_approvesPlanOrder_andCanBlockUser() = runBlocking {
        val adminUid = signInTestUser(UserProfile.BOOTSTRAP_ADMIN_EMAIL.lowercase(), markEmailVerified = true)
        val adminRepo = TradingRepository(firestore, auth)

        val profileRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.ensureUserProfile(adminUid, "Head Admin", UserProfile.BOOTSTRAP_ADMIN_EMAIL, true)
        }
        assertTrue("Expected admin profile setup success: ${profileRes.exceptionOrNull()}", profileRes.isSuccess)
        assertTrue(profileRes.getOrThrow().isAdmin)

        // Admin creates a dynamic subscription plan
        val planId = "plan_${UUID.randomUUID().toString().replace("-", "").take(10)}"
        val savePlanRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.saveSubscriptionPlan(
                SubscriptionPlan(
                    id = planId,
                    name = "Eagle FX Book 30 Days",
                    durationLabel = "30 Days",
                    durationDays = 30,
                    priceUsd = 29.0,
                    priceInr = 2499.0,
                    features = listOf("Journal + Alerts"),
                    badgeText = "PRO",
                    isActive = true
                )
            )
        }
        assertTrue("Expected plan save success: ${savePlanRes.exceptionOrNull()}", savePlanRes.isSuccess)

        // Admin creates a Store product + hidden deliverable
        val productId = "prod_${UUID.randomUUID().toString().replace("-", "").take(10)}"
        val saveProdRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.saveProductWithDeliverable(
                product = StoreProduct(
                    id = productId,
                    name = "Test Gold EA",
                    category = StoreProduct.CATEGORY_ALGO_BOT,
                    description = "Automated scalping tool",
                    version = "1.0",
                    priceUsd = 99.0,
                    priceInr = 7999.0,
                    coverImageKey = StoreProduct.PRESET_ALGO_BOT,
                    features = listOf("Auto SL"),
                    isActive = true
                ),
                fileLink = "https://releases.eaglefxbook.app/test-gold-ea.ex5",
                licenseInstructions = "Install in MT5"
            )
        }
        assertTrue("Expected product save success: ${saveProdRes.exceptionOrNull()}", saveProdRes.isSuccess)

        val postRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.createCommunityPost(
                authorName = "Head Admin",
                dateLabel = "Nov 14",
                title = "Market Update $productId",
                adminMessage = "Watching key liquidity high.",
                pairTag = "XAU/USD",
                bias = CommunityPost.BIAS_BULLISH,
                chartImageKey = CommunityPost.PRESET_COMMUNITY_CHART
            )
        }
        assertTrue("Expected post creation success: ${postRes.exceptionOrNull()}", postRes.isSuccess)
        val postId = postRes.getOrThrow()

        // Sign in as regular trader Alice
        val aliceUid = signInTestUser(ALICE_EMAIL, markEmailVerified = true)
        val aliceRepo = TradingRepository(firestore, auth)
        val aliceProfileRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            aliceRepo.ensureUserProfile(aliceUid, "Alice Trader", ALICE_EMAIL, true)
        }
        assertTrue(aliceProfileRes.isSuccess)
        assertEquals(UserProfile.ROLE_USER, aliceProfileRes.getOrThrow().role)

        // Alice completes her profile with validated phone details
        val updateProfileRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            aliceRepo.updateUserProfileDetails("Alice", "Mercer", "+91", "9876543210", "")
        }
        assertTrue("Expected profile update success: ${updateProfileRes.exceptionOrNull()}", updateProfileRes.isSuccess)

        // Alice cannot create a plan
        val badPlanRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            aliceRepo.saveSubscriptionPlan(
                SubscriptionPlan(
                    id = "plan_illegal_${UUID.randomUUID().toString().take(6)}",
                    name = "Illegal Plan",
                    durationLabel = "1 Day",
                    durationDays = 1,
                    priceUsd = 1.0,
                    priceInr = 80.0
                )
            )
        }
        assertTrue(badPlanRes.isFailure)

        // Alice can like the post atomically
        val likeRes = withTimeout(DEFAULT_TIMEOUT_MS) { aliceRepo.togglePostLike(postId, currentlyLiked = false) }
        assertTrue("Expected like toggle success: ${likeRes.exceptionOrNull()}", likeRes.isSuccess)

        // Alice submits a Pending Plan order
        val planOrderRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            aliceRepo.submitOrder(
                OrderRecord(
                    userId = aliceUid,
                    userEmail = ALICE_EMAIL,
                    userName = "Alice Mercer",
                    productId = planId,
                    productName = "Eagle FX Book 30 Days",
                    itemType = OrderRecord.TYPE_PLAN,
                    durationDays = 30,
                    amountLabel = "$29 / ₹2499",
                    paymentMethod = OrderRecord.METHOD_UPI,
                    transactionId = "UTR-${UUID.randomUUID().toString().take(8)}",
                    paymentScreenshotBase64 = ""
                )
            )
        }
        assertTrue("Expected plan order success: ${planOrderRes.exceptionOrNull()}", planOrderRes.isSuccess)
        val planOrderId = planOrderRes.getOrThrow()

        val aliceOrders = withTimeout(FLOW_TIMEOUT_MS) {
            aliceRepo.observeUserOrders(aliceUid).first { list -> list.any { it.id == planOrderId } }
        }
        val submittedPlanOrder = aliceOrders.first { it.id == planOrderId }
        assertEquals(OrderRecord.STATUS_PENDING, submittedPlanOrder.status)

        // Admin approves Alice's Plan order -> activates her subscription
        signInTestUser(UserProfile.BOOTSTRAP_ADMIN_EMAIL.lowercase(), markEmailVerified = true)
        val approvePlanRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.approveOrder(submittedPlanOrder, "Plan activated")
        }
        assertTrue("Expected plan approve success: ${approvePlanRes.exceptionOrNull()}", approvePlanRes.isSuccess)

        // Admin blocks Alice -> Alice's profile shows Blocked and writes fail
        val aliceDoc = UserProfile(id = aliceUid, userId = aliceUid, email = ALICE_EMAIL)
        val blockRes = withTimeout(DEFAULT_TIMEOUT_MS) { adminRepo.toggleUserBlockedStatus(aliceDoc, blockUser = true) }
        assertTrue("Expected block success: ${blockRes.exceptionOrNull()}", blockRes.isSuccess)

        signInTestUser(ALICE_EMAIL, markEmailVerified = true)
        val blockedTradeRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            aliceRepo.addTrade(
                TradeEntry(
                    date = "2026-11-14",
                    monthKey = "2026-11",
                    pair = "EUR/USD",
                    side = TradeEntry.SIDE_BUY,
                    lotSize = 0.1,
                    entryPrice = 1.08,
                    exitPrice = 1.09,
                    pnl = 100.0
                )
            )
        }
        assertTrue("Blocked user must fail writing trades", blockedTradeRes.isFailure)

        // Unblock Alice at end so repeated runs start clean
        signInTestUser(UserProfile.BOOTSTRAP_ADMIN_EMAIL.lowercase(), markEmailVerified = true)
        val unblockRes = withTimeout(DEFAULT_TIMEOUT_MS) {
            adminRepo.toggleUserBlockedStatus(aliceDoc, blockUser = false)
        }
        assertTrue(unblockRes.isSuccess)
    }

    private companion object {
        const val ALICE_EMAIL = "alice.trader@test.com"
        const val BOB_EMAIL = "bob.trader@test.com"
        const val DEFAULT_TIMEOUT_MS = 8000L
        const val FLOW_TIMEOUT_MS = 5000L
    }
}
