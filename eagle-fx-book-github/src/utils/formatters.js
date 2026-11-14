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
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const FALLBACK_NEWS_EVENTS = [
  {
    id: "ff-1",
    currency: "USD",
    event: "US Core CPI m/m",
    impact: "High",
    forecast: "0.3%",
    previous: "0.3%",
    timestampMillis: Date.now() + 2 * 3600 * 1000
  },
  {
    id: "ff-2",
    currency: "EUR",
    event: "ECB Monetary Policy Statement",
    impact: "High",
    forecast: "3.25%",
    previous: "3.25%",
    timestampMillis: Date.now() + 5 * 3600 * 1000
  },
  {
    id: "ff-3",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "High",
    forecast: "4.75%",
    previous: "4.75%",
    timestampMillis: Date.now() + 18 * 3600 * 1000
  },
  {
    id: "ff-4",
    currency: "USD",
    event: "FOMC Press Conference",
    impact: "High",
    forecast: "-",
    previous: "-",
    timestampMillis: Date.now() + 26 * 3600 * 1000
  },
  {
    id: "ff-5",
    currency: "JPY",
    event: "BOJ Core CPI y/y",
    impact: "Medium",
    forecast: "2.1%",
    previous: "2.0%",
    timestampMillis: Date.now() + 30 * 3600 * 1000
  }
];

export async function fetchLiveEconomicCalendar() {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      signal: controller.signal
    });
    window.clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_NEWS_EVENTS;

    return data
      .map((item, idx) => {
        const ts = Date.parse(item.date || "");
        return {
          id: `live-${idx}-${item.title || "evt"}`,
          currency: (item.country || "USD").toUpperCase(),
          event: item.title || "Macro Release",
          impact: ["High", "Medium", "Low"].includes(item.impact) ? item.impact : "Low",
          forecast: item.forecast || "-",
          previous: item.previous || "-",
          timestampMillis: Number.isNaN(ts) ? Date.now() + idx * 3600 * 1000 : ts
        };
      })
      .sort((a, b) => a.timestampMillis - b.timestampMillis);
  } catch {
    return FALLBACK_NEWS_EVENTS;
  }
}
