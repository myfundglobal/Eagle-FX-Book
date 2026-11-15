import { useMemo, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import {
  calculateRMultiple,
  compressImageToBase64
} from "../utils/formatters.js";

const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
  "BTC/USD",
  "ETH/USD",
  "NAS100",
  "US30"
];

const BASE_STRATEGIES = ["SMC", "ICT", "Liquidity", "OrderBlock"];

function defaultDateTime(prefillDate) {
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  const datePart = prefillDate || now.toISOString().split("T")[0];
  return `${datePart}T${time}`;
}

export default function TradeFormSheet({
  existingTrade,
  prefillDate,
  customTags,
  onSave,
  onClose
}) {
  const [dateTime, setDateTime] = useState(
    existingTrade?.date?.includes("T")
      ? existingTrade.date
      : existingTrade?.date
        ? `${existingTrade.date}T12:00`
        : defaultDateTime(prefillDate)
  );
  const [pair, setPair] = useState(existingTrade?.pair || "EUR/USD");
  const [pairSearch, setPairSearch] = useState("");
  const [showPairPicker, setShowPairPicker] = useState(false);
  const [side, setSide] = useState(existingTrade?.side || "Buy");
  const [entryPrice, setEntryPrice] = useState(
    existingTrade?.entryPrice ? String(existingTrade.entryPrice) : ""
  );
  const [stopLoss, setStopLoss] = useState(
    existingTrade?.stopLoss ? String(existingTrade.stopLoss) : ""
  );
  const [takeProfit, setTakeProfit] = useState(
    existingTrade?.takeProfit ? String(existingTrade.takeProfit) : ""
  );
  const [exitPrice, setExitPrice] = useState(
    existingTrade?.exitPrice ? String(existingTrade.exitPrice) : ""
  );
  const [lotSize, setLotSize] = useState(
    existingTrade?.lotSize ? String(existingTrade.lotSize) : "0.10"
  );
  const [pnl, setPnl] = useState(
    existingTrade?.pnl !== undefined ? String(existingTrade.pnl) : ""
  );
  const [selectedTags, setSelectedTags] = useState(
    Array.isArray(existingTrade?.strategyTags) ? existingTrade.strategyTags : ["SMC"]
  );
  const [notes, setNotes] = useState(existingTrade?.notes || "");
  const [screenshotBase64, setScreenshotBase64] = useState(
    existingTrade?.screenshotBase64 || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableStrategies = [...new Set([...BASE_STRATEGIES, ...customTags])];

  const computedR = useMemo(() => {
    return calculateRMultiple({ side, entryPrice, stopLoss, exitPrice });
  }, [side, entryPrice, stopLoss, exitPrice]);

  const filteredPairs = PAIRS.filter((p) =>
    p.toLowerCase().includes(pairSearch.trim().toLowerCase())
  );

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageToBase64(file, 900, 0.72);
      setScreenshotBase64(b64);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPair = pair.trim().toUpperCase();
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const sl = stopLoss ? parseFloat(stopLoss) : 0;
    const tp = takeProfit ? parseFloat(takeProfit) : 0;
    const lot = parseFloat(lotSize);
    const resultPnl = parseFloat(pnl);

    if (!cleanPair) {
      setError("Please select or enter a trading pair.");
      return;
    }
    if (Number.isNaN(entry) || entry <= 0 || Number.isNaN(exit) || exit <= 0) {
      setError("Entry and Exit prices must be positive numbers.");
      return;
    }
    if (Number.isNaN(lot) || lot <= 0) {
      setError("Lot size must be greater than 0.");
      return;
    }
    if (Number.isNaN(resultPnl)) {
      setError("Please enter Result P&L in $ (e.g. 125 or -45).");
      return;
    }

    const dateOnly = dateTime.split("T")[0] || new Date().toISOString().split("T")[0];

    setSaving(true);
    try {
      await onSave({
        id: existingTrade?.id || null,
        date: (dateTime || dateOnly).slice(0, 16),
        monthKey: dateOnly.slice(0, 7),
        pair: cleanPair,
        side,
        entryPrice: entry,
        stopLoss: Number.isNaN(sl) ? 0 : sl,
        takeProfit: Number.isNaN(tp) ? 0 : tp,
        exitPrice: exit,
        lotSize: lot,
        pnl: resultPnl,
        riskReward: Math.max(0, Math.min(1000, Number(computedR) || 0)),
        strategyTags: selectedTags,
        notes: notes.trim(),
        screenshotBase64
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save trade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 920,
        backgroundColor: "var(--modal-backdrop)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "10px"
      }}
    >
      <div
        className="pro-card"
        style={{ width: "100%", maxWidth: "430px", maxHeight: "92dvh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
            {existingTrade ? "Edit Trade" : "Log New Execution"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target"
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={lbl}>DATE &amp; TIME</label>
            <input
              type="datetime-local"
              className="pro-input font-mono-num"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          {/* Searchable Pair Dropdown */}
          <div>
            <label style={lbl}>PAIR / SYMBOL</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="pro-input font-mono-num"
                value={pair}
                onChange={(e) => setPair(e.target.value.toUpperCase())}
                onFocus={() => setShowPairPicker(true)}
                placeholder="EUR/USD or custom"
              />
              <button
                type="button"
                className="btn-surface"
                onClick={() => setShowPairPicker((v) => !v)}
              >
                Pairs
              </button>
            </div>
            {showPairPicker && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "14px",
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)"
                }}
              >
                <input
                  type="text"
                  className="pro-input"
                  value={pairSearch}
                  onChange={(e) => setPairSearch(e.target.value)}
                  placeholder="Filter pairs..."
                  style={{ marginBottom: "8px" }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {filteredPairs.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPair(p);
                        setShowPairPicker(false);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: pair === p ? "1px solid var(--primary)" : "1px solid var(--border)",
                        backgroundColor: pair === p ? "rgba(225,29,46,0.16)" : "var(--surface)",
                        color: "var(--text)",
                        cursor: "pointer"
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buy / Sell */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {["Buy", "Sell"].map((opt) => {
              const active = side === opt;
              const col = opt === "Buy" ? "var(--profit)" : "var(--loss)";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSide(opt)}
                  style={{
                    minHeight: "44px",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                    border: active ? `1.5px solid ${col}` : "1px solid var(--border)",
                    backgroundColor: active
                      ? opt === "Buy"
                        ? "rgba(34,197,94,0.14)"
                        : "rgba(255,92,92,0.14)"
                      : "var(--surface-2)",
                    color: active ? col : "var(--muted)"
                  }}
                >
                  {opt.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={lbl}>ENTRY</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="1.08450"
              />
            </div>
            <div>
              <label style={lbl}>EXIT</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="1.08920"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={lbl}>STOP LOSS (FOR R)</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="1.08250"
              />
            </div>
            <div>
              <label style={lbl}>TAKE PROFIT</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="1.09100"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={lbl}>LOT SIZE</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="0.10"
              />
            </div>
            <div>
              <label style={lbl}>RESULT P&amp;L ($)</label>
              <input
                type="number"
                step="any"
                className="pro-input font-mono-num"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                placeholder="120 or -45"
              />
            </div>
          </div>

          {stopLoss && entryPrice && exitPrice && (
            <div
              className="font-mono-num"
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                color: computedR >= 0 ? "var(--profit)" : "var(--loss)"
              }}
            >
              Auto R-Multiple: {computedR >= 0 ? "+" : ""}
              {computedR}R
            </div>
          )}

          {/* Strategy Multi-Select Chips */}
          <div>
            <label style={lbl}>STRATEGY TAGS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {availableStrategies.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                      backgroundColor: active ? "rgba(225, 29, 46, 0.16)" : "var(--surface-2)",
                      color: active ? "var(--primary-hover)" : "var(--muted)"
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={lbl}>EMOTION / NOTES</label>
            <textarea
              rows={2}
              className="pro-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Patient entry on liquidity sweep, calm execution..."
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label style={lbl}>CHART SCREENSHOT</label>
            {screenshotBase64 ? (
              <div style={{ position: "relative" }}>
                <img
                  src={screenshotBase64}
                  alt="Trade chart"
                  style={{
                    width: "100%",
                    maxHeight: "140px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    border: "1px solid var(--border)"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setScreenshotBase64("")}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--loss)",
                    borderRadius: "8px",
                    padding: "6px",
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <label className="btn-surface" style={{ width: "100%", cursor: "pointer" }}>
                <ImagePlus size={16} strokeWidth={1.75} color="var(--primary)" />
                <span>Upload Chart Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          {error && <div style={{ fontSize: "12px", color: "var(--loss)" }}>{error}</div>}

          <button type="submit" disabled={saving} className="btn-red">
            {saving ? "Saving..." : existingTrade ? "Update Trade" : "Save Trade"}
          </button>
        </form>
      </div>
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.8px",
  color: "var(--muted)",
  marginBottom: "6px"
};
