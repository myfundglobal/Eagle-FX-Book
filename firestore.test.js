const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_trader_1";
const BOB_UID = "bob_trader_2";
const ADMIN_UID = "admin_myfund_1";
const ADMIN_EMAIL = "myfundglobal@gmail.com";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function serverTs() {
  return new Date(Date.now() - 1000);
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
    createdAt: serverTs(),
    updatedAt: serverTs(),
  };
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
      subscriptionStatus: "Lifetime",
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
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );
});

test("Blocked user is rejected from database-wide writes and profile self-unblock", async () => {
  const admDb = adminCtx().firestore();
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, {
    email: "alice@example.com",
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(makeUserDoc(ALICE_UID, "Alice Trader", "alice@example.com"))
  );

  // Admin blocks Alice
  await assertSucceeds(
    admDb.collection("users").doc(ALICE_UID).update({
      accessStatus: "Blocked",
      updatedAt: serverTs(),
    })
  );

  // Alice cannot unblock herself
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).update({
      accessStatus: "Active",
      updatedAt: serverTs(),
    })
  );

  // Alice cannot write trades while blocked
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_blocked").set({
      userId: ALICE_UID,
      date: "2026-11-14",
      monthKey: "2026-11",
      pair: "XAU/USD",
      side: "Buy",
      lotSize: 0.5,
      entryPrice: 2650.0,
      exitPrice: 2665.0,
      stopLoss: 2642.0,
      takeProfit: 2666.0,
      riskReward: 2.0,
      strategyTags: ["SMC"],
      pnl: 500.0,
      notes: "Blocked test",
      screenshotBase64: "",
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );
});

