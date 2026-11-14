import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, RefreshCw } from "lucide-react";

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
const IMPACTS = ["All", "High", "Medium", "Low"];

export default function NewsScreen({
  events,
  loading,
  alertsEnabled,
  onToggleAlerts,
  onRefresh
}) {
  const [currency, setCurrency] = useState("ALL");
  const [impact, setImpact] = useState("All");

  const filtered = events.filter((e) => {
    const cMatch = currency === "ALL" || e.currency === currency;
    const iMatch = impact === "All" || e.impact === impact;
    return cMatch && iMatch;
  });

  const now = Date.now();
  const imminentHigh = events.filter(
    (e) =>
      e.impact === "High" &&
      e.timestampMillis > now &&
      e.timestampMillis - now <= 20 * 60 * 1000
  );

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="skeleton" style={{ height: "86px" }} />
        <div className="skeleton" style={{ height: "86px" }} />
        <div className="skeleton" style={{ height: "86px" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div className="pro-card-flat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#F5F5F7" }}>
            Economic Calendar
          </h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8B8B95" }}>
            Live macro releases &amp; 20m High-Impact alerts
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={onToggleAlerts}
            aria-label="Toggle 20 minute high impact alerts"
            className="btn-surface touch-target"
            style={{
              padding: "0 12px",
              borderColor: alertsEnabled ? "rgba(225, 29, 46, 0.5)" : "#23232A",
              color: alertsEnabled ? "#E11D2E" : "#8B8B95"
            }}
          >
            {alertsEnabled ? <Bell size={16} strokeWidth={1.75} /> : <BellOff size={16} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh calendar"
            className="btn-surface touch-target"
            style={{ width: "44px", padding: 0 }}
          >
            <RefreshCw size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {alertsEnabled && imminentHigh.length > 0 && (
        <div
          className="pro-card"
          style={{
            borderColor: "rgba(225, 29, 46, 0.65)",
            padding: "12px 14px",
            fontSize: "12px",
            color: "#F5F5F7"
          }}
        >
          <strong style={{ color: "#E11D2E" }}>20m High-Impact Alert:</strong>{" "}
          {imminentHigh[0].currency} — {imminentHigh[0].event}
        </div>
      )}

      {/* Currency Filter */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
        {CURRENCIES.map((c) => {
          const active = currency === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              style={{
                minHeight: "34px",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: active ? "1px solid #E11D2E" : "1px solid #23232A",
                backgroundColor: active ? "rgba(225, 29, 46, 0.16)" : "#0D0D10",
                color: active ? "#FF2D3D" : "#8B8B95"
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
                minHeight: "36px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: active ? "1px solid #E11D2E" : "1px solid #23232A",
                backgroundColor: active ? "#E11D2E" : "#0D0D10",
                color: active ? "#FFFFFF" : "#8B8B95"
              }}
            >
              {imp}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="pro-card-flat" style={{ textAlign: "center", padding: "24px 16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8B8B95" }}>
            No economic events match this filter.
          </p>
        </div>
      ) : (
        filtered.map((evt) => {
          const impColor =
            evt.impact === "High"
              ? "#E11D2E"
              : evt.impact === "Medium"
                ? "#F5B301"
                : "#8B8B95";
          const dt = new Date(evt.timestampMillis);
          return (
            <div key={evt.id} className="pro-card-flat" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    className="font-mono-num"
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#141418",
                      border: "1px solid #23232A",
                      color: "#F5F5F7"
                    }}
                  >
                    {evt.currency}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: `${impColor}22`,
                      color: impColor
                    }}
                  >
                    {evt.impact.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
                  {dt.toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                  {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#F5F5F7", marginBottom: "4px" }}>
                {evt.event}
              </div>
              <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
                Forecast: {evt.forecast || "-"} • Previous: {evt.previous || "-"}
              </div>
            </div>
          );
        })
      )}
    </motion.div>
  );
}
