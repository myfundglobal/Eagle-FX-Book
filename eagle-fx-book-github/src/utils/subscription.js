export function timestampToMillis(val) {
  if (!val) return null;
  if (typeof val === "number") return Number.isFinite(val) && val > 0 ? val : null;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (val instanceof Date) return val.getTime();
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.seconds === "number") return val.seconds * 1000;
  return null;
}

export function getPlanStatus(profile, isAdmin = false, nowMillis = Date.now()) {
  if (isAdmin) {
    return {
      isActive: true,
      isLifetime: true,
      status: "Active",
      planName: "Eagle Desk Admin",
      startDateMillis: null,
      expiryDateMillis: null,
      daysLeft: null,
      totalDays: null,
      progressPct: 100,
      expiryWarning: null
    };
  }

  const subStatus = profile?.subscriptionStatus || "None";
  const planName = profile?.activePlanName || "No active plan";
  const startMs = timestampToMillis(profile?.planStartedAt);

  // Support both web Timestamp planExpiresAt and legacy subscriptionExpiresAtMillis
  const explicitExpiryMs = timestampToMillis(profile?.planExpiresAt);
  const legacyExpiryMs =
    typeof profile?.subscriptionExpiresAtMillis === "number" &&
    profile.subscriptionExpiresAtMillis > 0
      ? profile.subscriptionExpiresAtMillis
      : null;

  const hasPlanExpiresField =
    profile && Object.prototype.hasOwnProperty.call(profile, "planExpiresAt");

  // Lifetime if subscriptionStatus === "Lifetime" OR
  // subscriptionStatus === "Active" with planExpiresAt explicitly null (and no shorter expiry)
  const isExplicitLifetime =
    subStatus === "Lifetime" ||
    (subStatus === "Active" &&
      ((hasPlanExpiresField && profile.planExpiresAt === null) ||
        (!explicitExpiryMs && !legacyExpiryMs)));

  const expiryMs = isExplicitLifetime ? null : explicitExpiryMs || legacyExpiryMs;

  if (subStatus === "None") {
    return {
      isActive: false,
      isLifetime: false,
      status: "None",
      planName: "No Plan",
      startDateMillis: startMs,
      expiryDateMillis: null,
      daysLeft: 0,
      totalDays: 0,
      progressPct: 0,
      expiryWarning: null
    };
  }

  if (isExplicitLifetime && (subStatus === "Active" || subStatus === "Lifetime")) {
    return {
      isActive: true,
      isLifetime: true,
      status: "Active",
      planName: planName || "Lifetime Access",
      startDateMillis: startMs,
      expiryDateMillis: null,
      daysLeft: null,
      totalDays: null,
      progressPct: 100,
      expiryWarning: null
    };
  }

  if ((subStatus === "Active" || subStatus === "Lifetime") && expiryMs) {
    const remainingMs = expiryMs - nowMillis;
    if (remainingMs <= 0) {
      return {
        isActive: false,
        isLifetime: false,
        status: "Expired",
        planName,
        startDateMillis: startMs,
        expiryDateMillis: expiryMs,
        daysLeft: 0,
        totalDays: startMs ? Math.max(1, Math.round((expiryMs - startMs) / 86400000)) : 30,
        progressPct: 0,
        expiryWarning: "expired"
      };
    }

    const daysLeft = Math.max(1, Math.ceil(remainingMs / 86400000));
    const inferredTotal =
      startMs && expiryMs > startMs
        ? Math.max(1, Math.round((expiryMs - startMs) / 86400000))
        : daysLeft > 45
          ? 365
          : 30;
    const progressPct = Math.max(4, Math.min(100, Math.round((daysLeft / inferredTotal) * 100)));
    const expiryWarning = daysLeft <= 1 ? "1d" : daysLeft <= 7 ? "7d" : null;

    return {
      isActive: true,
      isLifetime: false,
      status: "Active",
      planName,
      startDateMillis: startMs,
      expiryDateMillis: expiryMs,
      daysLeft,
      totalDays: inferredTotal,
      progressPct,
      expiryWarning
    };
  }

  return {
    isActive: false,
    isLifetime: false,
    status: "None",
    planName: "No Plan",
    startDateMillis: startMs,
    expiryDateMillis: null,
    daysLeft: 0,
    totalDays: 0,
    progressPct: 0,
    expiryWarning: null
  };
}

export function formatPlanDate(ms) {
  if (!ms) return "-";
  return new Date(ms).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function getPrivacyDisplayName(profile, user) {
  const first = (profile?.firstName || "").trim();
  const surname = (profile?.surname || "").trim();
  if (first && surname) {
    return `${first} ${surname.charAt(0).toUpperCase()}.`;
  }
  const full = (profile?.name || user?.displayName || "Trader").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
  }
  return parts[0] || "Trader";
}
