import { CALENDAR_API_URL, DEFAULT_APPS_SCRIPT_FALLBACK_URLS } from "../config.js";
import { buildEventId, getDayKeyInTimeZone } from "./calendarData.js";

export function formatPnl(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (num > 0) return `+$${abs}`;
  if (num < 0) return `-$${abs}`;
  return "$0.00";
}

export function formatCompactPnl(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const formatted =
    abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs.toFixed(abs % 1 === 0 ? 0 : 1);
  if (num > 0) return `+${formatted}`;
  if (num < 0) return `-${formatted}`;
  return "0";
}

export function calculateRMultiple({ side, entryPrice, stopLoss, exitPrice }) {
  const entry = Number(entryPrice);
  const sl = Number(stopLoss);
  const exit = Number(exitPrice);
  if (!entry || !sl || !exit || entry === sl) return 0;
  const risk = Math.abs(entry - sl);
  if (risk <= 0) return 0;
  const reward = side === "Buy" ? exit - entry : entry - exit;
  return Number((reward / risk).toFixed(2));
}

export const COUNTRY_CODES = [
  { name: "India", code: "+91", min: 10, max: 10, hint: "9876543210" },
  { name: "United States", code: "+1", min: 10, max: 10, hint: "4155550199" },
  { name: "United Kingdom", code: "+44", min: 10, max: 10, hint: "7911123456" },
  { name: "UAE", code: "+971", min: 9, max: 9, hint: "501234567" },
  { name: "Singapore", code: "+65", min: 8, max: 8, hint: "81234567" },
  { name: "Australia", code: "+61", min: 9, max: 9, hint: "412345678" },
  { name: "Canada", code: "+1", min: 10, max: 10, hint: "6045550199" },
  { name: "Germany", code: "+49", min: 10, max: 11, hint: "15123456789" },
  { name: "Nigeria", code: "+234", min: 10, max: 10, hint: "8012345678" },
  { name: "South Africa", code: "+27", min: 9, max: 9, hint: "821234567" }
];

export function validatePhone(countryDialCode, rawPhone) {
  const digits = (rawPhone || "").replace(/\D/g, "");
  const rule = COUNTRY_CODES.find((c) => c.code === countryDialCode) || COUNTRY_CODES[0];
  if (digits.length < rule.min || digits.length > rule.max) {
    return `${rule.name} requires ${
      rule.min === rule.max ? rule.min : `${rule.min}-${rule.max}`
    } digits.`;
  }
  return null;
}

