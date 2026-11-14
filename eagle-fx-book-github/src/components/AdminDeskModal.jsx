import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  ImagePlus,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  XCircle
} from "lucide-react";
import { compressImageToBase64 } from "../utils/formatters.js";

export default function AdminDeskModal({
  users,
  orders,
  plans,
  adminSettings,
  onApproveOrder,
  onRejectOrder,
  onToggleUserBlock,
  onSavePlan,
  onDeletePlan,
  onSavePaymentSettings,
  onClose
}) {
  const [tab, setTab] = useState("orders"); // "orders" | "users" | "plans" | "settings"

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
  const [savingMsg, setSavingMsg] = useState("");

  const activeSubsCount = users.filter((u) => u.subscriptionStatus && u.subscriptionStatus !== "None").length;
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        backgroundColor: "rgba(5, 5, 5, 0.86)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "10px"
      }}
    >
      <div className="pro-card" style={{ width: "100%", maxWidth: "430px", maxHeight: "92dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} strokeWidth={1.75} color="#E11D2E" />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#F5F5F7" }}>
              Admin Desk
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target"
            style={{ background: "transparent", border: "none", color: "#8B8B95", cursor: "pointer" }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          <MiniStat label="USERS" value={users.length} />
          <MiniStat label="ACTIVE SUBS" value={activeSubsCount} color="#22C55E" />
          <MiniStat label="PENDING" value={pendingOrdersCount} color="#F5B301" />
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "14px" }}>
          {[
            { id: "orders", label: "Orders" },
            { id: "users", label: "Users" },
            { id: "plans", label: "Plans" },
            { id: "settings", label: "QR/Wallet" }
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  minHeight: "38px",
                  borderRadius: "10px",
                  border: active ? "1px solid #E11D2E" : "1px solid #23232A",
                  backgroundColor: active ? "#E11D2E" : "#141418",
                  color: active ? "#FFFFFF" : "#8B8B95",
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
          <div style={{ fontSize: "12px", color: "#22C55E", marginBottom: "10px" }}>
            {savingMsg}
          </div>
        )}

        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {orders.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#8B8B95" }}>No orders submitted yet.</p>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="pro-card-flat" style={{ padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "14px", color: "#F5F5F7" }}>{ord.productName}</strong>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#F5B301" }}>{ord.status}</span>
                  </div>
                  <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95", marginBottom: "8px" }}>
                    {ord.userEmail} • {ord.paymentMethod} • Txn: {ord.transactionId}
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
                        border: "1px solid #23232A"
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
                        style={{ flex: 1, color: "#FF5C5C", minHeight: "38px" }}
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
              return (
                <div
                  key={u.id}
                  className="pro-card-flat"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#F5F5F7" }}>
                      {u.name || "Trader"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8B8B95" }}>
                      {u.email} • {u.accessStatus || "Active"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-surface"
                    onClick={() => onToggleUserBlock(u)}
                    style={{
                      minHeight: "36px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      color: blocked ? "#22C55E" : "#FF5C5C"
                    }}
                  >
                    <Ban size={13} />
                    {blocked ? "Unblock" : "Block"}
                  </button>
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
                  <strong style={{ fontSize: "13px", color: "#F5F5F7" }}>{p.name}</strong>
                  <div className="font-mono-num" style={{ fontSize: "11px", color: "#8B8B95" }}>
                    {p.durationLabel} • ${p.priceUsd} / ₹{p.priceInr}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePlan(p.id)}
                  style={{ background: "transparent", border: "none", color: "#FF5C5C", cursor: "pointer" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
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
              <ImagePlus size={16} color="#E11D2E" />
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

function MiniStat({ label, value, color = "#F5F5F7" }) {
  return (
    <div className="pro-card-flat" style={{ padding: "10px", textAlign: "center" }}>
      <div style={{ fontSize: "10px", color: "#8B8B95", fontWeight: 700 }}>{label}</div>
      <div className="font-mono-num" style={{ fontSize: "18px", fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}
