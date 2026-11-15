export const TIMEZONE_OPTIONS = [
  { label: "Device Local", value: "local" },
  { label: "IST (India)", value: "Asia/Kolkata" },
  { label: "UTC (GMT)", value: "UTC" },
  { label: "New York (EST/EDT)", value: "America/New_York" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AEST/AEDT)", value: "Australia/Sydney" },
  { label: "Frankfurt (CET/CEST)", value: "Europe/Berlin" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "Singapore (SGT)", value: "Asia/Singapore" }
];

export function resolveTimeZone(pref) {
  if (!pref || pref === "local") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }
  return pref;
}

export function getShortTimeZoneName(timeZone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: resolveTimeZone(timeZone),
      timeZoneName: "short"
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart ? tzPart.value : "LOC";
  } catch {
    return "LOC";
  }
}

export function getDayKeyInTimeZone(timestampMillis, timeZone) {
  const tz = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestampMillis));
    const y = parts.find((p) => p.type === "year")?.value || "2026";
    const m = parts.find((p) => p.type === "month")?.value || "01";
    const d = parts.find((p) => p.type === "day")?.value || "01";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date(timestampMillis).toISOString().slice(0, 10);
  }
}

export function formatDayHeaderFromKey(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatEventTimeInZone(evt, timeZone, use24h) {
  if (evt.timeMode === "allday") return "All Day";
  if (evt.timeMode === "tentative") return "Tentative";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: resolveTimeZone(timeZone),
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24h
    }).format(new Date(evt.timestampMillis));
  } catch {
    return new Date(evt.timestampMillis).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24h
    });
  }
}

export function buildEventId(currency, dayKey, title) {
  const slug = String(title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return `${String(currency || "USD").toUpperCase()}_${dayKey}_${slug}`;
}

export function parseNumericValue(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === "-" || s === "—" || s.toLowerCase() === "na") return null;
  const cleaned = s.replace(/,/g, "");
  const match = cleaned.match(/^([+-]?\d+(?:\.\d+)?)([%kKmMbBtT]?)$/);
  if (!match) {
    const loose = parseFloat(cleaned.replace(/[^0-9.+-]/g, ""));
    return Number.isNaN(loose) ? null : loose;
  }
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "K") return num * 1e3;
  if (unit === "M") return num * 1e6;
  if (unit === "B") return num * 1e9;
  if (unit === "T") return num * 1e12;
  return num;
}

export function compareActualVsForecast(actual, forecast, title = "") {
  const a = parseNumericValue(actual);
  const f = parseNumericValue(forecast);
  if (a === null || f === null || a === f) return "neutral";
  const lower = String(title || "").toLowerCase();
  const lowerIsBetter =
    lower.includes("unemployment rate") ||
    lower.includes("jobless claims") ||
    lower.includes("unemployment claims") ||
    lower.includes("claimant count");
  if (lowerIsBetter) {
    return a < f ? "better" : "worse";
  }
  return a > f ? "better" : "worse";
}

