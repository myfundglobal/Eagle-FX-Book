import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import {
  BookOpen,
  CalendarClock,
  Home,
  MessageSquare,
  Shield,
  ShoppingBag,
  User,
  WifiOff
} from "lucide-react";
import { auth, db, isAdminUser, isFirebaseConfigured } from "./firebase.js";
import { fetchLiveEconomicCalendar } from "./utils/formatters.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import TopLoadingBar from "./components/TopLoadingBar.jsx";
import UpdatePopup from "./components/UpdatePopup.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import DashboardScreen from "./components/DashboardScreen.jsx";
import JournalScreen from "./components/JournalScreen.jsx";
import TradeFormSheet from "./components/TradeFormSheet.jsx";
import CommunityScreen from "./components/CommunityScreen.jsx";
import StoreScreen from "./components/StoreScreen.jsx";
import NewsScreen from "./components/NewsScreen.jsx";
import AdminDeskModal from "./components/AdminDeskModal.jsx";

const NAV_TABS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "journal", label: "Journal", Icon: BookOpen },
  { id: "community", label: "Community", Icon: MessageSquare },
  { id: "store", label: "Store", Icon: ShoppingBag },
  { id: "news", label: "News", Icon: CalendarClock }
];

export default function App() {
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [splashDone, setSplashDone] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [routeBusy, setRouteBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [customTags, setCustomTags] = useState(() => {
    try {
      const saved = localStorage.getItem("eagle_fx_custom_tags");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tradeSheetState, setTradeSheetState] = useState({
    open: false,
    existing: null,
    prefillDate: null
  });

  const [posts, setPosts] = useState([]);
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [unlockedProducts, setUnlockedProducts] = useState([]);
  const [adminSettings, setAdminSettings] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const [newsEvents, setNewsEvents] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const isAdmin = isAdminUser(user);

  // Network connectivity listener
  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  // Auth listener
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u && db) {
        const userRef = doc(db, "users", u.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const cleanName = (u.displayName || u.email?.split("@")[0] || "Trader").trim().slice(0, 80) || "Trader";
            const cleanEmail = (u.email || "trader@eaglefxbook.app").trim().slice(0, 150);
            await setDoc(
              userRef,
              {
                uid: u.uid,
                role: "User",
                accessStatus: "Active",
                subscriptionStatus: "None",
                activePlanName: "Free Tier",
                name: cleanName,
                email: cleanEmail,
                createdAt: serverTimestamp()
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn("User doc sync skipped:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Live economic calendar loader
  const refreshNews = async () => {
    setNewsLoading(true);
    const data = await fetchLiveEconomicCalendar();
    setNewsEvents(data);
    setNewsLoading(false);
  };

  useEffect(() => {
    refreshNews();
  }, []);

  // Firestore subscriptions when signed in
  useEffect(() => {
    if (!user || !db) {
      setTrades([]);
      setTradesLoading(false);
      return;
    }

    setTradesLoading(true);
    const unsubs = [];

    unsubs.push(
      onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
        }
      })
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")),
        (snap) => {
          setTrades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setTradesLoading(false);
        },
        () => setTradesLoading(false)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "community_posts"), orderBy("createdAt", "desc")),
        (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(collection(db, "subscription_plans"), (snap) =>
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(collection(db, "products"), (snap) =>
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "orders"), where("userId", "==", user.uid)),
        (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(collection(db, "users", user.uid, "unlocked_products"), (snap) =>
        setUnlockedProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(doc(db, "admin_settings", "payment_config"), (snap) => {
        if (snap.exists()) setAdminSettings(snap.data());
      })
    );

    if (isAdminUser(user)) {
      unsubs.push(
        onSnapshot(collection(db, "users"), (snap) =>
          setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        )
      );
      unsubs.push(
        onSnapshot(collection(db, "orders"), (snap) =>
          setAllOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        )
      );
    }

    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  useEffect(() => {
    if (!user || !db || posts.length === 0) {
      setLikedPostIds(new Set());
      return;
    }
    let cancelled = false;
    Promise.all(
      posts.map(async (p) => {
        try {
          const snap = await getDoc(doc(db, "community_posts", p.id, "likes", user.uid));
          return snap.exists() ? p.id : null;
        } catch {
          return null;
        }
      })
    ).then((ids) => {
      if (!cancelled) {
        setLikedPostIds(new Set(ids.filter(Boolean)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [posts, user]);

  const switchTab = (tabId) => {
    setRouteBusy(true);
    setActiveTab(tabId);
    window.setTimeout(() => setRouteBusy(false), 260);
  };

  const nextCatalyst = useMemo(() => {
    const now = Date.now();
    return newsEvents.find((e) => e.impact === "High" && e.timestampMillis > now) || null;
  }, [newsEvents]);

  // Handlers
  const handleSaveTrade = async (payload) => {
    if (!user || !db) return;
    const { id, ...fields } = payload;
    const cleanPair = String(fields.pair || "").trim().slice(0, 24);
    const body = {
      userId: user.uid,
      date: String(fields.date || new Date().toISOString().slice(0, 16)).slice(0, 24),
      monthKey: String(fields.monthKey || new Date().toISOString().slice(0, 7)).slice(0, 16),
      pair: cleanPair.length >= 2 ? cleanPair : "EUR/USD",
      side: fields.side === "Sell" ? "Sell" : "Buy",
      lotSize: Math.max(0.0001, Math.min(10000, Number(fields.lotSize) || 0.01)),
      entryPrice: Math.max(0.000001, Number(fields.entryPrice) || 1),
      exitPrice: Math.max(0.000001, Number(fields.exitPrice) || 1),
      stopLoss: Math.max(0, Number(fields.stopLoss) || 0),
      takeProfit: Math.max(0, Number(fields.takeProfit) || 0),
      riskReward: Math.max(0, Math.min(1000, Number(fields.riskReward) || 0)),
      strategyTags: Array.isArray(fields.strategyTags)
        ? fields.strategyTags.map((t) => String(t)).slice(0, 6)
        : [],
      pnl: Number(fields.pnl) || 0,
      notes: String(fields.notes || "").slice(0, 500),
      screenshotBase64: String(fields.screenshotBase64 || "").slice(0, 340000),
      updatedAt: serverTimestamp()
    };
    if (id) {
      await updateDoc(doc(db, "users", user.uid, "trades", id), body);
    } else {
      await addDoc(collection(db, "users", user.uid, "trades"), {
        ...body,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleDeleteTrade = async (tradeId) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, "users", user.uid, "trades", tradeId));
  };

  const handleAddCustomTag = (tag) => {
    const next = [...new Set([...customTags, tag])];
    setCustomTags(next);
    localStorage.setItem("eagle_fx_custom_tags", JSON.stringify(next));
  };

  const handleSaveProfile = async (details) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.uid);
    const cleanFirst = String(details.firstName || "").trim().slice(0, 60);
    const cleanSurname = String(details.surname || "").trim().slice(0, 60);
    const fullName = `${cleanFirst} ${cleanSurname}`.trim().slice(0, 80) || "Trader";
    const cleanCountry = String(details.countryCode || "+91").trim().slice(0, 8) || "+91";
    const cleanPhone = String(details.phoneNumber || "").replace(/\D/g, "").slice(0, 20);
    const cleanPhoto = String(details.profilePictureBase64 || "").slice(0, 340000);

    const profileFields = {
      firstName: cleanFirst,
      surname: cleanSurname,
      name: fullName,
      countryCode: cleanCountry,
      phoneNumber: cleanPhone,
      profilePictureBase64: cleanPhoto,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    };

    const existingSnap = await getDoc(userRef);
    const payload = existingSnap.exists()
      ? profileFields
      : {
          uid: user.uid,
          role: "User",
          accessStatus: "Active",
          subscriptionStatus: "None",
          activePlanName: "Free Tier",
          email: (user.email || "trader@eaglefxbook.app").trim().slice(0, 150),
          createdAt: serverTimestamp(),
          ...profileFields
        };

    console.log("[TraderProfileSave]", {
      path: userRef.path,
      exists: existingSnap.exists(),
      payload: {
        ...payload,
        profilePictureBase64: cleanPhoto ? `<base64:${cleanPhoto.length}chars>` : ""
      }
    });

    await setDoc(userRef, payload, { merge: true });
    setShowProfileModal(false);
  };

  const handleToggleLike = async (post) => {
    if (!user || !db) return;
    const postRef = doc(db, "community_posts", post.id);
    const likeRef = doc(db, "community_posts", post.id, "likes", user.uid);
    const likeSnap = await getDoc(likeRef);
    const alreadyLiked = likeSnap.exists();

    const nextLiked = new Set(likedPostIds);
    if (alreadyLiked) nextLiked.delete(post.id);
    else nextLiked.add(post.id);
    setLikedPostIds(nextLiked);

    const batch = writeBatch(db);
    if (alreadyLiked) {
      batch.delete(likeRef);
      batch.update(postRef, { likesCount: increment(-1), updatedAt: serverTimestamp() });
    } else {
      batch.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
      batch.update(postRef, { likesCount: increment(1), updatedAt: serverTimestamp() });
    }
    await batch.commit();
  };

  const handleCreatePost = async (payload) => {
    if (!user || !db) return;
    await addDoc(collection(db, "community_posts"), {
      title: String(payload.title || "").trim().slice(0, 120),
      pairTag: String(payload.pairTag || "FX").trim().slice(0, 24),
      bias: ["Bullish", "Bearish", "Neutral"].includes(payload.bias) ? payload.bias : "Neutral",
      adminMessage: String(payload.adminMessage || "").trim().slice(0, 2000),
      chartImageKey: String(payload.chartImageKey || "").slice(0, 340000),
      authorId: user.uid,
      authorName: (profile?.name || user.displayName || "Eagle FX Desk").slice(0, 80),
      dateLabel: new Date().toLocaleDateString([], { month: "short", day: "numeric" }).slice(0, 40),
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleDeletePost = async (postId) => {
    if (!db) return;
    await deleteDoc(doc(db, "community_posts", postId));
  };

  const handleSubmitOrder = async (payload) => {
    if (!user || !db) return;
    const cleanEmail = (user.email || "trader@eaglefxbook.app").trim().slice(0, 150);
    const cleanName = (profile?.name || user.displayName || "Trader").trim().slice(0, 80) || "Trader";
    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      userEmail: cleanEmail.length >= 3 ? cleanEmail : "trader@eaglefxbook.app",
      userName: cleanName,
      productId: String(payload.productId || "").slice(0, 128),
      productName: String(payload.productName || "Item").slice(0, 120),
      itemType: payload.itemType === "Plan" ? "Plan" : "Product",
      durationDays: Math.max(0, Math.min(50000, Math.round(Number(payload.durationDays) || 0))),
      amountLabel: String(payload.amountLabel || "Order").slice(0, 60),
      paymentMethod: payload.paymentMethod === "Crypto" ? "Crypto" : "UPI",
      transactionId: String(payload.transactionId || "").trim().slice(0, 128),
      paymentScreenshotBase64: String(payload.paymentScreenshotBase64 || "").slice(0, 340000),
      status: "Pending",
      adminNote: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleApproveOrder = async (order) => {
    if (!db) return;
    await updateDoc(doc(db, "orders", order.id), {
      status: "Approved",
      adminNote: "Payment verified & unlocked",
      updatedAt: serverTimestamp()
    });
    if (order.itemType === "Plan") {
      const isLifetime = order.durationDays >= 3650;
      const expiresAt = isLifetime
        ? Date.now() + 36500 * 86400000
        : Date.now() + Math.max(1, Number(order.durationDays) || 30) * 86400000;
      await updateDoc(doc(db, "users", order.userId), {
        activePlanName: order.productName,
        subscriptionStatus: isLifetime ? "Lifetime" : "Active",
        subscriptionExpiresAtMillis: expiresAt,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(doc(db, "users", order.userId, "unlocked_products", order.productId), {
        productId: order.productId,
        orderId: order.id,
        productName: order.productName,
        fileLink: "https://myfundglobal.github.io/Eagle-FX-Book/",
        licenseKey: `EAGLE-${order.id.slice(-6).toUpperCase()}`,
        unlockedAt: serverTimestamp()
      });
    }
  };

  const handleRejectOrder = async (order) => {
    if (!db) return;
    await updateDoc(doc(db, "orders", order.id), {
      status: "Rejected",
      adminNote: "Transaction could not be verified",
      updatedAt: serverTimestamp()
    });
  };

  const handleToggleUserBlock = async (targetUser) => {
    if (!db) return;
    const nextStatus = targetUser.accessStatus === "Blocked" ? "Active" : "Blocked";
    await updateDoc(doc(db, "users", targetUser.id), {
      accessStatus: nextStatus,
      updatedAt: serverTimestamp()
    });
  };

  const handleSavePlan = async (plan) => {
    if (!db) return;
    await addDoc(collection(db, "subscription_plans"), {
      ...plan,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleDeletePlan = async (planId) => {
    if (!db) return;
    await deleteDoc(doc(db, "subscription_plans", planId));
  };

  const handleSavePaymentSettings = async (settings) => {
    if (!user || !db) return;
    await setDoc(
      doc(db, "admin_settings", "payment_config"),
      {
        ...settings,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  return (
    <ErrorBoundary>
      <UpdatePopup />
      <TopLoadingBar active={routeBusy} />

      <AnimatePresence>
        {!splashDone && (
          <SplashScreen authReady={authReady} onComplete={() => setSplashDone(true)} />
        )}
      </AnimatePresence>

      {!isOnline && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 800,
            backgroundColor: "#7F0F18",
            color: "#F5F5F7",
            padding: "8px 14px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <WifiOff size={14} strokeWidth={1.75} />
          <span>You are offline. Cached views remain available.</span>
        </div>
      )}

      {!user ? (
        <AuthScreen />
      ) : (
        <div className="app-shell">
          {/* App Header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 0 16px 0"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src="logo.png"
                alt="Eagle FX Book"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "1px solid rgba(225, 29, 46, 0.45)",
                  objectFit: "cover"
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    letterSpacing: "1.1px",
                    color: "#F5F5F7"
                  }}
                >
                  EAGLE FX BOOK
                </div>
                <div style={{ fontSize: "10px", color: "#8B8B95" }}>
                  {profile?.activePlanName || "Trading Journal"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="touch-target"
                  style={{
                    minHeight: "36px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(225, 29, 46, 0.55)",
                    backgroundColor: "rgba(225, 29, 46, 0.16)",
                    color: "#FF2D3D",
                    fontSize: "11px",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer"
                  }}
                >
                  <Shield size={13} strokeWidth={1.75} />
                  Admin
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                aria-label="Open trader profile"
                className="touch-target"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1.5px solid #E11D2E",
                  backgroundColor: "#141418",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                {profile?.profilePictureBase64 ? (
                  <img
                    src={profile.profilePictureBase64}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={18} strokeWidth={1.75} color="#F5F5F7" />
                )}
              </button>
            </div>
          </header>

          {/* Main Tab Content */}
          <main style={{ flex: 1 }}>
            {activeTab === "home" && (
              <DashboardScreen
                trades={trades}
                loading={tradesLoading}
                nextCatalyst={nextCatalyst}
                onAddTrade={() =>
                  setTradeSheetState({ open: true, existing: null, prefillDate: null })
                }
                onViewAllJournal={() => switchTab("journal")}
                onOpenNews={() => switchTab("news")}
              />
            )}

            {activeTab === "journal" && (
              <JournalScreen
                trades={trades}
                loading={tradesLoading}
                customTags={customTags}
                onAddCustomTag={handleAddCustomTag}
                onOpenAddTrade={(prefillDate) =>
                  setTradeSheetState({ open: true, existing: null, prefillDate: prefillDate || null })
                }
                onEditTrade={(trade) =>
                  setTradeSheetState({ open: true, existing: trade, prefillDate: null })
                }
                onDeleteTrade={handleDeleteTrade}
              />
            )}

            {activeTab === "community" && (
              <CommunityScreen
                posts={posts}
                likedPostIds={likedPostIds}
                loading={false}
                isAdmin={isAdmin}
                onToggleLike={handleToggleLike}
                onCreatePost={handleCreatePost}
                onDeletePost={handleDeletePost}
              />
            )}

            {activeTab === "store" && (
              <StoreScreen
                plans={plans}
                products={products}
                orders={orders}
                unlockedProducts={unlockedProducts}
                adminSettings={adminSettings}
                loading={false}
                onSubmitOrder={handleSubmitOrder}
              />
            )}

            {activeTab === "news" && (
              <NewsScreen
                events={newsEvents}
                loading={newsLoading}
                alertsEnabled={alertsEnabled}
                onToggleAlerts={() => {
                  if (!alertsEnabled && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission().catch(() => {});
                  }
                  setAlertsEnabled((v) => !v);
                }}
                onRefresh={refreshNews}
              />
            )}
          </main>

          {/* 5-Tab Glass Bottom Navigation */}
          <nav
            aria-label="Primary Navigation"
            style={{
              position: "fixed",
              bottom: "calc(10px + env(safe-area-inset-bottom))",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 24px)",
              maxWidth: "420px",
              backgroundColor: "rgba(13, 13, 16, 0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid #23232A",
              borderRadius: "22px",
              padding: "6px",
              display: "flex",
              justifyContent: "space-between",
              gap: "4px",
              boxShadow: "0 16px 36px rgba(0, 0, 0, 0.72)",
              zIndex: 70
            }}
          >
            {NAV_TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className="touch-target"
                  style={{
                    flex: active ? 1.45 : 1,
                    minHeight: "44px",
                    border: "none",
                    borderRadius: "16px",
                    padding: "8px 6px",
                    backgroundColor: active ? "#E11D2E" : "transparent",
                    color: active ? "#FFFFFF" : "#8B8B95",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.18s ease"
                  }}
                >
                  <Icon size={17} strokeWidth={1.75} />
                  {active && <span>{label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Modals */}
          {tradeSheetState.open && (
            <TradeFormSheet
              existingTrade={tradeSheetState.existing}
              prefillDate={tradeSheetState.prefillDate}
              customTags={customTags}
              onSave={handleSaveTrade}
              onClose={() => setTradeSheetState({ open: false, existing: null, prefillDate: null })}
            />
          )}

          {showProfileModal && (
            <ProfileModal
              user={user}
              profile={profile}
              isOnboarding={Boolean(profile && !profile.profileCompleted && !isAdmin)}
              onSave={handleSaveProfile}
              onSignOut={() => {
                setShowProfileModal(false);
                if (auth) signOut(auth);
              }}
              onClose={() => setShowProfileModal(false)}
            />
          )}

          {isAdmin && showAdminModal && (
            <AdminDeskModal
              users={allUsers}
              orders={allOrders}
              plans={plans}
              adminSettings={adminSettings}
              onApproveOrder={handleApproveOrder}
              onRejectOrder={handleRejectOrder}
              onToggleUserBlock={handleToggleUserBlock}
              onSavePlan={handleSavePlan}
              onDeletePlan={handleDeletePlan}
              onSavePaymentSettings={handleSavePaymentSettings}
              onClose={() => setShowAdminModal(false)}
            />
          )}
        </div>
      )}
    </ErrorBoundary>
  );
}
