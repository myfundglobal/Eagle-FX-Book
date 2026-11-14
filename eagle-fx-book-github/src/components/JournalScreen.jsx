import { useRef, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import { computeMonthlyJournalData, parseTradeDate } from "../utils/analytics.js";
import { formatCompactPnl, formatPnl } from "../utils/formatters.js";

const DEFAULT_TAGS = ["SMC", "ICT", "Liquidity", "OrderBlock"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function JournalScreen({
  trades,
  loading,
  customTags,
  onAddCustomTag,
  onOpenAddTrade,
  onEditTrade,
  onDeleteTrade
}) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "list"
  const [selectedStrategy, setSelectedStrategy] = useState("All");
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagAdder, setShowTagAdder] = useState(false);
  const [searchPair, setSearchPair] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const touchStartX = useRef(0);

  const allStrategies = ["All", ...DEFAULT_TAGS, ...customTags];

  const filteredTrades = trades.filter((t) => {
    const matchesStrategy =
      selectedStrategy === "All" ||
      (Array.isArray(t.strategyTags) && t.strategyTags.includes(selectedStrategy));
    const matchesPair =
      !searchPair.trim() ||
      (t.pair || "").toLowerCase().includes(searchPair.trim().toLowerCase());
    return matchesStrategy && matchesPair;
  });

  const journal = computeMonthlyJournalData(filteredTrades, monthDate);
  const selectedDayData = selectedDayKey ? journal.dailyMap.get(selectedDayKey) : null;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 55) setMonthDate((d) => subMonths(d, 1));
    else if (dx < -55) setMonthDate((d) => addMonths(d, 1));
  };

  const handleCreateTag = (e) => {
    e.preventDefault();
    const clean = newTagInput.trim();
    if (!clean) return;
    onAddCustomTag(clean);
    setSelectedStrategy(clean);
    setNewTagInput("");
    setShowTagAdder(false);
  };

  // Group trades for List View
  const groupedList = filteredTrades
    .slice()
    .sort((a, b) => parseTradeDate(b).getTime() - parseTradeDate(a).getTime())
    .reduce((acc, t) => {
      const key = format(parseTradeDate(t), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="skeleton" style={{ height: "54px" }} />
        <div className="skeleton" style={{ height: "320px" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "28px" }}
    >
      {/* Month Selector + Calendar/List Toggle */}
      <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px"
          }}
        >
          <button
            type="button"
            className="btn-surface touch-target"
            onClick={() => setMonthDate((d) => subMonths(d, 1))}
            aria-label="Previous month"
            style={{ width: "44px", padding: 0 }}
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#F5F5F7" }}>
              {format(monthDate, "MMMM yyyy")}
            </div>
            <div style={{ fontSize: "11px", color: "#8B8B95" }}>
              Swipe left / right to switch month
            </div>
          </div>

          <button
            type="button"
            className="btn-surface touch-target"
            onClick={() => setMonthDate((d) => addMonths(d, 1))}
            aria-label="Next month"
            style={{ width: "44px", padding: 0 }}
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            padding: "4px",
            borderRadius: "12px",
            backgroundColor: "#141418",
            border: "1px solid #23232A"
          }}
        >
          {["calendar", "list"].map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  minHeight: "38px",
                  border: "none",
                  borderRadius: "9px",
                  backgroundColor: active ? "#E11D2E" : "transparent",
                  color: active ? "#FFFFFF" : "#8B8B95",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Strategy Filter Chips + Add Custom Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
        {allStrategies.map((tag) => {
          const active = selectedStrategy === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedStrategy(tag)}
              style={{
                minHeight: "36px",
                padding: "6px 12px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: active ? "1px solid #E11D2E" : "1px solid #23232A",
                backgroundColor: active ? "rgba(225, 29, 46, 0.16)" : "#0D0D10",
                color: active ? "#FF2D3D" : "#8B8B95"
              }}
            >
              {tag}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowTagAdder((s) => !s)}
          style={{
            minHeight: "36px",
            padding: "6px 12px",
            borderRadius: "999px",
            whiteSpace: "nowrap",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            border: "1px dashed #E11D2E",
            backgroundColor: "transparent",
            color: "#E11D2E"
          }}
        >
          + Tag
        </button>
      </div>

      {showTagAdder && (
        <form onSubmit={handleCreateTag} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="pro-input"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Custom strategy (e.g. FVG, NY Open)"
          />
          <button type="submit" className="btn-red" style={{ flexShrink: 0 }}>
            Add
          </button>
        </form>
      )}

      {/* 4 Monthly Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={statLabel}>MONTHLY P&amp;L</div>
          <div
            className="font-mono-num"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              color:
                journal.monthlyPnl === 0
                  ? "#F5F5F7"
                  : journal.monthlyPnl < 0
                    ? "#FF5C5C"
                    : "#22C55E",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            {journal.monthlyPnl < 0 && <ArrowDownRight size={14} strokeWidth={2} />}
            {formatPnl(journal.monthlyPnl)}
          </div>
        </div>

        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={statLabel}>WIN RATE</div>
          <div className="font-mono-num" style={{ fontSize: "17px", fontWeight: 800, color: "#F5F5F7" }}>
            {journal.winRate}%
          </div>
          <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
            {journal.wins}W / {journal.losses}L
          </div>
        </div>

        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={statLabel}>STREAK</div>
          <div
            className="font-mono-num"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              color: journal.streakIsWin ? "#22C55E" : "#FF5C5C"
            }}
          >
            {journal.streakLabel}
          </div>
          <div style={{ fontSize: "11px", color: "#8B8B95" }}>Current day streak</div>
        </div>

        <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
          <div style={statLabel}>TRADING DAYS</div>
          <div className="font-mono-num" style={{ fontSize: "17px", fontWeight: 800, color: "#F5F5F7" }}>
            {journal.tradingDaysCount}
          </div>
          <div style={{ fontSize: "11px", color: "#8B8B95" }}>
            {journal.profitableDays} profitable
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <>
          {/* Calendar Grid */}
          <div
            className="pro-card"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ padding: "14px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "6px",
                marginBottom: "8px",
                textAlign: "center"
              }}
            >
              {WEEKDAYS.map((day, idx) => (
                <div key={idx} style={{ fontSize: "11px", fontWeight: 700, color: "#8B8B95" }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
              {journal.calendarCells.map((cell) => {
                const hasTrades = cell.trades.length > 0;
                const isProfit = hasTrades && cell.pnl > 0;
                const isLoss = hasTrades && cell.pnl < 0;

                const bg = isProfit
                  ? "rgba(34, 197, 94, 0.14)"
                  : isLoss
                    ? "rgba(255, 92, 92, 0.14)"
                    : "#141418";

                const border = cell.isToday
                  ? "1.5px solid #E11D2E"
                  : isProfit
                    ? "1px solid rgba(34, 197, 94, 0.35)"
                    : isLoss
                      ? "1px solid rgba(255, 92, 92, 0.35)"
                      : "1px solid #23232A";

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDayKey(cell.dateKey)}
                    style={{
                      minHeight: "54px",
                      padding: "4px 2px",
                      borderRadius: "10px",
                      backgroundColor: bg,
                      border,
                      opacity: cell.inCurrentMonth ? 1 : 0.32,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer"
                    }}
                  >
                    <span
                      className="font-mono-num"
                      style={{
                        fontSize: "11px",
                        fontWeight: cell.isToday ? 800 : 600,
                        color: cell.isToday ? "#E11D2E" : "#F5F5F7"
                      }}
                    >
                      {format(cell.date, "d")}
                    </span>
                    {hasTrades && (
                      <span
                        className="font-mono-num"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: isLoss ? "#FF5C5C" : "#22C55E",
                          lineHeight: 1.1
                        }}
                      >
                        {formatCompactPnl(cell.pnl)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                marginTop: "12px",
                fontSize: "11px",
                color: "#8B8B95"
              }}
            >
              <LegendDot color="#22C55E" label="Profit" />
              <LegendDot color="#FF5C5C" label="Loss" />
              <LegendDot color="#E11D2E" label="Today" outline />
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="pro-card-flat">
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#F5F5F7" }}>
              Weekly Breakdown
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {journal.weeks.map((wk) => {
                const isNeg = wk.pnl < 0;
                const pnlColor = wk.pnl === 0 ? "#8B8B95" : isNeg ? "#FF5C5C" : "#22C55E";
                return (
                  <div
                    key={wk.weekIndex}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "14px",
                      backgroundColor: "#141418",
                      border: "1px solid #23232A"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F5F5F7" }}>
                          Week {wk.weekIndex}
                        </span>{" "}
                        <span style={{ fontSize: "11px", color: "#8B8B95" }}>
                          ({wk.rangeLabel})
                        </span>
                      </div>
                      <span
                        className="font-mono-num"
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: pnlColor,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                      >
                        {isNeg && <ArrowDownRight size={13} strokeWidth={2} />}
                        {formatPnl(wk.pnl)}
                      </span>
                    </div>

                    <div
                      className="font-mono-num"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        color: "#8B8B95",
                        marginBottom: "6px"
                      }}
                    >
                      <span>{wk.tradesCount} trades</span>
                      <span>Win rate {wk.winRate}%</span>
                    </div>

                    <div style={{ height: "5px", borderRadius: "999px", backgroundColor: "#23232A", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${wk.winRate}%`,
                          height: "100%",
                          backgroundColor: "#E11D2E",
                          borderRadius: "999px"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              strokeWidth={1.75}
              color="#8B8B95"
              style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className="pro-input"
              value={searchPair}
              onChange={(e) => setSearchPair(e.target.value)}
              placeholder="Search pair (e.g. XAU/USD, EUR/USD)..."
              style={{ paddingLeft: "40px" }}
            />
          </div>

          {Object.keys(groupedList).length === 0 ? (
            <div className="pro-card-flat" style={{ textAlign: "center", padding: "28px 16px" }}>
              <CalendarDays size={28} strokeWidth={1.75} color="#E11D2E" style={{ marginBottom: "8px" }} />
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#8B8B95" }}>
                No trades match your filters.
              </p>
              <button type="button" className="btn-red" onClick={() => onOpenAddTrade()}>
                <Plus size={16} strokeWidth={1.75} />
                Add Trade
              </button>
            </div>
          ) : (
            Object.entries(groupedList).map(([dateKey, dayTrades]) => (
              <div key={dateKey} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="font-mono-num" style={{ fontSize: "11px", fontWeight: 700, color: "#8B8B95", paddingLeft: "4px" }}>
                  {dateKey}
                </div>
                {dayTrades.map((trade) => (
                  <TradeDetailRow
                    key={trade.id}
                    trade={trade}
                    onEdit={() => onEditTrade(trade)}
                    onDelete={() => onDeleteTrade(trade.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        type="button"
        onClick={() => onOpenAddTrade()}
        aria-label="Add trade"
        style={{
          position: "fixed",
          right: "20px",
          bottom: "calc(92px + env(safe-area-inset-bottom))",
          width: "54px",
          height: "54px",
          borderRadius: "18px",
          backgroundColor: "#E11D2E",
          color: "#FFFFFF",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          boxShadow: "0 12px 28px rgba(225, 29, 46, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 60
        }}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* Day Trades Bottom Sheet */}
      {selectedDayKey && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 850,
            backgroundColor: "rgba(5, 5, 5, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px"
          }}
        >
          <div
            className="pro-card"
            style={{ width: "100%", maxWidth: "430px", maxHeight: "82dvh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#F5F5F7" }}>
                  Trades on {selectedDayKey}
                </h3>
                <p className="font-mono-num" style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8B8B95" }}>
                  Net: {formatPnl(selectedDayData?.pnl || 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="touch-target"
                style={{ background: "transparent", border: "none", color: "#8B8B95", cursor: "pointer" }}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            {(!selectedDayData || selectedDayData.trades.length === 0) ? (
              <p style={{ fontSize: "13px", color: "#8B8B95", margin: "12px 0" }}>
                No trades recorded for this day.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                {selectedDayData.trades.map((trade) => (
                  <TradeDetailRow
                    key={trade.id}
                    trade={trade}
                    onEdit={() => {
                      setSelectedDayKey(null);
                      onEditTrade(trade);
                    }}
                    onDelete={() => onDeleteTrade(trade.id)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn-red"
              style={{ width: "100%" }}
              onClick={() => {
                const dateToPass = selectedDayKey;
                setSelectedDayKey(null);
                onOpenAddTrade(dateToPass);
              }}
            >
              <Plus size={17} strokeWidth={1.75} />
              Add trade for this day
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TradeDetailRow({ trade, onEdit, onDelete }) {
  const pnl = Number(trade.pnl) || 0;
  const isBuy = (trade.side || "Buy") === "Buy";
  const isNeg = pnl < 0;

  return (
    <div className="pro-card-flat" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px", fontWeight: 800, color: "#F5F5F7" }}>{trade.pair}</span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: "8px",
              backgroundColor: isBuy ? "rgba(34,197,94,0.14)" : "rgba(255,92,92,0.14)",
              color: isBuy ? "#22C55E" : "#FF5C5C"
            }}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>
          {(trade.riskReward ?? trade.rMultiple) ? (
            <span className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
              {(trade.riskReward ?? trade.rMultiple) > 0 ? "+" : ""}
              {trade.riskReward ?? trade.rMultiple}R
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="font-mono-num"
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: isNeg ? "#FF5C5C" : pnl > 0 ? "#22C55E" : "#8B8B95",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px"
            }}
          >
            {isNeg && <ArrowDownRight size={14} strokeWidth={2} />}
            {formatPnl(pnl)}
          </span>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit trade"
            style={iconBtnStyle}
          >
            <Edit3 size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete trade"
            style={{ ...iconBtnStyle, color: "#FF5C5C" }}
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        className="font-mono-num"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
          fontSize: "11px",
          color: "#8B8B95",
          marginBottom: trade.notes || trade.screenshotBase64 ? "8px" : "0"
        }}
      >
        <span>Lot: <strong style={{ color: "#F5F5F7" }}>{trade.lotSize}</strong></span>
        <span>Entry: <strong style={{ color: "#F5F5F7" }}>{trade.entryPrice}</strong></span>
        <span>Exit: <strong style={{ color: "#F5F5F7" }}>{trade.exitPrice}</strong></span>
      </div>

      {Array.isArray(trade.strategyTags) && trade.strategyTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
          {trade.strategyTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "rgba(225, 29, 46, 0.14)",
                color: "#FF2D3D",
                fontWeight: 600
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {trade.notes && (
        <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#8B8B95", lineHeight: 1.45 }}>
          {trade.notes}
        </p>
      )}

      {trade.screenshotBase64 && (
        <img
          src={trade.screenshotBase64}
          alt="Trade setup screenshot"
          style={{
            width: "100%",
            maxHeight: "140px",
            objectFit: "cover",
            borderRadius: "10px",
            marginTop: "8px",
            border: "1px solid #23232A"
          }}
        />
      )}
    </div>
  );
}

function LegendDot({ color, label, outline }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "3px",
          backgroundColor: outline ? "transparent" : color,
          border: outline ? `1.5px solid ${color}` : "none"
        }}
      />
      {label}
    </span>
  );
}

const statLabel = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.7px",
  color: "#8B8B95",
  marginBottom: "4px"
};

const iconBtnStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  backgroundColor: "#141418",
  border: "1px solid #23232A",
  color: "#F5F5F7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
};