const EVENT_SPECS_CATALOG = [
  {
    match: ["core cpi"],
    acronymExpand: "Core Consumer Price Index (excluding volatile food and energy prices)",
    source: "National Statistics Bureau (e.g. U.S. BLS / Eurostat / ONS)",
    usualEffect: "Higher-than-expected reading tends to strengthen the domestic currency.",
    frequency: "Monthly, typically released around mid-month for the prior month.",
    nextReleaseHint: "Scheduled monthly (~12th–16th)",
    whyTradersCare:
      "Central banks strip out food and energy noise to judge sticky underlying inflation. Surprises rapidly reprice upcoming interest rate probabilities across FX, gold, and yields."
  },
  {
    match: ["cpi"],
    acronymExpand: "Consumer Price Index",
    source: "National Statistics Agency (e.g. BLS, Destatis, ONS, StatsCan)",
    usualEffect: "Readings above forecast generally boost the currency as tightening odds rise.",
    frequency: "Monthly (headline quarterly in Australia & New Zealand).",
    nextReleaseHint: "Scheduled monthly",
    whyTradersCare:
      "Headline inflation directly shapes household purchasing power and central bank policy credibility, often producing sharp breakout volatility in major pairs and XAU/USD."
  },
  {
    match: ["core pce", "pce price"],
    acronymExpand: "Personal Consumption Expenditures Price Index",
    source: "U.S. Bureau of Economic Analysis (BEA)",
    usualEffect: "Prints above consensus are typically bullish for USD and Treasury yields.",
    frequency: "Monthly, released roughly four weeks after the month closes.",
    nextReleaseHint: "Last Friday of each month",
    whyTradersCare:
      "PCE is the Federal Reserve's preferred inflation gauge because it captures consumer substitution behavior and broader spending weights than CPI."
  },
  {
    match: ["ppi"],
    acronymExpand: "Producer Price Index",
    source: "National Labor / Statistics Agency (e.g. U.S. BLS)",
    usualEffect: "Stronger producer prices typically support the currency.",
    frequency: "Monthly, usually released within two weeks after month-end.",
    nextReleaseHint: "Monthly, typically one day around CPI",
    whyTradersCare:
      "Wholesale input costs eventually pass through to retail shelves, making PPI a leading indicator for future CPI and corporate margin pressure."
  },
  {
    match: ["non-farm", "nonfarm", "nfp"],
    acronymExpand: "Non-Farm Payrolls / Non-Farm Employment Change",
    source: "U.S. Bureau of Labor Statistics (or national labor office)",
    usualEffect: "Job creation above forecast typically sparks an immediate USD rally.",
    frequency: "Monthly, almost always on the first Friday of every month.",
    nextReleaseHint: "First Friday of each month",
    whyTradersCare:
      "Employment growth drives consumer spending and wage inflation. Because it combines payrolls, hourly earnings, and jobless rate, NFP is among the widest liquidity events in FX."
  },
  {
    match: ["unemployment rate"],
    acronymExpand: "Civilian / National Unemployment Rate",
    source: "National Labor Statistics Office",
    usualEffect: "Lower-than-forecast unemployment strengthens the currency (tighter labor market).",
    frequency: "Monthly, alongside headline employment reports.",
    nextReleaseHint: "Monthly jobs release window",
    whyTradersCare:
      "Rising unemployment signals cooling economic momentum and can push central banks toward dovish rate cuts earlier than markets anticipated."
  },
  {
    match: ["jobless claims", "unemployment claims", "claimant count"],
    acronymExpand: "Initial Jobless Claims / Unemployment Benefit Filings",
    source: "U.S. Department of Labor / UK ONS",
    usualEffect: "Fewer claims than forecast are bullish for the currency.",
    frequency: "Weekly in the U.S. (every Thursday); monthly in the UK.",
    nextReleaseHint: "Every Thursday (US) / Monthly (UK)",
    whyTradersCare:
      "Because it arrives every week with almost no lag, Initial Claims gives traders the fastest early warning of turning points in hiring or layoffs."
  },
  {
    match: ["fomc statement", "federal funds rate"],
    acronymExpand: "Federal Open Market Committee Policy Statement & Benchmark Rate",
    source: "Board of Governors of the Federal Reserve System",
    usualEffect: "Hawkish guidance or higher rates strengthen USD; dovish shifts weaken USD.",
    frequency: "Eight scheduled meetings per year (roughly every 6 weeks).",
    nextReleaseHint: "Next scheduled FOMC meeting date",
    whyTradersCare:
      "The Fed sets the global cost of dollar funding. Even when the rate stays unchanged, subtle wording edits in the statement reprice bond markets worldwide."
  },
  {
    match: ["fomc meeting minutes", "fomc minutes"],
    acronymExpand: "Federal Open Market Committee Detailed Meeting Record",
    source: "Federal Reserve",
    usualEffect: "More hawkish dissent or caution on cuts lifts USD; dovish tone weighs on USD.",
    frequency: "Eight times annually, released three weeks after each policy decision.",
    nextReleaseHint: "3 weeks after each FOMC rate decision",
    whyTradersCare:
      "Minutes reveal how united or divided policymakers actually were behind closed doors and expose triggers for future hikes, pauses, or cuts."
  },
  {
    match: ["fomc press conference"],
    acronymExpand: "Federal Open Market Committee Chair Q&A Briefing",
    source: "Federal Reserve",
    usualEffect: "Two-way volatility: tone on inflation and labor drives USD trend.",
    frequency: "Held 30 minutes after every FOMC rate decision.",
    nextReleaseHint: "Following each FOMC announcement",
    whyTradersCare:
      "Unscripted journalist Q&A often clarifies forward policy more candidly than the statement, frequently causing sharp stop-runs and trend reversals."
  },
  {
    match: ["fed chair", "powell speaks"],
    acronymExpand: "Federal Reserve Chair Public Remarks / Testimony",
    source: "Federal Reserve / U.S. Congress / Central Bank Symposium",
    usualEffect: "Hawkish inflation remarks lift USD; growth caution weakens USD.",
    frequency: "Ad-hoc speeches, congressional testimony, and global central bank panels.",
    nextReleaseHint: "Event-driven schedule",
    whyTradersCare:
      "Market participants track every nuance from the Fed Chair for hints ahead of pre-meeting blackout periods."
  },
  {
    match: ["retail sales", "core retail"],
    acronymExpand: "Monthly Retail Sales Value Change",
    source: "National Census / Statistics Bureau (e.g. U.S. Census Bureau)",
    usualEffect: "Stronger consumer spending supports the domestic currency.",
    frequency: "Monthly, roughly two weeks after month-end.",
    nextReleaseHint: "Mid-month release",
    whyTradersCare:
      "Household consumption makes up the majority of GDP in major economies, so resilient retail volume validates economic growth."
  },
  {
    match: ["gdp"],
    acronymExpand: "Gross Domestic Product",
    source: "Bureau of Economic Analysis / National Accounts Office",
    usualEffect: "Above-consensus growth numbers tend to strengthen the currency.",
    frequency: "Quarterly (monthly in UK & Canada), with advance/prelim/final revisions.",
    nextReleaseHint: "Quarterly release cycle",
    whyTradersCare:
      "GDP is the broadest scorecard of economic output. Even though it lags monthly indicators, large surprises alter recession or soft-landing narratives."
  },
  {
    match: ["ism manufacturing", "ism services", "ism non-manufacturing"],
    acronymExpand: "Institute for Supply Management Purchasing Managers Index",
    source: "Institute for Supply Management (ISM)",
    usualEffect: "Readings above 50 indicate expansion and stronger forecasts favor USD.",
    frequency: "Monthly, released on the 1st and 3rd business days of each month.",
    nextReleaseHint: "First week of every month",
    whyTradersCare:
      "Purchasing managers react quickly to new orders, backlogs, employment, and prices paid—making ISM one of the most closely traded U.S. growth indicators."
  },
  {
    match: ["pmi"],
    acronymExpand: "Purchasing Managers' Index (Manufacturing / Services / Composite)",
    source: "S&P Global / Official National PMI Survey",
    usualEffect: "Above 50 signals expansion; beating forecast tends to boost the currency.",
    frequency: "Monthly, with flash estimates released ~1 week before month-end.",
    nextReleaseHint: "Flash & Final monthly cycle",
    whyTradersCare:
      "Private-sector business surveys provide an early snapshot of order books and pricing power across Europe, UK, US, Australia, and Japan."
  },
  {
    match: ["ecb", "main refinancing rate", "monetary policy statement"],
    acronymExpand: "European Central Bank Governing Council Rate & Policy Decision",
    source: "European Central Bank (Frankfurt)",
    usualEffect: "Higher rates or firm anti-inflation rhetoric boost EUR.",
    frequency: "Eight policy meetings per year, followed by a press conference.",
    nextReleaseHint: "Next scheduled ECB Council meeting",
    whyTradersCare:
      "The ECB sets policy for the entire Eurozone. Traders focus heavily on rate path clues and balance-sheet pace during the President's press conference."
  },
  {
    match: ["boe", "official bank rate", "mpc official"],
    acronymExpand: "Bank of England Monetary Policy Committee Rate Decision",
    source: "Bank of England (London)",
    usualEffect: "Hawkish vote split or rate hike supports GBP.",
    frequency: "Eight times per year on Thursdays.",
    nextReleaseHint: "Scheduled MPC meeting cycle",
    whyTradersCare:
      "Beyond the rate itself, the 9-member MPC vote breakdown reveals immediately how close the committee is to shifting policy."
  },
  {
    match: ["boj", "bank of japan"],
    acronymExpand: "Bank of Japan Monetary Policy Decision & Outlook",
    source: "Bank of Japan (Tokyo)",
    usualEffect: "Tightening hints or higher policy rates sharply strengthen JPY.",
    frequency: "Eight policy meetings per year.",
    nextReleaseHint: "Scheduled BOJ policy meeting",
    whyTradersCare:
      "Because Japan has long maintained ultra-low yields, even subtle BOJ shifts trigger massive capital repatriation and JPY carry-trade unwinds."
  },
  {
    match: ["rba", "cash rate"],
    acronymExpand: "Reserve Bank of Australia Cash Rate Decision",
    source: "Reserve Bank of Australia (Sydney)",
    usualEffect: "Surprise hike or firm inflation language boosts AUD.",
    frequency: "Eight meetings per year.",
    nextReleaseHint: "Scheduled RBA Board meeting",
    whyTradersCare:
      "The RBA statement outlines domestic labor, housing, and Chinese commodity demand assumptions that steer Australian yield expectations."
  },
  {
    match: ["boc", "overnight rate"],
    acronymExpand: "Bank of Canada Policy Rate & Monetary Statement",
    source: "Bank of Canada (Ottawa)",
    usualEffect: "Higher rates or upbeat growth outlook strengthen CAD.",
    frequency: "Eight policy announcements per year.",
    nextReleaseHint: "Scheduled BOC decision date",
    whyTradersCare:
      "As a G7 central bank tied closely to U.S. trade and energy, BOC policy divergence against the Fed drives clean trends in USD/CAD."
  },
  {
    match: ["snb"],
    acronymExpand: "Swiss National Bank Monetary Policy Assessment",
    source: "Swiss National Bank (Zurich)",
    usualEffect: "Tightening or tolerance for stronger CHF lifts Swiss Franc crosses.",
    frequency: "Quarterly (March, June, September, December).",
    nextReleaseHint: "Quarterly SNB assessment",
    whyTradersCare:
      "Because the SNB meets only once a quarter and actively comments on franc valuation, surprises often trigger rapid moves in EUR/CHF and USD/CHF."
  },
  {
    match: ["rbnz", "official cash rate"],
    acronymExpand: "Reserve Bank of New Zealand Official Cash Rate Decision",
    source: "Reserve Bank of New Zealand (Wellington)",
    usualEffect: "Higher rate projections or hikes boost NZD.",
    frequency: "Seven scheduled decisions per year.",
    nextReleaseHint: "Scheduled RBNZ policy meeting",
    whyTradersCare:
      "The RBNZ publishes explicit forward OCR track projections in its Monetary Policy Statement, giving FX traders direct multi-quarter rate visibility."
  },
  {
    match: ["consumer confidence", "consumer sentiment", "uom"],
    acronymExpand: "Consumer Confidence / Sentiment Survey",
    source: "The Conference Board / University of Michigan",
    usualEffect: "Stronger confidence supports discretionary spending and the currency.",
    frequency: "Monthly (Michigan includes preliminary & final prints).",
    nextReleaseHint: "Monthly survey cycle",
    whyTradersCare:
      "Optimistic consumers spend more freely, while embedded inflation expectation sub-indexes are watched carefully by central bankers."
  },
  {
    match: ["trade balance", "goods trade"],
    acronymExpand: "Monthly Merchandise & Services Trade Balance",
    source: "National Customs / Statistics Bureau",
    usualEffect: "Larger surpluses or narrower deficits tend to support the currency.",
    frequency: "Monthly, typically 4–6 weeks after month-end.",
    nextReleaseHint: "Monthly release",
    whyTradersCare:
      "Export demand creates natural real-money buying of the domestic currency and contributes directly to quarterly GDP net trade."
  }
];

