const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");
const rtuPath = require.resolve("@firebase/rules-unit-testing");
const firebaseCompat = require(require.resolve("firebase/compat/app", { paths: [rtuPath] }));
require(require.resolve("firebase/compat/firestore", { paths: [rtuPath] }));
const { FieldValue } = firebaseCompat.firestore;

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_trader_1";
const BOB_UID = "bob_trader_2";
const ADMIN_UID = "admin_myfund_1";
const ADMIN_EMAIL = "myfundglobal@gmail.com";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function pastTs(ms = 1000) {
  return new Date(Date.now() - ms);
}

function futureTs(ms = 30 * 86400000) {
  return new Date(Date.now() + ms);
}

function makeUserDoc(uid, name, email, role = "User", accessStatus = "Active") {
  return {
    userId: uid,
    name,
    firstName: name.split(" ")[0] || name,
    surname: name.split(" ")[1] || "Trader",
    countryCode: "+91",
    phoneNumber: "9876543210",
    email,
    profilePictureBase64: "",
    role,
    accessStatus,
    activePlanName: "Free Tier",
    subscriptionStatus: "None",
    subscriptionExpiresAtMillis: 0,
    profileCompleted: true,
    createdAt: pastTs(),
    updatedAt: pastTs(),
  };
}

function makeTradeDoc(uid, notes = "London session sweep") {
  return {
    userId: uid,
    date: "2026-11-15",
    monthKey: "2026-11",
    pair: "XAU/USD",
    side: "Buy",
    lotSize: 0.5,
    entryPrice: 2650.0,
    exitPrice: 2665.0,
    stopLoss: 2642.0,
    takeProfit: 2666.0,
    riskReward: 2.0,
    strategyTags: ["SMC", "Liquidity"],
    pnl: 750.0,
    notes,
    screenshotBase64: "",
    createdAt: pastTs(),
    updatedAt: pastTs(),
  };
}

async function activatePlanFor(uid, expiresAt = futureTs()) {
  const admDb = adminCtx().firestore();
  await assertSucceeds(
    admDb.collection("users").doc(uid).update({
      subscriptionStatus: "Active",
      activePlanName: expiresAt === null ? "Lifetime Access" : "Pro 30 Days",
      planStartedAt: pastTs(),
      planExpiresAt: expiresAt,
      updatedAt: pastTs(),
    })
  );
}

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

function adminCtx() {
  return testEnv.authenticatedContext(ADMIN_UID, {
    email: ADMIN_EMAIL,
    email_verified: true,
  });
}

test("Unauthenticated user cannot read or list any protected collection", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("products").get());
  await assertFails(unauthDb.collection("subscription_plans").get());
  await assertFails(unauthDb.collection("news_calendar").get());
  await assertFails(unauthDb.collection("community_posts").get());
  await assertFails(unauthDb.collection("chat_messages").get());
  await assertFails(unauthDb.collection("reports").get());
  await assertFails(unauthDb.collection("orders").get());
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).collection("trades").get());
});

test("User cannot self-assign Admin role, spoof email, or self-upgrade subscription", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, {
    email: "alice@example.com",
    email_verified: true,
  }).firestore();

  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).set(makeUserDoc(ALICE_UID, "Alice", "alice@example.com", "Admin"))
  );

  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).set({
      ...makeUserDoc(ALICE_UID, "Alice", "alice@example.com", "User"),
      subscriptionStatus: "Active",
    })
  );

  const spoofDb = testEnv.authenticatedContext("spoof_uid", {
    email: ADMIN_EMAIL,
    email_verified: false,
  }).firestore();

  await assertFails(
    spoofDb.collection("subscription_plans").doc("plan_spoof").set({
      name: "Spoof VIP",
      durationLabel: "Lifetime",
      durationDays: 36500,
      priceUsd: 299,
      priceInr: 24999,
      features: ["All"],
      badgeText: "VIP",
      isActive: true,
      createdAt: pastTs(),
      updatedAt: pastTs(),
    })
  );
});

