import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Flag,
  ImagePlus,
  Plus,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
  XCircle
} from "lucide-react";
import { compressImageToBase64 } from "../utils/formatters.js";
import { formatPlanDate, getPlanStatus } from "../utils/subscription.js";

export default function AdminDeskModal({
  users,
  orders,
  plans,
  newsEvents = [],
  actualOverrides = {},
  reports = [],
  adminSettings,
  onApproveOrder,
  onRejectOrder,
  onToggleUserBlock,
  onToggleChatMute,
  onSavePlan,
  onDeletePlan,
  onSaveActualOverride,
  onDeleteReport,
  onSavePaymentSettings,
  onClose
}) {
  const [tab, setTab] = useState("orders"); // "orders" | "users" | "plans" | "news" | "reports" | "settings"

  // Plan editor state
  const [planName, setPlanName] = useState("");
  const [durationLabel, setDurationLabel] = useState("30 Days");
  const [durationDays, setDurationDays] = useState("30");
  const [priceUsd, setPriceUsd] = useState("29");
  const [priceInr, setPriceInr] = useState("2499");
  const [badgeText, setBadgeText] = useState("POPULAR");
  const [featuresText, setFeaturesText] = useState("Unlimited journal, Live macro alerts");

  // Payment settings state
  const [upiId, setUpiId] = useState(adminSettings?.currentUpiId || "");
  const [upiQr, setUpiQr] = useState(adminSettings?.currentUpiQrImageBase64 || "");
  const [wallet, setWallet] = useState(adminSettings?.currentCryptoWalletAddress || "");
  const [network, setNetwork] = useState(adminSettings?.cryptoNetwork || "TRC20");

  // News actuals draft map
  const [actualDrafts, setActualDrafts] = useState({});
  const [newsSearch, setNewsSearch] = useState("");

  const [savingMsg, setSavingMsg] = useState("");

  const activeSubsCount = users.filter((u) => getPlanStatus(u, false).isActive).length;
  const pendingOrdersCount = orders.filter((o) => o.status === "Pending").length;

  const handleQrPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await compressImageToBase64(file, 480, 0.78);
    setUpiQr(b64);
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (!planName.trim()) return;
    await onSavePlan({
      name: planName.trim(),
      durationLabel: durationLabel.trim(),
      durationDays: Number(durationDays) || 30,
      priceUsd: Number(priceUsd) || 29,
      priceInr: Number(priceInr) || 2499,
      badgeText: badgeText.trim(),
      features: featuresText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    });
    setPlanName("");
    setSavingMsg("Subscription plan added.");
    window.setTimeout(() => setSavingMsg(""), 2500);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await onSavePaymentSettings({
      currentUpiId: upiId.trim(),
      currentUpiQrImageBase64: upiQr,
      currentCryptoWalletAddress: wallet.trim(),
      cryptoNetwork: network.trim() || "TRC20"
    });
    setSavingMsg("Payment QR & wallet saved.");
    window.setTimeout(() => setSavingMsg(""), 2500);
  };

  const handleSaveActual = async (evt) => {
    const val = (actualDrafts[evt.id] ?? actualOverrides[evt.id]?.actual ?? evt.actual ?? "").trim();
    await onSaveActualOverride?.(evt, val);
    setSavingMsg(`Saved actual for ${evt.event}`);
    window.setTimeout(() => setSavingMsg(""), 2500);
  };

  const filteredNews = newsEvents
    .filter((e) => {
      const q = newsSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (e.event || "").toLowerCase().includes(q) ||
        (e.currency || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 35);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 950,
        backgroundColor: "var(--modal-backdrop)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "10px"
      }}
    >
      <div className="pro-card" style={{ width: "100%", maxWidth: "430px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} strokeWidth={1.75} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
              Admin Desk
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target"
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          <MiniStat label="USERS" value={users.length} />
          <MiniStat label="ACTIVE SUBS" value={activeSubsCount} color="var(--profit)" />
          <MiniStat label="PENDING" value={pendingOrdersCount} color="var(--warning)" />
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "14px" }}>
          {[
            { id: "orders", label: `Orders (${pendingOrdersCount})` },
            { id: "users", label: "Users" },
            { id: "plans", label: "Plans" },
            { id: "news", label: "Actuals" },
            { id: "reports", label: `Reports (${reports.length})` },
            { id: "settings", label: "QR/Wallet" }
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  minHeight: "36px",
                  borderRadius: "10px",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#FFFFFF" : "var(--muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {savingMsg && (
          <div style={{ fontSize: "12px", color: "var(--profit)", marginBottom: "10px" }}>
            {savingMsg}
          </div>
        )}

        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {orders.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>No orders submitted yet.</p>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="pro-card-flat" style={{ padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>{ord.productName}</strong>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: ord.status === "Approved" ? "var(--profit)" : ord.status === "Rejected" ? "var(--loss)" : "var(--warning)" }}>
                      {ord.status}
                    </span>
                  </div>
                  <div className="font-mono-num" style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
                    {ord.userEmail} &bull; {ord.paymentMethod} &bull; Txn: {ord.transactionId}
                  </div>
                  {ord.paymentScreenshotBase64 && (
                    <img
                      src={ord.paymentScreenshotBase64}
                      alt="Payment proof"
                      style={{
                        width: "100%",
                        maxHeight: "140px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "8px",
                        border: "1px solid var(--border)"
                      }}
                    />
                  )}
                  {ord.status === "Pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-red"
                        style={{ flex: 1, backgroundColor: "#22C55E", color: "#050505", minHeight: "38px" }}
                        onClick={() => onApproveOrder(ord)}
                      >
                        <CheckCircle2 size={14} />
                        Approve &amp; Unlock
                      </button>
                      <button
                        type="button"
                        className="btn-surface"
                        style={{ flex: 1, color: "var(--loss)", minHeight: "38px" }}
                        onClick={() => onRejectOrder(ord)}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map((u) => {
              const blocked = u.accessStatus === "Blocked";
              const muted = u.chatMuted === true;
              const uPlan = getPlanStatus(u, u.role === "Admin");
              return (
                <div
                  key={u.id}
                  className="pro-card-flat"
                  style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 12px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                        {u.name || "Trader"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", wordBreak: "break-all" }}>
                        {u.email} &bull; {u.accessStatus || "Active"}
                      </div>
                      <div className="font-mono-num" style={{ fontSize: "11px", marginTop: "3px", color: uPlan.isActive ? "var(--profit)" : uPlan.status === "Expired" ? "var(--loss)" : "var(--muted)" }}>
                        Plan: {uPlan.planName} ({uPlan.status}) &bull;{" "}
                        {uPlan.isLifetime
                          ? "Lifetime"
                          : uPlan.expiryDateMillis
                            ? `Exp: ${formatPlanDate(uPlan.expiryDateMillis)}`
                            : "No expiry"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn-surface"
                      onClick={() => onToggleUserBlock(u)}
                      style={{
                        flex: 1,
                        minHeight: "34px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        color: blocked ? "var(--profit)" : "var(--loss)"
                      }}
                    >
                      <Ban size={13} />
                      {blocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      type="button"
                      className="btn-surface"
                      onClick={() => onToggleChatMute?.(u)}
                      style={{
                        flex: 1,
                        minHeight: "34px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        color: muted ? "var(--profit)" : "var(--warning)"
                      }}
                    >
                      {muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                      {muted ? "Unmute Chat" : "Mute Chat"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <form onSubmit={handleAddPlan} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="text"
                className="pro-input"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Plan Name (e.g. Pro 1 Year)"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input
                  type="text"
                  className="pro-input"
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  placeholder="30 Days"
                />
                <input
                  type="number"
                  className="pro-input font-mono-num"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Days (30)"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <input
                  type="number"
                  className="pro-input font-mono-num"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  placeholder="USD"
                />
                <input
                  type="number"
                  className="pro-input font-mono-num"
                  value={priceInr}
                  onChange={(e) => setPriceInr(e.target.value)}
                  placeholder="INR"
                />
                <input
                  type="text"
                  className="pro-input"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Badge"
                />
              </div>
              <input
                type="text"
                className="pro-input"
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="Features comma separated"
              />
              <button type="submit" className="btn-red">
                <Plus size={15} />
                Create Plan
              </button>
            </form>

            {plans.map((p) => (
              <div
                key={p.id}
                className="pro-card-flat"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}
              >
                <div>
                  <strong style={{ fontSize: "13px", color: "var(--text)" }}>{p.name}</strong>
                  <div className="font-mono-num" style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {p.durationLabel} &bull; ${p.priceUsd} / ₹{p.priceInr}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePlan(p.id)}
                  style={{ background: "transparent", border: "none", color: "var(--loss)", cursor: "pointer" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "news" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              className="pro-input"
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              placeholder="Filter news event to set live Actual..."
            />
            {filteredNews.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>No calendar events loaded.</p>
            ) : (
              filteredNews.map((evt) => {
                const currentVal = actualDrafts[evt.id] ?? actualOverrides[evt.id]?.actual ?? evt.actual ?? "";
                return (
                  <div key={`${evt.id}_${evt.timestampMillis}`} className="pro-card-flat" style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
                      <span>{evt.currency} &mdash; {evt.event}</span>
                      <span className="font-mono-num" style={{ color: "var(--muted)", fontSize: "11px" }}>
                        Fcst: {evt.forecast || "-"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className="pro-input font-mono-num"
                        value={currentVal}
                        onChange={(e) => setActualDrafts((prev) => ({ ...prev, [evt.id]: e.target.value }))}
                        placeholder="Actual value..."
                        style={{ minHeight: "36px", fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        className="btn-red"
                        onClick={() => handleSaveActual(evt)}
                        style={{ minHeight: "36px", padding: "5px 12px", fontSize: "11px" }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reports.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>No reported chat messages.</p>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} className="pro-card-flat" style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--loss)" }}>
                      <Flag size={13} />
                      Reported: {rep.reportedName || "User"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteReport?.(rep.id)}
                      style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "4px" }}>
                    &ldquo;{rep.messageText}&rdquo;
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                    Reporter UID: {rep.reporterUid}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "settings" && (
          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              className="pro-input font-mono-num"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="UPI ID (e.g. myfund@upi)"
            />
            <label className="btn-surface" style={{ cursor: "pointer" }}>
              <ImagePlus size={16} color="var(--primary)" />
              <span>{upiQr ? "Change UPI QR Image" : "Upload UPI QR Image"}</span>
              <input type="file" accept="image/*" onChange={handleQrPick} style={{ display: "none" }} />
            </label>
            <input
              type="text"
              className="pro-input font-mono-num"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Crypto Wallet Address"
            />
            <input
              type="text"
              className="pro-input"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              placeholder="Network (e.g. TRC20)"
            />
            <button type="submit" className="btn-red">
              Save Payment Settings
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = "var(--text)" }) {
  return (
    <div className="pro-card-flat" style={{ padding: "10px", textAlign: "center" }}>
      <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>{label}</div>
      <div className="font-mono-num" style={{ fontSize: "18px", fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}
