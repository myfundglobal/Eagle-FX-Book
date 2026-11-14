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

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.1.0";
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
  const color = value === 0 ? "#F5F5F7" : isNeg ? "#FF5C5C" : "#22C55E";

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
      {isNeg && <ArrowDownRight size={24} strokeWidth={2.2} color="#FF5C5C" />}
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
  onAddTrade,
  onViewAllJournal,
  onOpenNews
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
      : [{ name: "Empty", value: 1, color: "#23232A" }];

  const rewardRatioPct =
    stats.avgRR > 0 ? Math.min(100, Math.round((stats.avgRR / (1 + stats.avgRR)) * 100)) : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
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
          <span style={{ fontSize: "12px", color: "#8B8B95", fontWeight: 600 }}>
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
                  border: active ? "1px solid #E11D2E" : "1px solid #23232A",
                  backgroundColor: active ? "rgba(225, 29, 46, 0.16)" : "#141418",
                  color: active ? "#FF2D3D" : "#8B8B95"
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
                    backgroundColor: "#141418",
                    border: "1px solid #23232A",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "#F5F5F7"
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
                backgroundColor: "#141418",
                border: "1px dashed #23232A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "#8B8B95",
                fontSize: "12px"
              }}
            >
              <TrendingUp size={16} strokeWidth={1.75} color="#E11D2E" />
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
          <div style={{ fontSize: "11px", color: "#8B8B95", fontWeight: 700, marginBottom: "6px" }}>
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
              <div className="font-mono-num" style={{ fontSize: "20px", fontWeight: 800, color: "#F5F5F7" }}>
                {stats.winRate.toFixed(0)}%
              </div>
              <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
                {stats.winsCount}W / {stats.lossesCount}L
              </div>
            </div>
          </div>
        </div>

        <div className="pro-card-flat" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#8B8B95", fontWeight: 700, marginBottom: "6px" }}>
              AVG RISK : REWARD
            </div>
            <div className="font-mono-num" style={{ fontSize: "20px", fontWeight: 800, color: "#F5F5F7" }}>
              1 : {stats.avgRR.toFixed(2)}
            </div>
          </div>
          <div>
            <div
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "999px",
                backgroundColor: "#23232A",
                overflow: "hidden",
                display: "flex",
                marginTop: "10px"
              }}
            >
              <div style={{ width: `${100 - rewardRatioPct}%`, backgroundColor: "#FF5C5C" }} />
              <div style={{ width: `${rewardRatioPct}%`, backgroundColor: "#22C55E" }} />
            </div>
            <div
              className="font-mono-num"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "#8B8B95",
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
        <KpiCell label="TODAY'S P&L" value={stats.todayPnl} isPnl />
        <KpiCell label="THIS WEEK P&L" value={stats.weekPnl} isPnl />
        <KpiCell label="BEST TRADE" value={stats.bestTrade} isPnl />
        <KpiCell label="WORST TRADE" value={stats.worstTrade} isPnl />
        <KpiCell
          label="MAX DRAWDOWN"
          value={stats.maxDrawdown > 0 ? -stats.maxDrawdown : 0}
          isPnl
        />
        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: "10px", color: "#8B8B95", fontWeight: 700, marginBottom: "6px" }}>
            EXPECTANCY (AVG R)
          </div>
          <div
            className="font-mono-num"
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: stats.expectancyR >= 0 ? "#22C55E" : "#FF5C5C",
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
            <BellRing size={15} strokeWidth={1.75} color="#E11D2E" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#E11D2E", letterSpacing: "0.7px" }}>
              NEXT HIGH-IMPACT CATALYST
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={1.75} color="#8B8B95" />
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
                    color: "#FF2D3D"
                  }}
                >
                  {nextCatalyst.currency}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#F5F5F7" }}>
                  {nextCatalyst.event}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#8B8B95" }}>
                Forecast: {nextCatalyst.forecast || "-"} • Prev: {nextCatalyst.previous || "-"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", color: "#8B8B95", marginBottom: "2px" }}>IN</div>
              <div className="font-mono-num" style={{ fontSize: "15px", fontWeight: 800, color: "#F5B301" }}>
                {formatCountdown(nextCatalyst.timestampMillis, nowMillis)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#8B8B95" }}>
            <CalendarClock size={16} strokeWidth={1.75} />
            <span>No upcoming high-impact releases remaining today.</span>
          </div>
        )}
      </div>

      {/* 5. Recent Executions */}
      <div className="pro-card-flat">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F5F5F7" }}>
            Recent Executions
          </h3>
          <button
            type="button"
            onClick={onViewAllJournal}
            style={{
              background: "transparent",
              border: "none",
              color: "#E11D2E",
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
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#8B8B95" }}>
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
                    backgroundColor: "#141418",
                    border: "1px solid #23232A"
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
                        color: isBuy ? "#22C55E" : "#FF5C5C"
                      }}
                    >
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#F5F5F7" }}>
                        {trade.pair}
                      </div>
                      <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
                        {trade.date?.replace("T", " ")} • {trade.lotSize} lots
                      </div>
                    </div>
                  </div>
                  <div
                    className="font-mono-num"
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: pnl === 0 ? "#8B8B95" : isNeg ? "#FF5C5C" : "#22C55E",
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
        style={{ margin: "4px 0 0 0", textAlign: "center", fontSize: "11px", color: "#5e5e68" }}
      >
        Eagle FX Book • v{APP_VERSION}
      </p>
    </motion.div>
  );
}

function KpiCell({ label, value }) {
  const num = Number(value) || 0;
  const isNeg = num < 0;
  const color = num === 0 ? "#F5F5F7" : isNeg ? "#FF5C5C" : "#22C55E";
  return (
    <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: "10px", color: "#8B8B95", fontWeight: 700, marginBottom: "6px" }}>
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
  backgroundColor: "#141418",
  border: "1px solid #23232A",
  color: "#F5F5F7",
  fontWeight: 600
};

const chipRedStyle = {
  fontSize: "11px",
  padding: "4px 9px",
  borderRadius: "999px",
  backgroundColor: "rgba(225, 29, 46, 0.14)",
  border: "1px solid rgba(225, 29, 46, 0.32)",
  color: "#FF2D3D",
  fontWeight: 700
};