export async function compressImageToBase64(file, maxDim = 720, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > 330000 && q > 0.25) {
          q = Math.max(0.2, q - 0.12);
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const CALENDAR_CACHE_KEY = "eagle_fx_calendar_cache_v1";

export const FALLBACK_NEWS_EVENTS = [
  {
    id: "USD_fallback_us_core_cpi",
    currency: "USD",
    event: "Core CPI m/m",
    impact: "High",
    actual: "",
    forecast: "0.3%",
    previous: "0.3%",
    timeMode: "time",
    timestampMillis: Date.now() + 2 * 3600 * 1000
  },
  {
    id: "EUR_fallback_ecb_statement",
    currency: "EUR",
    event: "ECB Monetary Policy Statement",
    impact: "High",
    actual: "",
    forecast: "3.25%",
    previous: "3.25%",
    timeMode: "time",
    timestampMillis: Date.now() + 5 * 3600 * 1000
  },
  {
    id: "GBP_fallback_boe_rate",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "High",
    actual: "",
    forecast: "4.75%",
    previous: "4.75%",
    timeMode: "time",
    timestampMillis: Date.now() + 18 * 3600 * 1000
  },
  {
    id: "USD_fallback_fomc_presser",
    currency: "USD",
    event: "FOMC Press Conference",
    impact: "High",
    actual: "",
    forecast: "-",
    previous: "-",
    timeMode: "time",
    timestampMillis: Date.now() + 26 * 3600 * 1000
  },
  {
    id: "JPY_fallback_boj_cpi",
    currency: "JPY",
    event: "BOJ Core CPI y/y",
    impact: "Medium",
    actual: "",
    forecast: "2.1%",
    previous: "2.0%",
    timeMode: "time",
    timestampMillis: Date.now() + 30 * 3600 * 1000
  }
];

function normalizeFeedItem(item, idx) {
  const rawDate = String(item?.date || "").trim();
  const rawTime = String(item?.time || "").trim().toLowerCase();
  const lowerDate = rawDate.toLowerCase();

  let timeMode = "time";
  if (rawTime.includes("all day") || lowerDate.includes("all day")) {
    timeMode = "allday";
  } else if (rawTime.includes("tentative") || lowerDate.includes("tentative")) {
    timeMode = "tentative";
  }

  let ts = Date.parse(rawDate);
  if (Number.isNaN(ts)) {
    ts = Date.now() + idx * 3600 * 1000;
    if (timeMode === "time") timeMode = "tentative";
  } else if (rawDate.length <= 10) {
    timeMode = "allday";
  }

  const currency = String(item?.country || item?.currency || "USD").trim().toUpperCase() || "USD";
  const title = String(item?.title || item?.event || "Macro Release").trim();
  const impactRaw = String(item?.impact || "Low").trim();
  const impact = ["High", "Medium", "Low", "Holiday"].includes(impactRaw)
    ? impactRaw
    : impactRaw.toLowerCase().includes("non")
      ? "Holiday"
      : "Low";

  const dayKeyUtc = getDayKeyInTimeZone(ts, "UTC");
  const id = buildEventId(currency, dayKeyUtc, title);

  return {
    id,
    currency,
    event: title,
    impact,
    actual: String(item?.actual || "").trim(),
    forecast: String(item?.forecast || "").trim() || "-",
    previous: String(item?.previous || "").trim() || "-",
    timeMode,
    rawDate,
    timestampMillis: ts
  };
}

function mergeNormalizedEvents(rawArrays) {
  const seen = new Map();
  let counter = 0;
  for (const list of rawArrays) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const normalized = normalizeFeedItem(item, counter++);
      const key = `${normalized.id}_${normalized.timestampMillis}`;
      const existing = seen.get(key);
      if (!existing || (!existing.actual && normalized.actual)) {
        seen.set(key, normalized);
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.timestampMillis - b.timestampMillis);
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchLiveEconomicCalendar() {
  try {
    let rawArrays = [];

    if (CALENDAR_API_URL && CALENDAR_API_URL.trim().startsWith("http")) {
      const payload = await fetchJsonWithTimeout(CALENDAR_API_URL.trim(), 9000);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.events)
          ? payload.events
          : [];
      rawArrays = [list];
    } else {
      const results = await Promise.allSettled(
        DEFAULT_APPS_SCRIPT_FALLBACK_URLS.map((u) => fetchJsonWithTimeout(u, 8000))
      );
      rawArrays = results
        .filter((r) => r.status === "fulfilled" && Array.isArray(r.value))
        .map((r) => r.value);
    }

    const events = mergeNormalizedEvents(rawArrays);
    if (events.length === 0) {
      throw new Error("Empty calendar payload");
    }

    const fetchedAt = Date.now();
    try {
      localStorage.setItem(
        CALENDAR_CACHE_KEY,
        JSON.stringify({ events, fetchedAt })
      );
    } catch {
      // ignore storage quota errors
    }

    return {
      events,
      isCached: false,
      isFallback: false,
      lastUpdated: fetchedAt,
      error: null
    };
  } catch (err) {
    try {
      const rawCache = localStorage.getItem(CALENDAR_CACHE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed?.events) && parsed.events.length > 0) {
          return {
            events: parsed.events,
            isCached: true,
            isFallback: false,
            lastUpdated: parsed.fetchedAt || null,
            error: err?.message || "Live feed unavailable"
          };
        }
      }
    } catch {
      // ignore malformed cache
    }

    return {
      events: FALLBACK_NEWS_EVENTS,
      isCached: true,
      isFallback: true,
      lastUpdated: null,
      error: err?.message || "Live feed unavailable"
    };
  }
}
