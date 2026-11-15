import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  ChevronRight,
  Plus,
  TrendingUp
} from "lucide-react";
import { computeDashboardStats } from "../utils/analytics.js";
import { formatCompactPnl, formatPnl } from "../utils/formatters.js";
import PlanSummaryCard from "./PlanSummaryCard.jsx";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.1.4";
const RANGES = ["1W", "1M", "3M", "ALL"];

function CountUpPnl({ value }) {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.65,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest)
    });
    return () => controls.stop();
  }, [value, shouldReduceMotion]);

  const isNeg = value < 0;
  const color = value === 0 ? "var(--text)" : isNeg ? "var(--loss)" : "var(--profit)";

  return (
    <span
      className="font-mono-num"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "32px",
        fontWeight: 800,
        color,
        letterSpacing: "-0.8px"
      }}
    >
      {isNeg && <ArrowDownRight size={24} strokeWidth={2.2} color="var(--loss)" />}
      {formatPnl(display)}
    </span>
  );
}

function formatCountdown(targetMillis, nowMillis) {
  const diff = Math.max(0, targetMillis - nowMillis);
  const totalSec = Math.floor(diff / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function DashboardScreen({
  trades,
  loading,
  nextCatalyst,
  planInfo,
  onAddTrade,
  onViewAllJournal,
  onOpenNews,
  onOpenStore
}) {
  const [range, setRange] = useState("ALL");
  const [nowMillis, setNowMillis] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMillis(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="skeleton" style={{ height: "240px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="skeleton" style={{ height: "130px" }} />
          <div className="skeleton" style={{ height: "130px" }} />
        </div>
        <div className="skeleton" style={{ height: "180px" }} />
      </div>
    );
  }

  const stats = computeDashboardStats(trades, range);
  const recentTrades = [...trades]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);

  const donutData =
    stats.totalTrades > 0
      ? [
          { name: "Wins", value: stats.winsCount, color: "#22C55E" },
          { name: "Losses", value: Math.max(0, stats.totalTrades - stats.winsCount), color: "#FF5C5C" }
        ]
      : [{ name: "Empty", value: 1, color: "#787885" }];

  const rewardRatioPct =
    stats.avgRR > 0 ? Math.min(100, Math.round((stats.avgRR / (1 + stats.avgRR)) * 100)) : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      {/* Plan Status Card (with 7d / 1d renewal warning) */}
      {planInfo && (
        <PlanSummaryCard planInfo={planInfo} onRenew={onOpenStore} compact />
      )}

      {/* 1. Hero Net Realized P&L + Equity Curve */}
      <div className="pro-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px"
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
            NET REALIZED P&amp;L
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <span className="font-mono-num" style={chipStyle}>
              {stats.totalTrades} Trades
            </span>
            <span className="font-mono-num" style={chipRedStyle}>
              PF {stats.profitFactor.toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <CountUpPnl value={stats.netPnl} />
        </div>

        {/* Range Chips */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          {RANGES.map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                style={{
                  minHeight: "32px",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: active ? "rgba(225, 29, 46, 0.16)" : "var(--surface-2)",
                  color: active ? "var(--primary)" : "var(--muted)"
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Equity Curve */}
        <div style={{ width: "100%", height: "130px", marginBottom: "14px" }}>
          {stats.equityCurve.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurve} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E11D2E" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#E11D2E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "var(--text)"
                  }}
                  formatter={(v) => [formatPnl(v), "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#E11D2E"
                  strokeWidth={2.2}
                  fill="url(#equityRedGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: "100%",
                borderRadius: "14px",
                backgroundColor: "var(--surface-2)",
                border: "1px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "var(--muted)",
                fontSize: "12px"
              }}
            >
              <TrendingUp size={16} strokeWidth={1.75} color="var(--primary)" />
              <span>Log at least 2 trades to render equity curve</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-red"
          onClick={onAddTrade}
          style={{ width: "100%" }}
        >
          <Plus size={18} strokeWidth={2} />
          Add Trade
        </button>
      </div>

      {/* 2. Row of 2 Cards: Win Rate Donut & Avg Risk:Reward */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="pro-card-flat">
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, marginBottom: "6px" }}>
            WIN RATE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "62px", height: "62px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={20}
                    outerRadius={29}
                    stroke="none"
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="font-mono-num" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>
                {stats.winRate.toFixed(0)}%
              </div>
              <div className="font-mono-num" style={{ fontSize: "11px", color: "var(--muted)" }}>
                {stats.winsCount}W / {stats.lossesCount}L
              </div>
            </div>
          </div>
        </div>

        <div className="pro-card-flat" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, marginBottom: "6px" }}>
              AVG RISK : REWARD
            </div>
            <div className="font-mono-num" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>
              1 : {stats.avgRR.toFixed(2)}
            </div>
          </div>
          <div>
            <div
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "999px",
                backgroundColor: "var(--border)",
                overflow: "hidden",
                display: "flex",
                marginTop: "10px"
              }}
            >
              <div style={{ width: `${100 - rewardRatioPct}%`, backgroundColor: "var(--loss)" }} />
              <div style={{ width: `${rewardRatioPct}%`, backgroundColor: "var(--profit)" }} />
            </div>
            <div
              className="font-mono-num"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "var(--muted)",
                marginTop: "5px"
              }}
            >
              <span>Risk {formatCompactPnl(-stats.avgLoss)}</span>
              <span>Reward {formatCompactPnl(stats.avgWin)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPI Grid (2x3) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <KpiCell label="TODAY'S P&L" value={stats.todayPnl} />
        <KpiCell label="THIS WEEK P&L" value={stats.weekPnl} />
        <KpiCell label="BEST TRADE" value={stats.bestTrade} />
        <KpiCell label="WORST TRADE" value={stats.worstTrade} />
        <KpiCell
          label="MAX DRAWDOWN"
          value={stats.maxDrawdown > 0 ? -stats.maxDrawdown : 0}
        />
        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700, marginBottom: "6px" }}>
            EXPECTANCY (AVG R)
          </div>
          <div
            className="font-mono-num"
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: stats.expectancyR >= 0 ? "var(--profit)" : "var(--loss)",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            {stats.expectancyR < 0 && <ArrowDownRight size={14} strokeWidth={2} />}
            {stats.expectancyR >= 0 ? "+" : ""}
            {stats.expectancyR.toFixed(2)}R
          </div>
        </div>
      </div>

      {/* 4. Next High-Impact Catalyst */}
      <div className="pro-card" onClick={onOpenNews} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BellRing size={15} strokeWidth={1.75} color="var(--primary)" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.7px" }}>
              NEXT HIGH-IMPACT CATALYST
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={1.75} color="var(--muted)" />
        </div>

        {nextCatalyst ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  className="font-mono-num"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(225, 29, 46, 0.16)",
                    color: "var(--primary)"
                  }}
                >
                  {nextCatalyst.currency}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                  {nextCatalyst.event}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Forecast: {nextCatalyst.forecast || "-"} &bull; Prev: {nextCatalyst.previous || "-"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "2px" }}>IN</div>
              <div className="font-mono-num" style={{ fontSize: "15px", fontWeight: 800, color: "var(--warning)" }}>
                {formatCountdown(nextCatalyst.timestampMillis, nowMillis)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--muted)" }}>
            <CalendarClock size={16} strokeWidth={1.75} />
            <span>No upcoming high-impact releases remaining today.</span>
          </div>
        )}
      </div>

      {/* 5. Recent Executions */}
      <div className="pro-card-flat">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
            Recent Executions
          </h3>
          <button
            type="button"
            onClick={onViewAllJournal}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            View all
          </button>
        </div>

        {recentTrades.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 8px" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--muted)" }}>
              No trades logged yet. Start building your edge today.
            </p>
            <button type="button" className="btn-red" onClick={onAddTrade}>
              <Plus size={16} strokeWidth={1.75} />
              Log First Trade
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentTrades.map((trade) => {
              const pnl = Number(trade.pnl) || 0;
              const isBuy = (trade.side || "Buy") === "Buy";
              const isNeg = pnl < 0;
              return (
                <div
                  key={trade.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "4px 8px",
                        borderRadius: "8px",
                        backgroundColor: isBuy ? "rgba(34,197,94,0.14)" : "rgba(255,92,92,0.14)",
                        color: isBuy ? "var(--profit)" : "var(--loss)"
                      }}
                    >
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                        {trade.pair}
                      </div>
                      <div className="font-mono-num" style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {trade.date?.replace("T", " ")} &bull; {trade.lotSize} lots
                      </div>
                    </div>
                  </div>
                  <div
                    className="font-mono-num"
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: pnl === 0 ? "var(--muted)" : isNeg ? "var(--loss)" : "var(--profit)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {isNeg ? (
                      <ArrowDownRight size={14} strokeWidth={2} />
                    ) : pnl > 0 ? (
                      <ArrowUpRight size={14} strokeWidth={2} />
                    ) : null}
                    {formatPnl(pnl)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* App Version */}
      <p
        className="font-mono-num"
        style={{ margin: "4px 0 0 0", textAlign: "center", fontSize: "11px", color: "var(--muted-soft)" }}
      >
        Eagle FX Book &bull; v{APP_VERSION}
      </p>
    </motion.div>
  );
}

function KpiCell({ label, value }) {
  const num = Number(value) || 0;
  const isNeg = num < 0;
  const color = num === 0 ? "var(--text)" : isNeg ? "var(--loss)" : "var(--profit)";
  return (
    <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700, marginBottom: "6px" }}>
        {label}
      </div>
      <div
        className="font-mono-num"
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color,
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}
      >
        {isNeg && <ArrowDownRight size={14} strokeWidth={2} />}
        {formatPnl(num)}
      </div>
    </div>
  );
}

const chipStyle = {
  fontSize: "11px",
  padding: "4px 9px",
  borderRadius: "999px",
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontWeight: 600
};

const chipRedStyle = {
  fontSize: "11px",
  padding: "4px 9px",
  borderRadius: "999px",
  backgroundColor: "rgba(225, 29, 46, 0.14)",
  border: "1px solid rgba(225, 29, 46, 0.32)",
  color: "var(--primary)",
  fontWeight: 700
};
