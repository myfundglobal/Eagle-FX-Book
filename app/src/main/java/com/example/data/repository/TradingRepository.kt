package com.example.data.repository

import android.content.Context
import com.example.R
import com.example.data.firestore.OperationType
import com.example.data.firestore.handleFirestoreError
import com.example.data.model.AdminSettings
import com.example.data.model.CommunityPost
import com.example.data.model.NewsEvent
import com.example.data.model.OrderRecord
import com.example.data.model.ProductDeliverable
import com.example.data.model.StoreProduct
import com.example.data.model.SubscriptionPlan
import com.example.data.model.TradeEntry
import com.example.data.model.UnlockedProduct
import com.example.data.model.UserProfile
import com.google.firebase.Firebase
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot.ServerTimestampBehavior
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import java.util.UUID

class TradingRepository(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth = Firebase.auth
) {
    constructor(context: Context) : this(
        db = FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        ),
        auth = Firebase.auth
    )

    private fun requireUserId(): String {
        return auth.currentUser?.uid
            ?: throw IllegalStateException("User must be signed in with Google before accessing Firestore.")
    }

    private fun handleStreamError(error: Throwable, op: OperationType, path: String, expectedUid: String? = null) {
        val firestoreError = generateSequence(error) { it.cause }
            .filterIsInstance<FirebaseFirestoreException>()
            .firstOrNull()
        if (firestoreError == null && error is CancellationException) throw error
        val exceptionToLog = firestoreError ?: (error as? Exception)
        val shouldLog = expectedUid == null || auth.currentUser?.uid == expectedUid
        if (exceptionToLog != null && shouldLog) {
            handleFirestoreError(exceptionToLog, op, path)
        }
    }

    // --- USER PROFILE & ROLE ---

    fun observeUserProfile(userId: String): Flow<UserProfile?> {
        val path = "users/$userId"
        return db.collection("users").document(userId)
            .snapshots()
            .map { it.toObject(UserProfile::class.java, ServerTimestampBehavior.ESTIMATE) }
            .catch { error ->
                handleStreamError(error, OperationType.GET, path, userId)
                throw error
            }
    }

    suspend fun ensureUserProfile(
        uid: String,
        displayName: String,
        email: String,
        isEmailVerified: Boolean
    ): Result<UserProfile> {
        val path = "users/$uid"
        return try {
            val docRef = db.collection("users").document(uid)
            val existing = docRef.get().await()
            val isBootstrapAdmin = isEmailVerified &&
                email.equals(UserProfile.BOOTSTRAP_ADMIN_EMAIL, ignoreCase = true)

            val parts = displayName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
            val defaultFirst = parts.firstOrNull().orEmpty().take(60)
            val defaultSurname = parts.drop(1).joinToString(" ").take(60)

            if (!existing.exists()) {
                val role = if (isBootstrapAdmin) UserProfile.ROLE_ADMIN else UserProfile.ROLE_USER
                val payload = mapOf(
                    "userId" to uid,
                    "name" to displayName.ifBlank { "Trader" }.take(80),
                    "firstName" to defaultFirst,
                    "surname" to defaultSurname,
                    "countryCode" to "+1",
                    "phoneNumber" to "",
                    "email" to email.ifBlank { "trader@eaglefxbook.app" }.take(150),
                    "profilePictureBase64" to "",
                    "role" to role,
                    "accessStatus" to UserProfile.STATUS_ACTIVE,
                    "activePlanName" to if (isBootstrapAdmin) "Eagle Desk Admin" else "Free Tier",
                    "subscriptionStatus" to UserProfile.SUB_NONE,
                    "subscriptionExpiresAtMillis" to 0L,
                    "profileCompleted" to isBootstrapAdmin,
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                docRef.set(payload).await()
            } else if (isBootstrapAdmin) {
                val current = existing.toObject(UserProfile::class.java, ServerTimestampBehavior.ESTIMATE)
                if (current != null && current.role != UserProfile.ROLE_ADMIN) {
                    docRef.update(
                        mapOf(
                            "role" to UserProfile.ROLE_ADMIN,
                            "profileCompleted" to true,
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    ).await()
                }
            }

            val finalSnap = docRef.get().await()
            val profile = finalSnap.toObject(UserProfile::class.java, ServerTimestampBehavior.ESTIMATE)
                ?: UserProfile(id = uid, userId = uid, name = displayName, email = email)
            Result.success(profile)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, path)
            Result.failure(e)
        }
    }

    suspend fun updateUserProfileDetails(
        firstName: String,
        surname: String,
        countryCode: String,
        phoneNumber: String,
        profilePictureBase64: String
    ): Result<Unit> {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid)
        val cleanFirst = firstName.trim().take(60)
        val cleanSurname = surname.trim().take(60)
        val fullName = listOf(cleanFirst, cleanSurname).filter { it.isNotBlank() }.joinToString(" ")
            .ifBlank { "Trader" }.take(80)

        return try {
            docRef.update(
                mapOf(
                    "name" to fullName,
                    "firstName" to cleanFirst,
                    "surname" to cleanSurname,
                    "countryCode" to countryCode.trim().take(8),
                    "phoneNumber" to phoneNumber.filter { it.isDigit() }.take(20),
                    "profilePictureBase64" to profilePictureBase64.take(340000),
                    "profileCompleted" to true,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    // --- PRIVATE TRADING JOURNAL ---

    fun observeTrades(userId: String): Flow<List<TradeEntry>> {
        val path = "users/$userId/trades"
        return db.collection("users").document(userId).collection("trades")
            .snapshots()
            .map { snap ->
                snap.toObjects(TradeEntry::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path, userId)
                throw error
            }
    }

    suspend fun addTrade(trade: TradeEntry): Result<String> {
        val uid = requireUserId()
        val docId = "tr_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val docRef = db.collection("users").document(uid).collection("trades").document(docId)
        val payload = mapOf(
            "userId" to uid,
            "date" to trade.date.take(24),
            "monthKey" to trade.monthKey.take(16),
            "pair" to trade.pair.trim().take(24),
            "side" to trade.side,
            "lotSize" to trade.lotSize,
            "entryPrice" to trade.entryPrice,
            "exitPrice" to trade.exitPrice,
            "stopLoss" to trade.stopLoss,
            "takeProfit" to trade.takeProfit,
            "riskReward" to trade.riskReward,
            "strategyTags" to trade.strategyTags.take(6),
            "pnl" to trade.pnl,
            "notes" to trade.notes.take(500),
            "screenshotBase64" to trade.screenshotBase64.take(340000),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            docRef.set(payload).await()
            Result.success(docId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteTrade(tradeId: String): Result<Unit> {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid).collection("trades").document(tradeId)
        return try {
            docRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            Result.failure(e)
        }
    }

    // --- COMMUNITY FEED ---

    fun observeCommunityPosts(): Flow<List<CommunityPost>> {
        val path = "community_posts"
        return db.collection(path)
            .snapshots()
            .map { snap ->
                snap.toObjects(CommunityPost::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    suspend fun fetchLikedPostIds(postIds: List<String>, userId: String): Set<String> {
        val liked = mutableSetOf<String>()
        for (postId in postIds) {
            val likeRef = db.collection("community_posts").document(postId)
                .collection("likes").document(userId)
            try {
                if (likeRef.get().await().exists()) {
                    liked.add(postId)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                handleFirestoreError(e, OperationType.GET, likeRef.path)
            }
        }
        return liked
    }

    suspend fun togglePostLike(postId: String, currentlyLiked: Boolean): Result<Boolean> {
        val uid = requireUserId()
        val postRef = db.collection("community_posts").document(postId)
        val likeRef = postRef.collection("likes").document(uid)
        return try {
            val batch = db.batch()
            if (currentlyLiked) {
                batch.delete(likeRef)
                batch.update(
                    postRef,
                    mapOf(
                        "likesCount" to FieldValue.increment(-1),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                )
            } else {
                batch.set(
                    likeRef,
                    mapOf(
                        "userId" to uid,
                        "createdAt" to FieldValue.serverTimestamp()
                    )
                )
                batch.update(
                    postRef,
                    mapOf(
                        "likesCount" to FieldValue.increment(1),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                )
            }
            batch.commit().await()
            Result.success(!currentlyLiked)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, postRef.path)
            Result.failure(e)
        }
    }

    suspend fun createCommunityPost(
        authorName: String,
        dateLabel: String,
        title: String,
        adminMessage: String,
        pairTag: String,
        bias: String,
        chartImageKey: String
    ): Result<String> {
        val uid = requireUserId()
        val postId = "post_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val postRef = db.collection("community_posts").document(postId)
        val payload = mapOf(
            "authorId" to uid,
            "authorName" to authorName.ifBlank { "Eagle Desk Admin" }.take(80),
            "dateLabel" to dateLabel.take(40),
            "title" to title.trim().take(120),
            "adminMessage" to adminMessage.trim().take(2000),
            "pairTag" to pairTag.trim().take(24),
            "bias" to bias,
            "chartImageKey" to chartImageKey.take(340000),
            "likesCount" to 0L,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            postRef.set(payload).await()
            Result.success(postId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, postRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteCommunityPost(postId: String): Result<Unit> {
        requireUserId()
        val postRef = db.collection("community_posts").document(postId)
        return try {
            postRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, postRef.path)
            Result.failure(e)
        }
    }

    // --- NEWS CALENDAR ---

    fun observeNewsCalendar(): Flow<List<NewsEvent>> {
        val path = "news_calendar"
        return db.collection(path)
            .orderBy("timestampMillis", Query.Direction.ASCENDING)
            .snapshots()
            .map { snap -> snap.toObjects(NewsEvent::class.java, ServerTimestampBehavior.ESTIMATE) }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    suspend fun addNewsEvent(news: NewsEvent): Result<String> {
        requireUserId()
        val newsId = "news_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val docRef = db.collection("news_calendar").document(newsId)
        val payload = mapOf(
            "date" to news.date.take(24),
            "time" to news.time.take(24),
            "timestampMillis" to news.timestampMillis,
            "currency" to news.currency.uppercase().take(12),
            "event" to news.event.trim().take(160),
            "impact" to news.impact,
            "forecast" to news.forecast.take(32),
            "previous" to news.previous.take(32),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            docRef.set(payload).await()
            Result.success(newsId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            Result.failure(e)
        }
    }

    // --- SUBSCRIPTION PLANS (DYNAMIC ADMIN CRUD) ---

    fun observeSubscriptionPlans(): Flow<List<SubscriptionPlan>> {
        val path = "subscription_plans"
        return db.collection(path)
            .snapshots()
            .map { snap ->
                snap.toObjects(SubscriptionPlan::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedBy { it.durationDays }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    suspend fun saveSubscriptionPlan(plan: SubscriptionPlan): Result<String> {
        requireUserId()
        val planId = plan.id.ifBlank { "plan_${UUID.randomUUID().toString().replace("-", "").take(14)}" }
        val docRef = db.collection("subscription_plans").document(planId)
        val payload = mapOf(
            "name" to plan.name.trim().take(100),
            "durationLabel" to plan.durationLabel.trim().take(40),
            "durationDays" to plan.durationDays.coerceIn(1, 50000),
            "priceUsd" to plan.priceUsd,
            "priceInr" to plan.priceInr,
            "features" to plan.features.take(10),
            "badgeText" to plan.badgeText.trim().take(32),
            "isActive" to plan.isActive,
            "createdAt" to (plan.createdAt ?: FieldValue.serverTimestamp()),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            docRef.set(payload).await()
            Result.success(planId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteSubscriptionPlan(planId: String): Result<Unit> {
        requireUserId()
        val docRef = db.collection("subscription_plans").document(planId)
        return try {
            docRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            Result.failure(e)
        }
    }

    // --- STORE CATALOG & UNLOCKED PRODUCTS ---

    fun observeProducts(): Flow<List<StoreProduct>> {
        val path = "products"
        return db.collection(path)
            .snapshots()
            .map { snap ->
                snap.toObjects(StoreProduct::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    fun observeUnlockedProducts(userId: String): Flow<List<UnlockedProduct>> {
        val path = "users/$userId/unlocked_products"
        return db.collection("users").document(userId).collection("unlocked_products")
            .snapshots()
            .map { snap -> snap.toObjects(UnlockedProduct::class.java, ServerTimestampBehavior.ESTIMATE) }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path, userId)
                throw error
            }
    }

    suspend fun saveProductWithDeliverable(
        product: StoreProduct,
        fileLink: String,
        licenseInstructions: String
    ): Result<String> {
        requireUserId()
        val productId = product.id.ifBlank { "prod_${UUID.randomUUID().toString().replace("-", "").take(16)}" }
        val productRef = db.collection("products").document(productId)
        val deliverableRef = db.collection("product_deliverables").document(productId)
        return try {
            val batch = db.batch()
            val productPayload = mapOf(
                "name" to product.name.trim().take(120),
                "category" to product.category,
                "description" to product.description.trim().take(1500),
                "version" to product.version.ifBlank { "1.0" }.take(24),
                "priceUsd" to product.priceUsd,
                "priceInr" to product.priceInr,
                "coverImageKey" to product.coverImageKey.take(340000),
                "features" to product.features.take(10),
                "isActive" to product.isActive,
                "createdAt" to (product.createdAt ?: FieldValue.serverTimestamp()),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            val deliverablePayload = mapOf(
                "productId" to productId,
                "fileLink" to fileLink.trim().take(500),
                "licenseInstructions" to licenseInstructions.trim().take(1000),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            batch.set(productRef, productPayload)
            batch.set(deliverableRef, deliverablePayload)
            batch.commit().await()
            Result.success(productId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, productRef.path)
            Result.failure(e)
        }
    }

    // --- ORDERS & ADMIN APPROVAL ---

    fun observeUserOrders(userId: String): Flow<List<OrderRecord>> {
        val path = "orders"
        return db.collection(path)
            .whereEqualTo("userId", userId)
            .snapshots()
            .map { snap ->
                snap.toObjects(OrderRecord::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path, userId)
                throw error
            }
    }

    fun observeAllOrdersForAdmin(): Flow<List<OrderRecord>> {
        val path = "orders"
        return db.collection(path)
            .snapshots()
            .map { snap ->
                snap.toObjects(OrderRecord::class.java, ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
            }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    fun observeAllUsersForAdmin(): Flow<List<UserProfile>> {
        val path = "users"
        return db.collection(path)
            .snapshots()
            .map { snap -> snap.toObjects(UserProfile::class.java, ServerTimestampBehavior.ESTIMATE) }
            .catch { error ->
                handleStreamError(error, OperationType.LIST, path)
                throw error
            }
    }

    suspend fun submitOrder(order: OrderRecord): Result<String> {
        val uid = requireUserId()
        val orderId = "ord_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val orderRef = db.collection("orders").document(orderId)
        val payload = mapOf(
            "userId" to uid,
            "userEmail" to order.userEmail.take(150),
            "userName" to order.userName.ifBlank { "Trader" }.take(80),
            "productId" to order.productId,
            "productName" to order.productName.take(120),
            "itemType" to order.itemType,
            "durationDays" to order.durationDays.coerceAtLeast(0),
            "amountLabel" to order.amountLabel.take(60),
            "paymentMethod" to order.paymentMethod,
            "transactionId" to order.transactionId.trim().take(128),
            "paymentScreenshotBase64" to order.paymentScreenshotBase64.take(340000),
            "status" to OrderRecord.STATUS_PENDING,
            "adminNote" to "",
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            orderRef.set(payload).await()
            Result.success(orderId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, orderRef.path)
            Result.failure(e)
        }
    }

    suspend fun approveOrder(order: OrderRecord, adminNote: String = "Payment verified"): Result<Unit> {
        requireUserId()
        val orderRef = db.collection("orders").document(order.id)
        val unlockRef = db.collection("users").document(order.userId)
            .collection("unlocked_products").document(order.productId)

        return try {
            val batch = db.batch()
            batch.update(
                orderRef,
                mapOf(
                    "status" to OrderRecord.STATUS_APPROVED,
                    "adminNote" to adminNote.ifBlank { "Payment verified" }.take(300),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            )

            if (order.itemType == OrderRecord.TYPE_PLAN) {
                val isLifetime = order.durationDays >= 3650
                val expiresAt = if (isLifetime) {
                    System.currentTimeMillis() + 36500L * 86_400_000L
                } else {
                    System.currentTimeMillis() + order.durationDays.coerceAtLeast(1).toLong() * 86_400_000L
                }
                val buyerRef = db.collection("users").document(order.userId)
                batch.update(
                    buyerRef,
                    mapOf(
                        "activePlanName" to order.productName.take(80),
                        "subscriptionStatus" to if (isLifetime) UserProfile.SUB_LIFETIME else UserProfile.SUB_ACTIVE,
                        "subscriptionExpiresAtMillis" to expiresAt,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                )
                val licenseKey = "EFX-PLAN-${order.id.takeLast(6).uppercase()}"
                batch.set(
                    unlockRef,
                    mapOf(
                        "productId" to order.productId,
                        "orderId" to order.id,
                        "productName" to order.productName.take(120),
                        "fileLink" to "https://eaglefxbook.app/membership/${order.productId}",
                        "licenseKey" to licenseKey,
                        "unlockedAt" to FieldValue.serverTimestamp()
                    )
                )
            } else {
                val deliverableRef = db.collection("product_deliverables").document(order.productId)
                val deliverableSnap = deliverableRef.get().await()
                val deliverable = deliverableSnap.toObject(ProductDeliverable::class.java, ServerTimestampBehavior.ESTIMATE)
                val resolvedLink = deliverable?.fileLink?.takeIf { it.isNotBlank() }
                    ?: "https://releases.eaglefxbook.app/packages/${order.productId}"
                val licenseKey = "EFX-${order.productId.take(4).uppercase()}-${order.id.takeLast(6).uppercase()}"

                batch.set(
                    unlockRef,
                    mapOf(
                        "productId" to order.productId,
                        "orderId" to order.id,
                        "productName" to order.productName.take(120),
                        "fileLink" to resolvedLink.take(500),
                        "licenseKey" to licenseKey,
                        "unlockedAt" to FieldValue.serverTimestamp()
                    )
                )
            }

            batch.commit().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, orderRef.path)
            Result.failure(e)
        }
    }

    suspend fun rejectOrder(orderId: String, adminNote: String): Result<Unit> {
        requireUserId()
        val orderRef = db.collection("orders").document(orderId)
        return try {
            orderRef.update(
                mapOf(
                    "status" to OrderRecord.STATUS_REJECTED,
                    "adminNote" to adminNote.ifBlank { "Transaction could not be verified" }.take(300),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, orderRef.path)
            Result.failure(e)
        }
    }

    // --- ADMIN SETTINGS & USER BLOCK/UNBLOCK ---

    fun observeAdminSettings(): Flow<AdminSettings?> {
        val path = "admin_settings/${AdminSettings.DOC_ID}"
        return db.collection("admin_settings").document(AdminSettings.DOC_ID)
            .snapshots()
            .map { it.toObject(AdminSettings::class.java, ServerTimestampBehavior.ESTIMATE) }
            .catch { error ->
                handleStreamError(error, OperationType.GET, path)
                throw error
            }
    }

    suspend fun updateAdminSettings(
        upiId: String,
        upiQrImageBase64: String,
        cryptoWalletAddress: String,
        cryptoNetwork: String
    ): Result<Unit> {
        val uid = requireUserId()
        val docRef = db.collection("admin_settings").document(AdminSettings.DOC_ID)
        val payload = mapOf(
            "currentUpiId" to upiId.trim().take(120),
            "currentUpiQrImageBase64" to upiQrImageBase64.take(340000),
            "currentCryptoWalletAddress" to cryptoWalletAddress.trim().take(150),
            "cryptoNetwork" to cryptoNetwork.trim().take(40),
            "updatedBy" to uid,
            "updatedAt" to FieldValue.serverTimestamp()
        )
        return try {
            docRef.set(payload).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun toggleUserBlockedStatus(
        targetUser: UserProfile,
        blockUser: Boolean
    ): Result<Unit> {
        requireUserId()
        val userRef = db.collection("users").document(targetUser.userId)
        val newStatus = if (blockUser) UserProfile.STATUS_BLOCKED else UserProfile.STATUS_ACTIVE
        return try {
            userRef.update(
                mapOf(
                    "accessStatus" to newStatus,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, userRef.path)
            Result.failure(e)
        }
    }

    // --- ADMIN STARTER SEED ---

    suspend fun seedDemoDataIfEmpty(adminName: String): Result<Unit> {
        val uid = requireUserId()
        return try {
            val settingsRef = db.collection("admin_settings").document(AdminSettings.DOC_ID)
            if (!settingsRef.get().await().exists()) {
                settingsRef.set(
                    mapOf(
                        "currentUpiId" to "eaglefxbook@okaxis",
                        "currentUpiQrImageBase64" to "",
                        "currentCryptoWalletAddress" to "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
                        "cryptoNetwork" to "TRC20 (USDT)",
                        "updatedBy" to uid,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }

            val plansSnap = db.collection("subscription_plans").limit(1).get().await()
            if (plansSnap.isEmpty) {
                saveSubscriptionPlan(
                    SubscriptionPlan(
                        id = "plan_30_days",
                        name = "Eagle FX Book • 30 Days",
                        durationLabel = "30 Days",
                        durationDays = 30,
                        priceUsd = 29.0,
                        priceInr = 2499.0,
                        features = listOf("Unlimited Journal Trades", "Live High-Impact News Alerts", "Private Desk Community"),
                        badgeText = "STARTER",
                        isActive = true
                    )
                )
                saveSubscriptionPlan(
                    SubscriptionPlan(
                        id = "plan_1_year",
                        name = "Eagle FX Book • 1 Year Pro",
                        durationLabel = "1 Year",
                        durationDays = 365,
                        priceUsd = 199.0,
                        priceInr = 16499.0,
                        features = listOf("All 30-Day Pro Features", "Priority Setup Alerts", "Save 43% Annually"),
                        badgeText = "POPULAR",
                        isActive = true
                    )
                )
                saveSubscriptionPlan(
                    SubscriptionPlan(
                        id = "plan_lifetime",
                        name = "Eagle FX Book • Lifetime VIP",
                        durationLabel = "Lifetime",
                        durationDays = 36500,
                        priceUsd = 449.0,
                        priceInr = 36999.0,
                        features = listOf("Permanent FX Book Access", "All Future Updates", "VIP Algo Discount"),
                        badgeText = "BEST VALUE",
                        isActive = true
                    )
                )
            }

            val productsSnap = db.collection("products").limit(1).get().await()
            if (productsSnap.isEmpty) {
                saveProductWithDeliverable(
                    product = StoreProduct(
                        id = "prod_nexus_gold_ea",
                        name = "Eagle XAU Scalper EA v4.2",
                        category = StoreProduct.CATEGORY_ALGO_BOT,
                        description = "Session-filtered Gold (XAU/USD) liquidity sweep execution bot for MT5 with dynamic ATR risk sizing and news-pause protection.",
                        version = "4.2.0",
                        priceUsd = 149.0,
                        priceInr = 12499.0,
                        coverImageKey = StoreProduct.PRESET_ALGO_BOT,
                        features = listOf("MT5 Expert Advisor (.ex5)", "London & NY Session Filter", "Built-in Equity Guard", "Lifetime Updates"),
                        isActive = true
                    ),
                    fileLink = "https://releases.eaglefxbook.app/vault/Eagle-XAU-Scalper-v4.2.ex5",
                    licenseInstructions = "Place .ex5 inside MQL5/Experts, attach to XAUUSD M15, and enter your Eagle FX Book license key."
                )
                saveProductWithDeliverable(
                    product = StoreProduct(
                        id = "prod_smc_liquidity_suite",
                        name = "ICT Institutional OrderFlow Suite",
                        category = StoreProduct.CATEGORY_INDICATOR,
                        description = "Multi-timeframe Fair Value Gap, Equal Highs/Lows liquidity pools, and Killzone session overlays for TradingView & MT5.",
                        version = "3.1.4",
                        priceUsd = 89.0,
                        priceInr = 7499.0,
                        coverImageKey = StoreProduct.PRESET_SMC_SUITE,
                        features = listOf("PineScript v5 + MT5 Bundle", "Auto BOS / CHoCH Alerts", "Killzone Session Boxes", "CSV Trade Exporter"),
                        isActive = true
                    ),
                    fileLink = "https://releases.eaglefxbook.app/vault/ICT-OrderFlow-Suite-v3.1.zip",
                    licenseInstructions = "Import the PineScript source into TradingView or load the MT5 template included in the archive."
                )
            }

            val newsSnap = db.collection("news_calendar").limit(1).get().await()
            if (newsSnap.isEmpty) {
                val now = System.currentTimeMillis()
                val starterNews = listOf(
                    NewsEvent(
                        date = "2026-11-15",
                        time = "13:30 UTC",
                        timestampMillis = now + 2 * 3600_000L,
                        currency = "USD",
                        event = "US Core CPI (MoM) & Inflation Print",
                        impact = NewsEvent.IMPACT_HIGH,
                        forecast = "0.3%",
                        previous = "0.2%"
                    ),
                    NewsEvent(
                        date = "2026-11-16",
                        time = "19:00 UTC",
                        timestampMillis = now + 28 * 3600_000L,
                        currency = "USD",
                        event = "FOMC Rate Statement & Press Briefing",
                        impact = NewsEvent.IMPACT_HIGH,
                        forecast = "4.50%",
                        previous = "4.75%"
                    ),
                    NewsEvent(
                        date = "2026-11-17",
                        time = "07:00 UTC",
                        timestampMillis = now + 44 * 3600_000L,
                        currency = "GBP",
                        event = "UK Claimant Count & GDP Monthly",
                        impact = NewsEvent.IMPACT_MEDIUM,
                        forecast = "0.2%",
                        previous = "0.1%"
                    ),
                    NewsEvent(
                        date = "2026-11-18",
                        time = "13:30 UTC",
                        timestampMillis = now + 72 * 3600_000L,
                        currency = "EUR",
                        event = "ECB Monetary Policy Account",
                        impact = NewsEvent.IMPACT_HIGH,
                        forecast = "-",
                        previous = "-"
                    )
                )
                starterNews.forEach { addNewsEvent(it) }
            }

            val postsSnap = db.collection("community_posts").limit(1).get().await()
            if (postsSnap.isEmpty) {
                createCommunityPost(
                    authorName = adminName.ifBlank { "Eagle FX Desk" },
                    dateLabel = "Nov 14 • London Desk",
                    title = "XAU/USD 4H Liquidity Sweep & FVG Reclaim",
                    adminMessage = "Price swept Asian lows into the 4H discount Fair Value Gap at 2642–2648. Watching NY open displacement for long continuation toward 2678 external liquidity. Strict 0.5% risk ahead of US CPI.",
                    pairTag = "XAU/USD",
                    bias = CommunityPost.BIAS_BULLISH,
                    chartImageKey = CommunityPost.PRESET_COMMUNITY_CHART
                )
                createCommunityPost(
                    authorName = adminName.ifBlank { "Eagle FX Desk" },
                    dateLabel = "Nov 14 • Macro Note",
                    title = "EUR/USD Premium Supply Rejection",
                    adminMessage = "DXY bouncing off daily OB. Avoid chasing longs on EUR/USD until 1.0785 internal liquidity clears cleanly.",
                    pairTag = "EUR/USD",
                    bias = CommunityPost.BIAS_BEARISH,
                    chartImageKey = ""
                )
            }

            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, "seed_demo_data")
            Result.failure(e)
        }
    }
}