test("User can manage private trades and update own profile fields while isolated from others", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, {
    email: "alice@example.com",
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(makeUserDoc(ALICE_UID, "Alice Trader", "alice@example.com"))
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).update({
      firstName: "Alice",
      surname: "Mercer",
      name: "Alice Mercer",
      updatedAt: serverTs(),
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("trades").doc("trade_1").set({
      userId: ALICE_UID,
      date: "2026-11-14",
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
      notes: "London session sweep",
      screenshotBase64: "",
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );

  const bobDb = testEnv.authenticatedContext(BOB_UID, {
    email: "bob@example.com",
    email_verified: true,
  }).firestore();

  await assertFails(bobDb.collection("users").doc(ALICE_UID).get());
  await assertFails(bobDb.collection("users").doc(ALICE_UID).collection("trades").get());
});

test("Community posts: only Admin can create; Users can read and atomically like/unlike", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const admDb = adminCtx().firestore();

  await assertFails(
    aliceDb.collection("community_posts").doc("post_bad").set({
      authorId: ALICE_UID,
      authorName: "Alice",
      dateLabel: "Nov 14",
      title: "Unauthorized Setup",
      adminMessage: "Test",
      pairTag: "EUR/USD",
      bias: "Bullish",
      chartImageKey: "",
      likesCount: 0,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );

  await assertSucceeds(
    admDb.collection("community_posts").doc("post_1").set({
      authorId: ADMIN_UID,
      authorName: "Eagle Desk",
      dateLabel: "Nov 14, 2026",
      title: "XAU/USD Liquidity Sweep Setup",
      adminMessage: "Looking for 4H FVG mitigation around 2645.",
      pairTag: "XAU/USD",
      bias: "Bullish",
      chartImageKey: "preset_community_chart",
      likesCount: 0,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );

  const batchLike = aliceDb.batch();
  batchLike.set(aliceDb.collection("community_posts").doc("post_1").collection("likes").doc(ALICE_UID), {
    userId: ALICE_UID,
    createdAt: serverTs(),
  });
  batchLike.update(aliceDb.collection("community_posts").doc("post_1"), {
    likesCount: 1,
    updatedAt: serverTs(),
  });
  await assertSucceeds(batchLike.commit());
});

test("Subscription plans & Store deliverables: Admin manages plans; Orders unlock on Admin approval", async () => {
  const admDb = adminCtx().firestore();
  const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: "alice@test.com", email_verified: true }).firestore();

  await assertSucceeds(
    admDb.collection("subscription_plans").doc("plan_30d").set({
      name: "Eagle FX Book 30 Days",
      durationLabel: "30 Days",
      durationDays: 30,
      priceUsd: 29.0,
      priceInr: 2499.0,
      features: ["Unlimited Trades", "Live News Alerts"],
      badgeText: "PRO",
      isActive: true,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );

  // Non-admin cannot create or delete plans
  await assertFails(
    aliceDb.collection("subscription_plans").doc("plan_30d").delete()
  );

  // Alice submits Pending plan order
  await assertSucceeds(
    aliceDb.collection("orders").doc("ord_plan_1").set({
      userId: ALICE_UID,
      userEmail: "alice@test.com",
      userName: "Alice",
      productId: "plan_30d",
      productName: "Eagle FX Book 30 Days",
      itemType: "Plan",
      durationDays: 30,
      amountLabel: "$29 / ₹2499",
      paymentMethod: "UPI",
      transactionId: "UTR99887766",
      paymentScreenshotBase64: "",
      status: "Pending",
      adminNote: "",
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
  );

  // Alice can read plans
  await assertSucceeds(aliceDb.collection("subscription_plans").get());
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

  // Initial create with exact 8 signup fields (no firstName/surname/phone/countryCode/photo yet)
  await assertSucceeds(
    webDb.collection("users").doc(webUid).set({
      uid: webUid,
      role: "User",
      accessStatus: "Active",
      subscriptionStatus: "None",
      activePlanName: "Free Tier",
      name: "Web Trader",
      email: "webtrader@example.com",
      createdAt: serverTs(),
    })
  );

  // Owner updates own profile using only allowed profile fields via merge
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
        updatedAt: serverTs(),
      },
      { merge: true }
    )
  );

  // Also test phone + photoURL fields directly
  await assertSucceeds(
    webDb.collection("users").doc(webUid).update({
      phone: "9876543210",
      photoURL: "https://example.com/avatar.png",
      updatedAt: serverTs(),
    })
  );

  // Invalid phone (non-digits) or >100 chars name fails
  await assertFails(
    webDb.collection("users").doc(webUid).update({
      phone: "abc-123",
      updatedAt: serverTs(),
    })
  );
  await assertFails(
    webDb.collection("users").doc(webUid).update({
      firstName: "A".repeat(101),
      updatedAt: serverTs(),
    })
  );

  // Owner changing role or subscriptionStatus or protected fields fails
  for (const forbidden of [
    { role: "Admin" },
    { subscriptionStatus: "Lifetime" },
    { subscriptionStatus: "Active" },
    { activePlanName: "VIP" },
    { accessStatus: "Blocked" },
    { uid: "hijack" },
    { email: "hijack@example.com" },
    { createdAt: serverTs() },
    { planStartedAt: serverTs() },
    { planExpiresAt: null },
    { chatMuted: true },
  ]) {
    await assertFails(
      webDb.collection("users").doc(webUid).set(
        {
          ...forbidden,
          updatedAt: serverTs(),
        },
        { merge: true }
      )
    );
  }

  // Another user updating web_trader_1's profile fails
  await assertFails(
    bobDb.collection("users").doc(webUid).set(
      {
        firstName: "Hacked",
        updatedAt: serverTs(),
      },
      { merge: true }
    )
  );

  // Legacy document missing activePlanName & accessStatus also passes owner profile update
  const legacyUid = "legacy_trader_1";
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection("users").doc(legacyUid).set({
      uid: legacyUid,
      role: "User",
      name: "Legacy Trader",
      email: "legacy@example.com",
      createdAt: serverTs(),
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
        updatedAt: serverTs(),
      },
      { merge: true }
    )
  );

  // Admin keeps full access to update user plan/role fields
  await assertSucceeds(
    admDb.collection("users").doc(webUid).update({
      subscriptionStatus: "Active",
      activePlanName: "Pro 30 Days",
      planStartedAt: serverTs(),
      planExpiresAt: new Date(Date.now() + 30 * 86400000),
      chatMuted: false,
      updatedAt: serverTs(),
    })
  );
});
