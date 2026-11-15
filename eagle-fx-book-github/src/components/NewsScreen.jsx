import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  RefreshCw,
  Search,
  Sparkles
} from "lucide-react";
import {
  TIMEZONE_OPTIONS,
  compareActualVsForecast,
  formatDayHeaderFromKey,
  formatEventTimeInZone,
  getDayKeyInTimeZone,
  getEventDetails
} from "../utils/calendarData.js";

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "NZD", "CHF", "CNY"];
const IMPACTS = ["All", "High", "Medium", "Low"];
const DATE_FILTERS = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "next_week", label: "Next Week" }
];

function formatCountdown(targetMillis, nowMillis) {
  const diff = Math.max(0, targetMillis - nowMillis);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hms = [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${hms}` : hms;
}

function getImpactMeta(impact) {
  if (impact === "High") return { color: "#E11D2E", label: "HIGH" };
  if (impact === "Medium") return { color: "#F97316", label: "MED" };
  if (impact === "Low") return { color: "#F5B301", label: "LOW" };
  return { color: "#8B8B95", label: "HOL" };
}

function getWeekBounds(nowMs, weekOffset = 0) {
  const d = new Date(nowMs);
  const day = d.getDay(); // 0=Sun..6=Sat
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + weekOffset * 7, 0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86400000 - 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export default function NewsScreen({
  events,
  actualOverrides = {},
  calendarMeta = { isCached: false, isFallback: false, lastUpdated: null, error: null },
  loading,
  alertsEnabled,
  isAdmin,
  timeZone,
  use24h,
  onChangeTimeZone,
  onToggle24h,
  onToggleAlerts,
  onSaveActualOverride,
  onRefresh
}) {
  const [currency, setCurrency] = useState("ALL");
  const [impact, setImpact] = useState("All");
  const [dateFilter, setDateFilter] = useState("this_week");
  const [weekShift, setWeekShift] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [reminderIds, setReminderIds] = useState(() => {
    try {
      const saved = localStorage.getItem("eagle_fx_event_reminders");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [nowMillis, setNowMillis] = useState(Date.now());
  const [actualDrafts, setActualDrafts] = useState({});
  const [savingActualId, setSavingActualId] = useState("");

  const upNextRowRef = useRef(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMillis(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggleEventReminder = (eventId) => {
    setReminderIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      try {
        localStorage.setItem("eagle_fx_event_reminders", JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage limits
      }
      return next;
    });
  };

  // Merge Firestore live actuals over JSON feed events
  const mergedEvents = useMemo(() => {
    return events.map((evt) => {
      const override = actualOverrides[evt.id];
      const mergedActual =
        override && typeof override.actual === "string" && override.actual.trim() !== ""
          ? override.actual.trim()
          : evt.actual || "";
      return {
        ...evt,
        actual: mergedActual
      };
    });
  }, [events, actualOverrides]);

  const todayKey = getDayKeyInTimeZone(nowMillis, timeZone);
  const tomorrowKey = getDayKeyInTimeZone(nowMillis + 86400000, timeZone);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const effectiveWeekOffset =
      dateFilter === "next_week" ? weekShift + 1 : weekShift;
    const { startMs, endMs } = getWeekBounds(nowMillis, effectiveWeekOffset);

    return mergedEvents.filter((e) => {
      if (currency !== "ALL" && e.currency !== currency) return false;
      if (impact !== "All" && e.impact !== impact) return false;
      if (q && !(e.event || "").toLowerCase().includes(q) && !(e.currency || "").toLowerCase().includes(q)) {
        return false;
      }
      const evtDayKey = getDayKeyInTimeZone(e.timestampMillis, timeZone);
      if (dateFilter === "today") return evtDayKey === todayKey;
      if (dateFilter === "tomorrow") return evtDayKey === tomorrowKey;
      if (dateFilter === "this_week" || dateFilter === "next_week") {
        // Keep events inside the week window; if fallback demo events are all inside 30h, show them
        if (calendarMeta.isFallback) return true;
        return e.timestampMillis >= startMs && e.timestampMillis <= endMs;
      }
      return true;
    });
  }, [
    mergedEvents,
    currency,
    impact,
    searchQuery,
    dateFilter,
    weekShift,
    nowMillis,
    timeZone,
    todayKey,
    tomorrowKey,
    calendarMeta.isFallback
  ]);

  // Group events by day in selected timezone
  const groupedDays = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const evt of filtered) {
      const key = getDayKeyInTimeZone(evt.timestampMillis, timeZone);
      if (!map.has(key)) {
        const bucket = { dayKey: key, label: formatDayHeaderFromKey(key), items: [] };
        map.set(key, bucket);
        groups.push(bucket);
      }
      map.get(key).items.push(evt);
    }
    return groups;
  }, [filtered, timeZone]);

  // Find next upcoming event (in filtered or overall mergedEvents)
  const upNextEvent = useMemo(() => {
    return (
      filtered.find((e) => e.timestampMillis > nowMillis) ||
      mergedEvents.find((e) => e.timestampMillis > nowMillis) ||
      null
    );
  }, [filtered, mergedEvents, nowMillis]);

  // History map by normalized event title + currency
  const historyMap = useMemo(() => {
    const map = new Map();
    for (const evt of mergedEvents) {
      const key = `${evt.currency}::${(evt.event || "").toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(evt);
    }
    return map;
  }, [mergedEvents]);

  const imminentHigh = useMemo(() => {
    return mergedEvents.filter(
      (e) =>
        (e.impact === "High" || reminderIds.has(e.id)) &&
        e.timestampMillis > nowMillis &&
        e.timestampMillis - nowMillis <= 20 * 60 * 1000
    );
  }, [mergedEvents, reminderIds, nowMillis]);

  const handleUpNextClick = () => {
    if (!upNextEvent) return;
    if (upNextRowRef.current) {
      upNextRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setExpandedId(upNextEvent.id);
    }
  };

  const handleSaveAdminActual = async (evt) => {
    if (!onSaveActualOverride) return;
    const val = (actualDrafts[evt.id] ?? evt.actual ?? "").trim();
    setSavingActualId(evt.id);
    try {
      await onSaveActualOverride(evt, val);
    } finally {
      setSavingActualId("");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="skeleton" style={{ height: "96px" }} />
        <div className="skeleton" style={{ height: "54px" }} />
        <div className="skeleton" style={{ height: "86px" }} />
        <div className="skeleton" style={{ height: "86px" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {/* Header Card */}
      <div className="pro-card-flat" style={{ padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
                Economic Calendar
              </h2>
              {calendarMeta.isCached && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(245, 179, 1, 0.16)",
                    color: "var(--warning)",
                    border: "1px solid rgba(245, 179, 1, 0.35)"
                  }}
                >
                  CACHED
                </span>
              )}
            </div>
            <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Forex Factory style macro schedule &amp; 20m alerts
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={onToggle24h}
              aria-label="Toggle 12h or 24h time"
              className="btn-surface font-mono-num"
              style={{ minHeight: "38px", padding: "0 10px", fontSize: "11px" }}
            >
              {use24h ? "24H" : "12H"}
            </button>
            <button
              type="button"
              onClick={onToggleAlerts}
              aria-label="Toggle 20 minute high impact alerts"
              className="btn-surface touch-target"
              style={{
                minHeight: "38px",
                padding: "0 11px",
                borderColor: alertsEnabled ? "rgba(225, 29, 46, 0.5)" : "var(--border)",
                color: alertsEnabled ? "var(--primary)" : "var(--muted)"
              }}
            >
              {alertsEnabled ? <Bell size={16} strokeWidth={1.8} /> : <BellOff size={16} strokeWidth={1.8} />}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh calendar"
              className="btn-surface touch-target"
              style={{ width: "38px", minHeight: "38px", padding: 0 }}
            >
              <RefreshCw size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Timezone & Up Next Row */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
          <select
            aria-label="Select calendar time zone"
            className="pro-input"
            value={timeZone}
            onChange={(e) => onChangeTimeZone(e.target.value)}
            style={{ minHeight: "38px", padding: "6px 10px", fontSize: "12px", flex: 1 }}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                TZ: {tz.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUpNextClick}
            disabled={!upNextEvent}
            className="btn-red font-mono-num"
            style={{ minHeight: "38px", padding: "6px 12px", fontSize: "11px", flexShrink: 0 }}
          >
            <Clock size={13} />
            {upNextEvent
              ? `Up Next • ${formatCountdown(upNextEvent.timestampMillis, nowMillis)}`
              : "Up Next"}
          </button>
        </div>
      </div>

      {/* Cached/Error Notice */}
      {calendarMeta.isCached && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 12px",
            borderRadius: "12px",
            backgroundColor: "rgba(245, 179, 1, 0.1)",
            border: "1px solid rgba(245, 179, 1, 0.35)",
            fontSize: "11px",
            color: "var(--warning)"
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>
            Live feed unavailable{calendarMeta.error ? ` (${calendarMeta.error})` : ""}. Showing{" "}
            {calendarMeta.isFallback ? "baseline schedule" : "cached data from local storage"}.
          </span>
        </div>
      )}

      {/* 20-Minute Alert Banner */}
      {alertsEnabled && imminentHigh.length > 0 && (
        <div
          className="pro-card"
          style={{
            borderColor: "rgba(225, 29, 46, 0.65)",
            padding: "11px 14px",
            fontSize: "12px",
            color: "var(--text)"
          }}
        >
          <strong style={{ color: "var(--primary)" }}>20m Release Alert:</strong>{" "}
          {imminentHigh[0].currency} &mdash; {imminentHigh[0].event} (in{" "}
          <span className="font-mono-num">
            {formatCountdown(imminentHigh[0].timestampMillis, nowMillis)}
          </span>
          )
        </div>
      )}

      {/* Search Box */}
      <div style={{ position: "relative" }}>
        <Search
          size={15}
          color="var(--muted)"
          style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          className="pro-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search event (e.g. CPI, NFP, FOMC, Rate)..."
          style={{ paddingLeft: "38px", minHeight: "40px", fontSize: "13px" }}
        />
      </div>

      {/* Date Navigation: Today, Tomorrow, This Week, Next Week + Prev/Next arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          onClick={() => {
            setWeekShift((w) => w - 1);
            if (dateFilter === "today" || dateFilter === "tomorrow") setDateFilter("this_week");
          }}
          aria-label="Previous week"
          className="btn-surface"
          style={{ minHeight: "34px", width: "34px", padding: 0, borderRadius: "10px", flexShrink: 0 }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: "flex", gap: "5px", overflowX: "auto", flex: 1 }}>
          {DATE_FILTERS.map((df) => {
            const active = dateFilter === df.id;
            return (
              <button
                key={df.id}
                type="button"
                onClick={() => {
                  setDateFilter(df.id);
                  setWeekShift(0);
                }}
                style={{
                  minHeight: "34px",
                  padding: "4px 10px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "#FFFFFF" : "var(--muted)"
                }}
              >
                {df.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setWeekShift((w) => w + 1);
            if (dateFilter === "today" || dateFilter === "tomorrow") setDateFilter("this_week");
          }}
          aria-label="Next week"
          className="btn-surface"
          style={{ minHeight: "34px", width: "34px", padding: 0, borderRadius: "10px", flexShrink: 0 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Currency Chips */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
        {CURRENCIES.map((c) => {
          const active = currency === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              style={{
                minHeight: "32px",
                padding: "4px 11px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                backgroundColor: active ? "rgba(225, 29, 46, 0.15)" : "var(--surface)",
                color: active ? "var(--primary)" : "var(--muted)"
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Impact Filter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
        {IMPACTS.map((imp) => {
          const active = impact === imp;
          return (
            <button
              key={imp}
              type="button"
              onClick={() => setImpact(imp)}
              style={{
                minHeight: "34px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                backgroundColor: active ? "var(--primary)" : "var(--surface)",
                color: active ? "#FFFFFF" : "var(--muted)"
              }}
            >
              {imp}
            </button>
          );
        })}
      </div>

      {/* Grouped Days List */}
      {groupedDays.length === 0 ? (
        <div className="pro-card-flat" style={{ textAlign: "center", padding: "26px 16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
            No economic events match these filters.
          </p>
        </div>
      ) : (
        groupedDays.map((group) => {
          const isToday = group.dayKey === todayKey;
          return (
            <div key={group.dayKey} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Sticky Day Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 12px",
                  borderRadius: "10px",
                  backgroundColor: isToday ? "rgba(225, 29, 46, 0.14)" : "var(--surface-2)",
                  border: isToday ? "1px solid rgba(225, 29, 46, 0.45)" : "1px solid var(--border)"
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: isToday ? "var(--primary)" : "var(--text)"
                  }}
                >
                  {group.label} {isToday ? "• TODAY" : ""}
                </span>
                <span className="font-mono-num" style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {group.items.length} events
                </span>
              </div>

              {group.items.map((evt) => {
                const isUpNext = upNextEvent && upNextEvent.id === evt.id;
                const isExpanded = expandedId === evt.id;
                const impMeta = getImpactMeta(evt.impact);
                const actualCompare = compareActualVsForecast(evt.actual, evt.forecast, evt.event);
                const actualColor =
                  actualCompare === "better"
                    ? "var(--profit)"
                    : actualCompare === "worse"
                      ? "var(--loss)"
                      : "var(--text)";
                const isReminded = reminderIds.has(evt.id);
                const specs = getEventDetails(evt.event, evt.impact, evt.currency);
                const historyItems = (historyMap.get(`${evt.currency}::${(evt.event || "").toLowerCase()}`) || [])
                  .filter((h) => h.id !== evt.id || h.previous !== "-" || h.actual);

                return (
                  <div
                    key={`${evt.id}_${evt.timestampMillis}`}
                    ref={isUpNext ? upNextRowRef : null}
                    className="pro-card-flat"
                    style={{
                      padding: "11px 12px",
                      borderColor: isUpNext ? "rgba(225, 29, 46, 0.65)" : "var(--border)"
                    }}
                  >
                    {/* Main Forex-Factory-like Row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedId(isExpanded ? null : evt.id);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span className="font-mono-num" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
                            {formatEventTimeInZone(evt, timeZone, use24h)}
                          </span>
                          <span
                            className="font-mono-num"
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "6px",
                              backgroundColor: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              color: "var(--text)"
                            }}
                          >
                            {evt.currency}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "6px",
                              backgroundColor: `${impMeta.color}20`,
                              color: impMeta.color
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "2px",
                                backgroundColor: impMeta.color
                              }}
                            />
                            {impMeta.label}
                          </span>
                          {isUpNext && (
                            <span
                              style={{
                                fontSize: "9px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: "999px",
                                backgroundColor: "var(--primary)",
                                color: "#FFFFFF"
                              }}
                            >
                              UP NEXT
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEventReminder(evt.id);
                            }}
                            aria-label="Toggle event reminder"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: isReminded ? "var(--primary)" : "var(--muted)",
                              cursor: "pointer",
                              padding: "4px"
                            }}
                          >
                            <Bell size={14} fill={isReminded ? "var(--primary)" : "none"} />
                          </button>
                          {isExpanded ? (
                            <ChevronUp size={15} color="var(--muted)" />
                          ) : (
                            <ChevronDown size={15} color="var(--muted)" />
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
                        {evt.event}
                      </div>

                      {/* Actual / Forecast / Previous Columns */}
                      <div
                        className="font-mono-num"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "6px",
                          padding: "7px 8px",
                          borderRadius: "10px",
                          backgroundColor: "var(--surface-2)",
                          fontSize: "11px"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "9px", color: "var(--muted)" }}>ACTUAL</div>
                          <strong style={{ color: evt.actual ? actualColor : "var(--muted)" }}>
                            {evt.actual || "-"}
                          </strong>
                        </div>
                        <div>
                          <div style={{ fontSize: "9px", color: "var(--muted)" }}>FORECAST</div>
                          <strong style={{ color: "var(--text)" }}>{evt.forecast || "-"}</strong>
                        </div>
                        <div>
                          <div style={{ fontSize: "9px", color: "var(--muted)" }}>PREVIOUS</div>
                          <strong style={{ color: "var(--muted)" }}>{evt.previous || "-"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Specs + History + Admin Actual Input */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: "10px",
                          paddingTop: "10px",
                          borderTop: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "12px"
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: "11px", letterSpacing: "0.6px" }}>
                          SPECS &amp; TRADER GUIDE
                        </div>
                        <SpecLine label="Acronym" value={specs.acronymExpand} />
                        <SpecLine label="Source" value={specs.source} />
                        <SpecLine label="Usual Effect" value={specs.usualEffect} />
                        <SpecLine label="Frequency" value={specs.frequency} />
                        <SpecLine label="Next Release" value={specs.nextReleaseHint} />
                        <SpecLine label="Why Traders Care" value={specs.whyTradersCare} />

                        {/* Recent Release History */}
                        <div style={{ marginTop: "4px" }}>
                          <div style={{ fontWeight: 800, color: "var(--text)", fontSize: "11px", marginBottom: "5px" }}>
                            RECENT RELEASE HISTORY
                          </div>
                          <div
                            className="font-mono-num"
                            style={{
                              padding: "8px 10px",
                              borderRadius: "10px",
                              backgroundColor: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              fontSize: "11px"
                            }}
                          >
                            {historyItems.length > 0 ? (
                              historyItems.slice(0, 5).map((h, idx) => (
                                <div key={`${h.id}-${idx}`} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                                  <span style={{ color: "var(--muted)" }}>
                                    {formatDayHeaderFromKey(getDayKeyInTimeZone(h.timestampMillis, timeZone))}
                                  </span>
                                  <span style={{ color: "var(--text)" }}>
                                    Act: {h.actual || "-"} | Fcst: {h.forecast || "-"} | Prev: {h.previous || "-"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: "var(--muted)" }}>
                                Prior reading: {evt.previous || "-"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin Quick Actual Editor */}
                        {isAdmin && (
                          <div
                            style={{
                              marginTop: "4px",
                              padding: "10px",
                              borderRadius: "12px",
                              backgroundColor: "rgba(225, 29, 46, 0.08)",
                              border: "1px solid rgba(225, 29, 46, 0.35)"
                            }}
                          >
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", marginBottom: "6px" }}>
                              ADMIN LIVE ACTUAL OVERRIDE
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input
                                type="text"
                                className="pro-input font-mono-num"
                                value={actualDrafts[evt.id] ?? evt.actual ?? ""}
                                onChange={(e) =>
                                  setActualDrafts((prev) => ({ ...prev, [evt.id]: e.target.value }))
                                }
                                placeholder="Type Actual (e.g. 0.4%)"
                                style={{ minHeight: "38px", fontSize: "12px" }}
                              />
                              <button
                                type="button"
                                className="btn-red"
                                disabled={savingActualId === evt.id}
                                onClick={() => handleSaveAdminActual(evt)}
                                style={{ minHeight: "38px", padding: "6px 12px", fontSize: "12px" }}
                              >
                                <Sparkles size={13} />
                                {savingActualId === evt.id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </motion.div>
  );
}

function SpecLine({ label, value }) {
  return (
    <div style={{ lineHeight: 1.45 }}>
      <span style={{ color: "var(--muted)", fontWeight: 700 }}>{label}: </span>
      <span style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}
