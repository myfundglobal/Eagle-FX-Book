import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
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
  Moon,
  Shield,
  ShoppingBag,
  Sun,
  User,
  WifiOff
} from "lucide-react";
import { auth, db, isAdminUser, isFirebaseConfigured } from "./firebase.js";
import { fetchLiveEconomicCalendar } from "./utils/formatters.js";
import {
  getPlanStatus,
  getPrivacyDisplayName,
  timestampToMillis
} from "./utils/subscription.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import TopLoadingBar from "./components/TopLoadingBar.jsx";
import UpdatePopup from "./components/UpdatePopup.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import LiveClock from "./components/LiveClock.jsx";
import LockedFeatureCard from "./components/LockedFeatureCard.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import DashboardScreen from "./components/DashboardScreen.jsx";
import JournalScreen from "./components/JournalScreen.jsx";
import TradeFormSheet from "./components/TradeFormSheet.jsx";
import CommunityScreen from "./components/CommunityScreen.jsx";
import StoreScreen from "./components/StoreScreen.jsx";
import NewsScreen from "./components/NewsScreen.jsx";
import AdminDeskModal from "./components/AdminDeskModal.jsx";

const BASE_NAV_TABS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "journal", label: "Journal", Icon: BookOpen },
  { id: "community", label: "Community", Icon: MessageSquare },
  { id: "store", label: "Store", Icon: ShoppingBag },
  { id: "news", label: "News", Icon: CalendarClock }
];

const THEME_STORAGE_KEY = "eagle_fx_theme";
const TZ_STORAGE_KEY = "eagle_fx_tz";
const CLOCK_24H_STORAGE_KEY = "eagle_fx_24h";
const CHAT_LAST_READ_KEY = "eagle_fx_chat_last_read";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore storage errors
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches) {
    return "light";
  }
  return "dark";
}

function sanitizeChatText(raw) {
  return String(raw || "")
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 500);
}

