import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  ImagePlus,
  Package,
  ShoppingBag,
  Sparkles,
  X
} from "lucide-react";
import { compressImageToBase64 } from "../utils/formatters.js";

export default function StoreScreen({
  plans,
  products,
  orders,
  unlockedProducts,
  adminSettings,
  loading,
  onSubmitOrder
}) {
  const [tab, setTab] = useState("catalog"); // "catalog" | "orders"
  const [checkoutItem, setCheckoutItem] = useState(null); // { id, name, itemType, durationDays, amountLabel }
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [txnId, setTxnId] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleCopy = (val) => {
    if (!val) return;
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedText(val);
    window.setTimeout(() => setCopiedText(""), 1600);
  };

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageToBase64(file, 800, 0.72);
      setScreenshotBase64(b64);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitCheckout = async (e) => {
    e.preventDefault();
    setError("");
    if (txnId.trim().length < 4) {
      setError("Enter a valid Transaction / UTR / TxHash ID.");
      return;
    }
    if (!screenshotBase64) {
      setError("Please upload your payment confirmation screenshot.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitOrder({
        productId: checkoutItem.id,
        productName: checkoutItem.name,
        itemType: checkoutItem.itemType,
        durationDays: checkoutItem.durationDays || 0,
        amountLabel: checkoutItem.amountLabel,
        paymentMethod,
        transactionId: txnId.trim(),
        paymentScreenshotBase64: screenshotBase64
      });
      setCheckoutItem(null);
      setTxnId("");
      setScreenshotBase64("");
      setSuccessMsg("Order submitted! Status is Pending admin verification.");
      setTab("orders");
      window.setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="skeleton" style={{ height: "140px" }} />
        <div className="skeleton" style={{ height: "140px" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      {/* Store Switch */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px",
          borderRadius: "14px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)"
        }}
      >
        {[
          { id: "catalog", label: "Plans & Bots" },
          { id: "orders", label: `My Orders (${orders.length})` }
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                minHeight: "42px",
                border: "none",
                borderRadius: "10px",
                backgroundColor: active ? "var(--primary)" : "transparent",
                color: active ? "#FFFFFF" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {successMsg && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            backgroundColor: "rgba(34,197,94,0.14)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "var(--profit)",
            fontSize: "13px"
          }}
        >
          {successMsg}
        </div>
      )}

      {tab === "catalog" ? (
        <>
          {/* Subscription Plans */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} strokeWidth={1.75} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
              Eagle FX Book Plans
            </h3>
          </div>

          {plans.length === 0 ? (
            <div className="pro-card-flat" style={{ fontSize: "13px", color: "var(--muted)" }}>
              No active subscription plans right now.
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="pro-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)" }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {plan.durationLabel}
                    </div>
                  </div>
                  {plan.badgeText && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "4px 9px",
                        borderRadius: "999px",
                        backgroundColor: "rgba(225, 29, 46, 0.16)",
                        color: "var(--primary-hover)"
                      }}
                    >
                      {plan.badgeText}
                    </span>
                  )}
                </div>

                <div className="font-mono-num" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "10px" }}>
                  ${plan.priceUsd}{" "}
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                    / ₹{plan.priceInr}
                  </span>
                </div>

                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul style={{ margin: "0 0 14px 0", paddingLeft: "18px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.7 }}>
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="btn-red"
                  style={{ width: "100%" }}
                  onClick={() =>
                    setCheckoutItem({
                      id: plan.id,
                      name: plan.name,
                      itemType: "Plan",
                      durationDays: plan.durationDays,
                      amountLabel: `$${plan.priceUsd} / ₹${plan.priceInr}`
                    })
                  }
                >
                  Subscribe Now
                </button>
              </div>
            ))
          )}

          {/* Algo Bots & Software */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <Package size={16} strokeWidth={1.75} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
              Algo Bots &amp; Software
            </h3>
          </div>

          {products.length === 0 ? (
            <div className="pro-card-flat" style={{ fontSize: "13px", color: "var(--muted)" }}>
              Store catalog will appear here when added by Admin.
            </div>
          ) : (
            products.map((prod) => {
              const unlocked = unlockedProducts.find((u) => u.productId === prod.id);
              return (
                <div key={prod.id} className="pro-card-flat">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)" }}>
                      {prod.category} • v{prod.version}
                    </span>
                    <span className="font-mono-num" style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
                      ${prod.priceUsd} / ₹{prod.priceInr}
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 800, color: "var(--text)" }}>
                    {prod.name}
                  </h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
                    {prod.description}
                  </p>
                  {unlocked ? (
                    <a
                      href={unlocked.fileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-red"
                      style={{ width: "100%", textDecoration: "none", backgroundColor: "#22C55E", color: "#050505" }}
                    >
                      <Download size={16} strokeWidth={1.75} />
                      Download Unlocked Build
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn-red"
                      style={{ width: "100%" }}
                      onClick={() =>
                        setCheckoutItem({
                          id: prod.id,
                          name: prod.name,
                          itemType: "Product",
                          durationDays: 0,
                          amountLabel: `$${prod.priceUsd} / ₹${prod.priceInr}`
                        })
                      }
                    >
                      <ShoppingBag size={16} strokeWidth={1.75} />
                      Buy Software
                    </button>
                  )}
                </div>
              );
            })
          )}
        </>
      ) : orders.length === 0 ? (
        <div className="pro-card-flat" style={{ textAlign: "center", padding: "28px 16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
            You have not placed any orders yet.
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const statusColor =
            order.status === "Approved"
              ? "var(--profit)"
              : order.status === "Rejected"
                ? "var(--loss)"
                : "var(--warning)";
          const statusBg =
            order.status === "Approved"
              ? "rgba(34,197,94,0.14)"
              : order.status === "Rejected"
                ? "rgba(255,92,92,0.14)"
                : "rgba(245,179,1,0.14)";
          return (
            <div key={order.id} className="pro-card-flat">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
                  {order.productName}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 9px",
                    borderRadius: "999px",
                    backgroundColor: statusBg,
                    color: statusColor
                  }}
                >
                  {order.status}
                </span>
              </div>
              <div className="font-mono-num" style={{ fontSize: "12px", color: "var(--muted)" }}>
                {order.paymentMethod} • {order.amountLabel} • Txn: {order.transactionId}
              </div>
              {order.adminNote && (
                <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "6px" }}>
                  Note: {order.adminNote}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Checkout Sheet */}
      {checkoutItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 920,
            backgroundColor: "var(--modal-backdrop)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px"
          }}
        >
          <div className="pro-card" style={{ width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text)" }}>
                  Checkout: {checkoutItem.name}
                </h3>
                <p className="font-mono-num" style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--primary)" }}>
                  Amount: {checkoutItem.amountLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutItem(null)}
                className="touch-target"
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {["UPI", "Crypto"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    minHeight: "42px",
                    borderRadius: "12px",
                    border: paymentMethod === m ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    backgroundColor: paymentMethod === m ? "rgba(225,29,46,0.16)" : "var(--surface-2)",
                    color: paymentMethod === m ? "var(--text)" : "var(--muted)",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {m === "Crypto" ? `Crypto (${adminSettings.cryptoNetwork || "TRC20"})` : "UPI"}
                </button>
              ))}
            </div>

            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                marginBottom: "12px"
              }}
            >
              {paymentMethod === "UPI" ? (
                <>
                  {adminSettings.currentUpiQrImageBase64 && (
                    <img
                      src={adminSettings.currentUpiQrImageBase64}
                      alt="UPI QR"
                      style={{
                        width: "160px",
                        height: "160px",
                        objectFit: "contain",
                        display: "block",
                        margin: "0 auto 10px auto",
                        borderRadius: "10px",
                        backgroundColor: "#FFFFFF",
                        padding: "6px"
                      }}
                    />
                  )}
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>UPI ID</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span className="font-mono-num" style={{ fontSize: "13px", color: "var(--text)", wordBreak: "break-all" }}>
                      {adminSettings.currentUpiId || "eaglefx@upi"}
                    </span>
                    <button
                      type="button"
                      className="btn-surface"
                      style={{ minHeight: "36px", padding: "6px 10px" }}
                      onClick={() => handleCopy(adminSettings.currentUpiId || "eaglefx@upi")}
                    >
                      {copiedText === (adminSettings.currentUpiId || "eaglefx@upi") ? (
                        <Check size={14} color="var(--profit)" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
                    WALLET ({adminSettings.cryptoNetwork || "TRC20"})
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span className="font-mono-num" style={{ fontSize: "12px", color: "var(--text)", wordBreak: "break-all" }}>
                      {adminSettings.currentCryptoWalletAddress || "TX9EagleFxBookTrc20Wallet"}
                    </span>
                    <button
                      type="button"
                      className="btn-surface"
                      style={{ minHeight: "36px", padding: "6px 10px" }}
                      onClick={() =>
                        handleCopy(adminSettings.currentCryptoWalletAddress || "TX9EagleFxBookTrc20Wallet")
                      }
                    >
                      {copiedText ? <Check size={14} color="var(--profit)" /> : <Copy size={14} />}
                    </button>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleSubmitCheckout} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="text"
                className="pro-input font-mono-num"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="Enter UTR / Transaction ID / TxHash"
              />
              <label className="btn-surface" style={{ cursor: "pointer" }}>
                <ImagePlus size={16} strokeWidth={1.75} color="var(--primary)" />
                <span>{screenshotBase64 ? "Payment Screenshot Attached" : "Upload Payment Screenshot"}</span>
                <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display: "none" }} />
              </label>
              {error && <div style={{ fontSize: "12px", color: "var(--loss)" }}>{error}</div>}
              <button type="submit" disabled={submitting} className="btn-red">
                {submitting ? "Submitting..." : "Submit Payment Proof"}
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