export function getEventDetails(eventTitle = "", impact = "Low", currency = "USD") {
  const lower = String(eventTitle).toLowerCase();
  const matched = EVENT_SPECS_CATALOG.find((item) =>
    item.match.some((kw) => lower.includes(kw))
  );
  if (matched) return matched;

  if (impact === "High") {
    return {
      acronymExpand: `${currency} Major Macro Catalyst`,
      source: `Official ${currency} Statistical / Central Bank Authority`,
      usualEffect: "Readings beating consensus generally lift the currency and tighten rate expectations.",
      frequency: "Scheduled recurring macroeconomic release.",
      nextReleaseHint: "Check upcoming calendar schedule",
      whyTradersCare:
        "High-impact releases tend to widen spreads briefly and inject institutional volume into major currency pairs and gold."
    };
  }
  if (impact === "Medium") {
    return {
      acronymExpand: `${currency} Secondary Economic Indicator`,
      source: `National ${currency} Reporting Institution`,
      usualEffect: "Notable deviations from forecast can trigger short-term intraday swings.",
      frequency: "Monthly or quarterly schedule.",
      nextReleaseHint: "Recurring calendar cycle",
      whyTradersCare:
        "Medium-impact indicators reinforce or challenge the broader macro trend ahead of top-tier central bank decisions."
    };
  }
  if (impact === "Holiday") {
    return {
      acronymExpand: `${currency} Regional Market Holiday`,
      source: `National Exchange / Banking Calendar`,
      usualEffect: "Reduced liquidity and thinner order books during the affected session.",
      frequency: "Annual public / banking observance.",
      nextReleaseHint: "Holiday calendar",
      whyTradersCare:
        "Thin session liquidity increases stop-hunt risk and slows normal breakout follow-through during the regional session."
    };
  }
  return {
    acronymExpand: `${currency} Routine Economic Release`,
    source: `National ${currency} Statistical Office`,
    usualEffect: "Limited standalone impact unless dramatically away from market consensus.",
    frequency: "Scheduled economic release.",
    nextReleaseHint: "Recurring calendar cycle",
    whyTradersCare:
      "Low-impact releases provide background macro context and feed into longer-term institutional economic models."
  };
}