export default function App() {
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [splashDone, setSplashDone] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [communitySubTab, setCommunitySubTab] = useState("posts");
  const [routeBusy, setRouteBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Day/Night Theme + Timezone
  const [theme, setTheme] = useState(getInitialTheme);
  const [timeZone, setTimeZone] = useState(() => {
    try {
      return localStorage.getItem(TZ_STORAGE_KEY) || "local";
    } catch {
      return "local";
    }
  });
  const [use24h, setUse24h] = useState(() => {
    try {
      return localStorage.getItem(CLOCK_24H_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [planClockNow, setPlanClockNow] = useState(() => Date.now());

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

  // Live Chat & Reports
  const [chatLimit, setChatLimit] = useState(50);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasMoreChat, setHasMoreChat] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [reports, setReports] = useState([]);
  const [lastChatReadMs, setLastChatReadMs] = useState(() => {
    try {
      return Number(localStorage.getItem(CHAT_LAST_READ_KEY)) || Date.now();
    } catch {
      return Date.now();
    }
  });

  // Economic Calendar & Actual Overrides
  const [newsEvents, setNewsEvents] = useState([]);
  const [calendarMeta, setCalendarMeta] = useState({
    isCached: false,
    isFallback: false,
    lastUpdated: null,
    error: null
  });
  const [actualOverrides, setActualOverrides] = useState({});
  const [newsLoading, setNewsLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const notifiedEventsRef = useRef(new Set());

  const isAdmin = isAdminUser(user);
  const planInfo = useMemo(
    () => getPlanStatus(profile, isAdmin, planClockNow),
    [profile, isAdmin, planClockNow]
  );
  const isBlocked = !isAdmin && profile?.accessStatus && profile.accessStatus !== "Active";
  const hasAccess = Boolean(user) && !isBlocked && (isAdmin || planInfo.isActive);

  // Sync theme attribute and meta theme-color
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#F6F6F8" : "#050505");
    }
  }, [theme]);

  // Periodically check plan expiry so expired accounts lock automatically
  useEffect(() => {
    const id = window.setInterval(() => setPlanClockNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  // Redirect away from hidden Community tab if user has no active plan
  useEffect(() => {
    if (user && !hasAccess && activeTab === "community") {
      setActiveTab("store");
    }
  }, [user, hasAccess, activeTab]);

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
      if (!u) {
        setProfile(null);
        setTrades([]);
        setPosts([]);
        setChatMessages([]);
        setPinnedMessage(null);
        setReports([]);
        setAllUsers([]);
        setAllOrders([]);
        return;
      }
      if (u && db) {
        const userRef = doc(db, "users", u.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const cleanName =
              (u.displayName || u.email?.split("@")[0] || "Trader").trim().slice(0, 80) || "Trader";
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
  const refreshNews = useCallback(async () => {
    setNewsLoading(true);
    const result = await fetchLiveEconomicCalendar();
    setNewsEvents(result.events || []);
    setCalendarMeta({
      isCached: Boolean(result.isCached),
      isFallback: Boolean(result.isFallback),
      lastUpdated: result.lastUpdated || null,
      error: result.error || null
    });
    setNewsLoading(false);
  }, []);

  useEffect(() => {
    refreshNews();
  }, [refreshNews]);

  // Base Firestore subscriptions available to any signed-in user (Profile, Store, Orders, Admin data)
  useEffect(() => {
    if (!user || !db) return;

    const unsubs = [];

    unsubs.push(
      onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          setProfile(snap.data());
        }
      })
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
      unsubs.push(
        onSnapshot(
          query(collection(db, "reports"), orderBy("createdAt", "desc")),
          (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          () => setReports([])
        )
      );
    }

    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  // Subscriber-only Firestore subscriptions (Trades, Community Posts, Live Chat, Calendar Actuals)
  useEffect(() => {
    if (!user || !db || !hasAccess) {
      setTrades([]);
      setTradesLoading(false);
      setPosts([]);
      setChatMessages([]);
      setHasMoreChat(false);
      setPinnedMessage(null);
      setActualOverrides({});
      return;
    }

    setTradesLoading(true);
    const unsubs = [];

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
        (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setPosts([])
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "chat_messages"), orderBy("createdAt", "desc"), limit(chatLimit)),
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setHasMoreChat(docs.length >= chatLimit);
          setChatMessages(docs.reverse());
        },
        () => setChatMessages([])
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, "admin_settings", "chat_pin"),
        (snap) => setPinnedMessage(snap.exists() ? snap.data() : null),
        () => setPinnedMessage(null)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "news_calendar"),
        (snap) => {
          const map = {};
          snap.docs.forEach((d) => {
            map[d.id] = d.data();
          });
          setActualOverrides(map);
        },
        () => setActualOverrides({})
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [user, hasAccess, chatLimit]);

  // Post likes sync (subscribers only)
  useEffect(() => {
    if (!user || !db || !hasAccess || posts.length === 0) {
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
  }, [posts, user, hasAccess]);

  // 20-Minute High-Impact Notification Scheduler
  useEffect(() => {
    if (!hasAccess || !alertsEnabled || newsEvents.length === 0) return;

    const checkAlerts = () => {
      const now = Date.now();
      for (const evt of newsEvents) {
        if (evt.impact !== "High") continue;
        const diff = evt.timestampMillis - now;
        if (diff > 0 && diff <= 20 * 60 * 1000 && !notifiedEventsRef.current.has(evt.id)) {
          notifiedEventsRef.current.add(evt.id);
          if ("Notification" in window && Notification.permission === "granted") {
            const mins = Math.max(1, Math.ceil(diff / 60000));
            try {
              new Notification(`High Impact in ${mins}m: ${evt.currency}`, {
                body: evt.event
              });
            } catch {
              // ignore notification runtime errors on unsupported browsers
            }
          }
        }
      }
    };

    checkAlerts();
    const id = window.setInterval(checkAlerts, 30000);
    return () => window.clearInterval(id);
  }, [hasAccess, alertsEnabled, newsEvents]);

  const switchTab = (tabId) => {
    setRouteBusy(true);
    setActiveTab(tabId);
    window.setTimeout(() => setRouteBusy(false), 260);
  };

  const handleToggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const handleChangeTimeZone = (nextTz) => {
    setTimeZone(nextTz);
    try {
      localStorage.setItem(TZ_STORAGE_KEY, nextTz);
    } catch {
      // ignore
    }
  };

  const handleToggle24h = () => {
    setUse24h((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLOCK_24H_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const markChatRead = useCallback(() => {
    const now = Date.now();
    setLastChatReadMs(now);
    try {
      localStorage.setItem(CHAT_LAST_READ_KEY, String(now));
    } catch {
      // ignore
    }
  }, []);

  const unreadChatCount = useMemo(() => {
    if (!hasAccess || !user) return 0;
    if (activeTab === "community" && communitySubTab === "chat") return 0;
    return chatMessages.filter((m) => {
      if (m.senderUid === user.uid) return false;
      const ms = timestampToMillis(m.createdAt);
      return ms ? ms > lastChatReadMs : false;
    }).length;
  }, [hasAccess, user, activeTab, communitySubTab, chatMessages, lastChatReadMs]);

  const nextCatalyst = useMemo(() => {
    const now = Date.now();
    return newsEvents.find((e) => e.impact === "High" && e.timestampMillis > now) || null;
  }, [newsEvents]);

  const visibleNavTabs = useMemo(() => {
    return hasAccess ? BASE_NAV_TABS : BASE_NAV_TABS.filter((t) => t.id !== "community");
  }, [hasAccess]);

  // Trade Handlers
  const handleSaveTrade = async (payload) => {
    if (!user || !db || !hasAccess) {
      throw new Error("Active subscription required to log trades.");
    }
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
    if (!user || !db || !hasAccess) return;
    await deleteDoc(doc(db, "users", user.uid, "trades", tradeId));
  };

  const handleAddCustomTag = (tag) => {
    const next = [...new Set([...customTags, tag])];
    setCustomTags(next);
    localStorage.setItem("eagle_fx_custom_tags", JSON.stringify(next));
  };

  // Profile Handler
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
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        role: "User",
        accessStatus: "Active",
        subscriptionStatus: "None",
        activePlanName: "Free Tier",
        name: fullName,
        email: (user.email || "trader@eaglefxbook.app").trim().slice(0, 150),
        createdAt: serverTimestamp()
      });
    }

    await setDoc(userRef, profileFields, { merge: true });
    setShowProfileModal(false);
  };

  // Community Posts & Live Chat Handlers
  const handleToggleLike = async (post) => {
    if (!user || !db || !hasAccess) return;
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
    if (!user || !db || !isAdmin) return;
    await addDoc(collection(db, "community_posts"), {
      title: String(payload.title || "").trim().slice(0, 120),
      pairTag: String(payload.pairTag || "FX").trim().slice(0, 24),
      bias: ["Bullish", "Bearish", "Neutral"].includes(payload.bias) ? payload.bias : "Neutral",
      adminMessage: String(payload.adminMessage || "").trim().slice(0, 2000),
      chartImageKey: String(payload.chartImageKey || "").slice(0, 340000),
      authorId: user.uid,
      authorName: getPrivacyDisplayName(profile, user).slice(0, 80),
      dateLabel: new Date().toLocaleDateString([], { month: "short", day: "numeric" }).slice(0, 40),
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleDeletePost = async (postId) => {
    if (!db || !isAdmin) return;
    await deleteDoc(doc(db, "community_posts", postId));
  };

  const handleSendChatMessage = async (rawText) => {
    if (!user || !db || !hasAccess) {
      throw new Error("Active subscription required to join Live Chat.");
    }
    if (profile?.chatMuted && !isAdmin) {
      throw new Error("You are muted from posting in Live Chat.");
    }
    const cleanText = sanitizeChatText(rawText);
    if (!cleanText || cleanText.length > 500) {
      throw new Error("Message must be between 1 and 500 characters.");
    }
    const displayName = isAdmin
      ? "Eagle FX Admin"
      : getPrivacyDisplayName(profile, user).slice(0, 80);
    const photo = String(
      profile?.profilePictureBase64 || profile?.photoURL || profile?.photo || ""
    ).slice(0, 340000);

    await addDoc(collection(db, "chat_messages"), {
      senderUid: user.uid,
      senderName: displayName,
      senderPhoto: photo,
      senderIsAdmin: Boolean(isAdmin),
      text: cleanText,
      createdAt: serverTimestamp()
    });
    markChatRead();
  };

  const handleDeleteChatMessage = async (msgId) => {
    if (!db || !user || !hasAccess) return;
    await deleteDoc(doc(db, "chat_messages", msgId));
  };

  const handlePinChatMessage = async (msg) => {
    if (!db || !user || !isAdmin) return;
    await setDoc(doc(db, "admin_settings", "chat_pin"), {
      messageId: msg.id,
      senderName: String(msg.senderName || "Trader").slice(0, 80),
      text: String(msg.text || "").slice(0, 500),
      updatedBy: user.uid,
      updatedAt: serverTimestamp()
    });
  };

  const handleUnpinChatMessage = async () => {
    if (!db || !isAdmin) return;
    await deleteDoc(doc(db, "admin_settings", "chat_pin"));
  };

  const handleMuteChatUser = async (targetUid) => {
    if (!db || !isAdmin || !targetUid) return;
    await updateDoc(doc(db, "users", targetUid), {
      chatMuted: true,
      updatedAt: serverTimestamp()
    });
  };

  const handleToggleChatMute = async (targetUser) => {
    if (!db || !isAdmin) return;
    await updateDoc(doc(db, "users", targetUser.id), {
      chatMuted: !(targetUser.chatMuted === true),
      updatedAt: serverTimestamp()
    });
  };

  const handleReportChatMessage = async (msg) => {
    if (!db || !user || !hasAccess) return;
    await addDoc(collection(db, "reports"), {
      messageId: String(msg.id || "").slice(0, 128),
      reportedUid: String(msg.senderUid || "").slice(0, 128),
      reportedName: String(msg.senderName || "Trader").slice(0, 80),
      messageText: String(msg.text || "").slice(0, 500),
      reporterUid: user.uid,
      createdAt: serverTimestamp()
    });
  };

  const handleDeleteReport = async (reportId) => {
    if (!db || !isAdmin) return;
    await deleteDoc(doc(db, "reports", reportId));
  };

  // News Admin Actual Override Handler
  const handleSaveActualOverride = async (evt, actualVal) => {
    if (!db || !user || !isAdmin || !evt?.id) return;
    await setDoc(
      doc(db, "news_calendar", evt.id),
      {
        eventId: evt.id,
        currency: String(evt.currency || "USD").slice(0, 12),
        event: String(evt.event || "Release").slice(0, 160),
        actual: String(actualVal || "").trim().slice(0, 40),
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  // Store & Admin Order Handlers
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
    if (!db || !isAdmin) return;
    await updateDoc(doc(db, "orders", order.id), {
      status: "Approved",
      adminNote: "Payment verified & unlocked",
      updatedAt: serverTimestamp()
    });
    if (order.itemType === "Plan") {
      const rawDays = Number(order.durationDays) || 30;
      const isLifetime = rawDays >= 3650;
      const days = rawDays >= 365 && rawDays < 3650 ? 365 : Math.max(1, rawDays);
      const expiryMs = Date.now() + days * 86400000;
      await updateDoc(doc(db, "users", order.userId), {
        activePlanName: order.productName,
        subscriptionStatus: "Active",
        planStartedAt: serverTimestamp(),
        planExpiresAt: isLifetime ? null : Timestamp.fromMillis(expiryMs),
        subscriptionExpiresAtMillis: isLifetime ? 0 : expiryMs,
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
    if (!db || !isAdmin) return;
    await updateDoc(doc(db, "orders", order.id), {
      status: "Rejected",
      adminNote: "Transaction could not be verified",
      updatedAt: serverTimestamp()
    });
  };

  const handleToggleUserBlock = async (targetUser) => {
    if (!db || !isAdmin) return;
    const nextStatus = targetUser.accessStatus === "Blocked" ? "Active" : "Blocked";
    await updateDoc(doc(db, "users", targetUser.id), {
      accessStatus: nextStatus,
      updatedAt: serverTimestamp()
    });
  };

  const handleSavePlan = async (plan) => {
    if (!db || !isAdmin) return;
    await addDoc(collection(db, "subscription_plans"), {
      ...plan,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleDeletePlan = async (planId) => {
    if (!db || !isAdmin) return;
    await deleteDoc(doc(db, "subscription_plans", planId));
  };

  const handleSavePaymentSettings = async (settings) => {
    if (!user || !db || !isAdmin) return;
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
            backgroundColor: "var(--primary-deep)",
            color: "#FFFFFF",
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
              padding: "6px 0 10px 0"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <img
                src="logo.png"
                alt="Eagle FX Book"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "1px solid rgba(225, 29, 46, 0.45)",
                  objectFit: "cover",
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    letterSpacing: "1.1px",
                    color: "var(--text)"
                  }}
                >
                  EAGLE FX BOOK
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: hasAccess ? "var(--muted)" : "var(--warning)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {isAdmin ? "Desk Admin" : planInfo.isActive ? planInfo.planName : "Subscription Required"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
              {/* Day/Night Mode Toggle */}
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Day mode" : "Night mode"}
                className="btn-surface"
                style={{
                  width: "36px",
                  minHeight: "36px",
                  padding: 0,
                  borderRadius: "10px"
                }}
              >
                {theme === "dark" ? (
                  <Sun size={16} strokeWidth={1.85} color="var(--warning)" />
                ) : (
                  <Moon size={16} strokeWidth={1.85} color="var(--primary)" />
                )}
              </button>

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
                    color: "var(--primary)",
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
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1.5px solid var(--primary)",
                  backgroundColor: "var(--surface-2)",
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
                  <User size={18} strokeWidth={1.75} color="var(--text)" />
                )}
              </button>
            </div>
          </header>

          {/* Live Header Clock (isolated timer so App does not re-render every second) */}
          <LiveClock timeZone={timeZone} use24h={use24h} />

          {/* Main Tab Content */}
          <main style={{ flex: 1 }}>
            {activeTab === "home" && (
              hasAccess ? (
                <DashboardScreen
                  trades={trades}
                  loading={tradesLoading}
                  nextCatalyst={nextCatalyst}
                  planInfo={planInfo}
                  onAddTrade={() =>
                    setTradeSheetState({ open: true, existing: null, prefillDate: null })
                  }
                  onViewAllJournal={() => switchTab("journal")}
                  onOpenNews={() => switchTab("news")}
                  onOpenStore={() => switchTab("store")}
                />
              ) : (
                <LockedFeatureCard planInfo={planInfo} onViewPlans={() => switchTab("store")} />
              )
            )}

            {activeTab === "journal" && (
              hasAccess ? (
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
              ) : (
                <LockedFeatureCard planInfo={planInfo} onViewPlans={() => switchTab("store")} />
              )
            )}

            {activeTab === "community" && (
              hasAccess ? (
                <CommunityScreen
                  subTab={communitySubTab}
                  onChangeSubTab={setCommunitySubTab}
                  posts={posts}
                  likedPostIds={likedPostIds}
                  loading={false}
                  isAdmin={isAdmin}
                  currentUserId={user.uid}
                  isChatMuted={profile?.chatMuted === true}
                  chatMessages={chatMessages}
                  hasMoreChat={hasMoreChat}
                  pinnedMessage={pinnedMessage}
                  unreadChatCount={unreadChatCount}
                  onToggleLike={handleToggleLike}
                  onCreatePost={handleCreatePost}
                  onDeletePost={handleDeletePost}
                  onSendChatMessage={handleSendChatMessage}
                  onDeleteChatMessage={handleDeleteChatMessage}
                  onLoadOlderChat={() => setChatLimit((n) => n + 50)}
                  onPinChatMessage={handlePinChatMessage}
                  onUnpinChatMessage={handleUnpinChatMessage}
                  onMuteChatUser={handleMuteChatUser}
                  onReportChatMessage={handleReportChatMessage}
                  onMarkChatRead={markChatRead}
                />
              ) : (
                <LockedFeatureCard planInfo={planInfo} onViewPlans={() => switchTab("store")} />
              )
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
              hasAccess ? (
                <NewsScreen
                  events={newsEvents}
                  actualOverrides={actualOverrides}
                  calendarMeta={calendarMeta}
                  loading={newsLoading}
                  alertsEnabled={alertsEnabled}
                  isAdmin={isAdmin}
                  timeZone={timeZone}
                  use24h={use24h}
                  onChangeTimeZone={handleChangeTimeZone}
                  onToggle24h={handleToggle24h}
                  onToggleAlerts={() => {
                    if (!alertsEnabled && "Notification" in window && Notification.permission === "default") {
                      Notification.requestPermission().catch(() => {});
                    }
                    setAlertsEnabled((v) => !v);
                  }}
                  onSaveActualOverride={handleSaveActualOverride}
                  onRefresh={refreshNews}
                />
              ) : (
                <LockedFeatureCard planInfo={planInfo} onViewPlans={() => switchTab("store")} />
              )
            )}
          </main>

          {/* Bottom Glass Navigation */}
          <nav
            aria-label="Primary Navigation"
            style={{
              position: "fixed",
              bottom: "calc(10px + env(safe-area-inset-bottom))",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 24px)",
              maxWidth: "420px",
              backgroundColor: "var(--nav-bg)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border)",
              borderRadius: "22px",
              padding: "6px",
              display: "flex",
              justifyContent: "space-between",
              gap: "4px",
              boxShadow: "var(--nav-shadow)",
              zIndex: 70
            }}
          >
            {visibleNavTabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              const badgeCount = id === "community" ? unreadChatCount : 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className="touch-target"
                  style={{
                    position: "relative",
                    flex: active ? 1.45 : 1,
                    minHeight: "44px",
                    border: "none",
                    borderRadius: "16px",
                    padding: "8px 6px",
                    backgroundColor: active ? "var(--primary)" : "transparent",
                    color: active ? "#FFFFFF" : "var(--muted)",
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
                  {badgeCount > 0 && !active && (
                    <span
                      className="font-mono-num"
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "8px",
                        minWidth: "16px",
                        height: "16px",
                        padding: "0 4px",
                        borderRadius: "999px",
                        backgroundColor: "var(--primary)",
                        color: "#FFFFFF",
                        fontSize: "9px",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Modals */}
          {hasAccess && tradeSheetState.open && (
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
              planInfo={planInfo}
              isOnboarding={Boolean(profile && !profile.profileCompleted && !isAdmin)}
              onSave={handleSaveProfile}
              onOpenStore={() => {
                setShowProfileModal(false);
                switchTab("store");
              }}
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
              newsEvents={newsEvents}
              actualOverrides={actualOverrides}
              reports={reports}
              adminSettings={adminSettings}
              onApproveOrder={handleApproveOrder}
              onRejectOrder={handleRejectOrder}
              onToggleUserBlock={handleToggleUserBlock}
              onToggleChatMute={handleToggleChatMute}
              onSavePlan={handleSavePlan}
              onDeletePlan={handleDeletePlan}
              onSaveActualOverride={handleSaveActualOverride}
              onDeleteReport={handleDeleteReport}
              onSavePaymentSettings={handleSavePaymentSettings}
              onClose={() => setShowAdminModal(false)}
            />
          )}
        </div>
      )}
    </ErrorBoundary>
  );
}