test("Plan enforcement: user without plan or with expired plan gets permission-denied on trades, community, and chat", async () => {
  const admDb = adminCtx().firestore();
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, {
    email: "alice@example.com",
    email_verified: true,
  }).firestore();

  // Create Alice (no plan)
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(makeUserDoc(ALICE_UID, "Alice Trader", "alice@example.com"))
  );

  // Admin creates plan & post
  await assertSucceeds(
    admDb.collection("subscription_plans").doc("plan_30d").set({
      name: "Pro 30 Days",
      durationLabel: "30 Days",
      durationDays: 30,
      priceUsd: 29.0,
      priceInr: 2499.0,
      features: ["All features"],
      badgeText: "PRO",
      isActive: true,
      createdAt: pastTs(),
      updatedAt: pastTs(),
    })
  );
  await assertSucceeds(
    admDb.collection("community_posts").doc("post_1").set({
      authorId: ADMIN_UID,
      authorName: "Eagle Desk",
      dateLabel: "Nov 15, 2026",
      title: "XAU/USD Liquidity Setup",
      adminMessage: "Watching 2645 zone.",
      pairTag: "XAU/USD",
      bias: "Bullish",
      chartImageKey: "",
      likesCount: 0,
      createdAt: pastTs(),
      updatedAt: pastTs(),
    })
  );

  // Without plan: Alice CANNOT create trades, read/like community, or read/write chat
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_noplan").set(makeTradeDoc(ALICE_UID))
  );
  await assertFails(aliceDb.collection("community_posts").get());
  await assertFails(aliceDb.collection("chat_messages").get());
  await assertFails(
    aliceDb.collection("chat_messages").doc("msg_noplan").set({
      senderUid: ALICE_UID,
      senderName: "Alice T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Hello",
      createdAt: FieldValue.serverTimestamp(),
    })
  );

  // Without plan: Alice CAN read own profile, read plans, create order, and read own orders
  await assertSucceeds(aliceDb.collection("users").doc(ALICE_UID).get());
  await assertSucceeds(aliceDb.collection("subscription_plans").get());
  await assertSucceeds(
    aliceDb.collection("orders").doc("ord_1").set({
      userId: ALICE_UID,
      userEmail: "alice@example.com",
      userName: "Alice Trader",
      productId: "plan_30d",
      productName: "Pro 30 Days",
      itemType: "Plan",
      durationDays: 30,
      amountLabel: "$29 / ₹2499",
      paymentMethod: "UPI",
      transactionId: "UTR123456",
      paymentScreenshotBase64: "",
      status: "Pending",
      adminNote: "",
      createdAt: pastTs(),
      updatedAt: pastTs(),
    })
  );
  await assertSucceeds(aliceDb.collection("orders").where("userId", "==", ALICE_UID).get());

  // Expired plan -> still denied on trades, community, and chat
  await activatePlanFor(ALICE_UID, pastTs(60000));
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_expired").set(makeTradeDoc(ALICE_UID))
  );
  await assertFails(aliceDb.collection("community_posts").get());
  await assertFails(aliceDb.collection("chat_messages").get());
});

test("Active subscriber succeeds on trades, community likes, live chat, reports; blocked & muted enforced", async () => {
  const admDb = adminCtx().firestore();
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, {
    email: "alice@example.com",
    email_verified: true,
  }).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID, {
    email: "bob@example.com",
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(makeUserDoc(ALICE_UID, "Alice Trader", "alice@example.com"))
  );
  await assertSucceeds(
    bobDb.collection("users").doc(BOB_UID).set(makeUserDoc(BOB_UID, "Bob Trader", "bob@example.com"))
  );

  await assertSucceeds(
    admDb.collection("community_posts").doc("post_1").set({
      authorId: ADMIN_UID,
      authorName: "Eagle Desk",
      dateLabel: "Nov 15",
      title: "EUR/USD NY Open",
      adminMessage: "Watching sweep low.",
      pairTag: "EUR/USD",
      bias: "Bullish",
      chartImageKey: "",
      likesCount: 0,
      createdAt: pastTs(),
      updatedAt: pastTs(),
    })
  );

  // Activate Alice (30-day) and Bob (Lifetime: planExpiresAt = null)
  await activatePlanFor(ALICE_UID, futureTs());
  await activatePlanFor(BOB_UID, null);

  // Alice can create/update trades; Bob cannot read Alice's trades
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_1").set(makeTradeDoc(ALICE_UID))
  );
  await assertFails(bobDb.collection("users").doc(ALICE_UID).collection("trades").get());

  // Alice can read & atomically like community post
  await assertSucceeds(aliceDb.collection("community_posts").get());
  const batchLike = aliceDb.batch();
  batchLike.set(aliceDb.collection("community_posts").doc("post_1").collection("likes").doc(ALICE_UID), {
    userId: ALICE_UID,
    createdAt: pastTs(),
  });
  batchLike.update(aliceDb.collection("community_posts").doc("post_1"), {
    likesCount: 1,
    updatedAt: pastTs(),
  });
  await assertSucceeds(batchLike.commit());

  // Live Chat: active users read & write with serverTimestamp, length 1..500, own uid
  await assertSucceeds(
    aliceDb.collection("chat_messages").doc("msg_1").set({
      senderUid: ALICE_UID,
      senderName: "Alice T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Good London session setups today!",
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  await assertSucceeds(bobDb.collection("chat_messages").get());

  // Spoofed senderUid, empty text, >500 chars, non-server createdAt, spoofed admin badge fail
  await assertFails(
    aliceDb.collection("chat_messages").doc("msg_spoof").set({
      senderUid: BOB_UID,
      senderName: "Bob",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Spoof",
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  await assertFails(
    aliceDb.collection("chat_messages").doc("msg_long").set({
      senderUid: ALICE_UID,
      senderName: "Alice T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "A".repeat(501),
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  await assertFails(
    aliceDb.collection("chat_messages").doc("msg_badts").set({
      senderUid: ALICE_UID,
      senderName: "Alice T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Backdated",
      createdAt: pastTs(50000),
    })
  );
  await assertFails(
    aliceDb.collection("chat_messages").doc("msg_fakeadm").set({
      senderUid: ALICE_UID,
      senderName: "Alice T.",
      senderPhoto: "",
      senderIsAdmin: true,
      text: "Fake admin",
      createdAt: FieldValue.serverTimestamp(),
    })
  );

  // User cannot delete someone else's chat message; can delete own
  await assertFails(bobDb.collection("chat_messages").doc("msg_1").delete());
  await assertSucceeds(aliceDb.collection("chat_messages").doc("msg_1").delete());

  // Bob posts a message, Alice reports it; only Admin can read reports
  await assertSucceeds(
    bobDb.collection("chat_messages").doc("msg_bob").set({
      senderUid: BOB_UID,
      senderName: "Bob T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Check this level",
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  await assertSucceeds(
    aliceDb.collection("reports").doc("rep_1").set({
      messageId: "msg_bob",
      reportedUid: BOB_UID,
      reportedName: "Bob T.",
      messageText: "Check this level",
      reporterUid: ALICE_UID,
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  await assertFails(aliceDb.collection("reports").get());
  await assertSucceeds(admDb.collection("reports").get());

  // Admin mutes Bob -> Bob cannot post in Live Chat
  await assertSucceeds(
    admDb.collection("users").doc(BOB_UID).update({
      chatMuted: true,
      updatedAt: pastTs(),
    })
  );
  await assertFails(
    bobDb.collection("chat_messages").doc("msg_muted").set({
      senderUid: BOB_UID,
      senderName: "Bob T.",
      senderPhoto: "",
      senderIsAdmin: false,
      text: "Still muted?",
      createdAt: FieldValue.serverTimestamp(),
    })
  );

  // Admin pins msg_bob & sets live actual on news_calendar
  await assertSucceeds(
    admDb.collection("admin_settings").doc("chat_pin").set({
      messageId: "msg_bob",
      senderName: "Bob T.",
      text: "Check this level",
      updatedBy: ADMIN_UID,
      updatedAt: pastTs(),
    })
  );
  await assertSucceeds(aliceDb.collection("admin_settings").doc("chat_pin").get());
  await assertSucceeds(
    admDb.collection("news_calendar").doc("USD_2026_11_15_cpi").set({
      eventId: "USD_2026_11_15_cpi",
      currency: "USD",
      event: "CPI m/m",
      actual: "0.3%",
      updatedBy: ADMIN_UID,
      updatedAt: pastTs(),
    })
  );
  await assertFails(
    aliceDb.collection("news_calendar").doc("USD_2026_11_15_cpi").set({
      eventId: "USD_2026_11_15_cpi",
      currency: "USD",
      event: "CPI m/m",
      actual: "9.9%",
      updatedBy: ALICE_UID,
      updatedAt: pastTs(),
    })
  );

  // Blocked user cannot write trades or unblock self
  await assertSucceeds(
    admDb.collection("users").doc(ALICE_UID).update({
      accessStatus: "Blocked",
      updatedAt: pastTs(),
    })
  );
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).update({
      accessStatus: "Active",
      updatedAt: pastTs(),
    })
  );
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_blocked").set(makeTradeDoc(ALICE_UID))
  );
});

test("Trader Profile: owner updating own profile passes (even on 8-field/legacy docs); protected fields & other users fail", async () => {
  const webUid = "web_trader_1";
  const webDb = testEnv.authenticatedContext(webUid, {
    email: "webtrader@example.com",
    email_verified: true,
  }).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID, {
    email: "bob@example.com",
    email_verified: true,
  }).firestore();
  const admDb = adminCtx().firestore();

  await assertSucceeds(
    webDb.collection("users").doc(webUid).set({
      uid: webUid,
      role: "User",
      accessStatus: "Active",
      subscriptionStatus: "None",
      activePlanName: "Free Tier",
      name: "Web Trader",
      email: "webtrader@example.com",
      createdAt: pastTs(),
    })
  );

  await assertSucceeds(
    webDb.collection("users").doc(webUid).set(
      {
        firstName: "Aarav",
        surname: "Sharma",
        name: "Aarav Sharma",
        countryCode: "+91",
        phoneNumber: "9876543210",
        profilePictureBase64: "data:image/jpeg;base64,/9j/4AAQ",
        profileCompleted: true,
        updatedAt: pastTs(),
      },
      { merge: true }
    )
  );

  await assertFails(
    webDb.collection("users").doc(webUid).update({
      phone: "abc-123",
      updatedAt: pastTs(),
    })
  );
  await assertFails(
    webDb.collection("users").doc(webUid).update({
      firstName: "A".repeat(101),
      updatedAt: pastTs(),
    })
  );

  for (const forbidden of [
    { role: "Admin" },
    { subscriptionStatus: "Lifetime" },
    { subscriptionStatus: "Active" },
    { activePlanName: "VIP" },
    { accessStatus: "Blocked" },
    { uid: "hijack" },
    { email: "hijack@example.com" },
    { createdAt: pastTs() },
    { planStartedAt: pastTs() },
    { planExpiresAt: null },
    { chatMuted: true },
  ]) {
    await assertFails(
      webDb.collection("users").doc(webUid).set(
        {
          ...forbidden,
          updatedAt: pastTs(),
        },
        { merge: true }
      )
    );
  }

  await assertFails(
    bobDb.collection("users").doc(webUid).set(
      {
        firstName: "Hacked",
        updatedAt: pastTs(),
      },
      { merge: true }
    )
  );

  const legacyUid = "legacy_trader_1";
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection("users").doc(legacyUid).set({
      uid: legacyUid,
      role: "User",
      name: "Legacy Trader",
      email: "legacy@example.com",
      createdAt: pastTs(),
    });
  });
  const legacyDb = testEnv.authenticatedContext(legacyUid, {
    email: "legacy@example.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(
    legacyDb.collection("users").doc(legacyUid).set(
      {
        firstName: "Legacy",
        surname: "Pro",
        name: "Legacy Pro",
        countryCode: "+91",
        phoneNumber: "9123456789",
        profilePictureBase64: "",
        profileCompleted: true,
        updatedAt: pastTs(),
      },
      { merge: true }
    )
  );

  await assertSucceeds(
    admDb.collection("users").doc(webUid).update({
      subscriptionStatus: "Active",
      activePlanName: "Pro 30 Days",
      planStartedAt: pastTs(),
      planExpiresAt: futureTs(),
      chatMuted: false,
      updatedAt: pastTs(),
    })
  );
});
