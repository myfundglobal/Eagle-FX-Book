import { Lock, Sparkles } from "lucide-react";

export default function LockedFeatureCard({ planInfo, onViewPlans }) {
  const isExpired = planInfo?.status === "Expired";

  return (
    <div
      className="pro-card"
      style={{
        textAlign: "center",
        padding: "30px 18px",
        marginTop: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px"
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          backgroundColor: "rgba(225, 29, 46, 0.14)",
          border: "1px solid rgba(225, 29, 46, 0.38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--primary)"
        }}
      >
        <Lock size={26} strokeWidth={1.85} />
      </div>

      <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>
        {isExpired ? "Subscription Expired" : "Subscribe to unlock Eagle FX Book"}
      </h2>

      <p
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.55,
          color: "var(--muted)",
          maxWidth: "320px"
        }}
      >
        {isExpired
          ? `Your ${planInfo?.planName || "trading plan"} has expired. Renew your subscription in the Store to restore full access to your Dashboard, Journal, News Calendar, and Community Chat.`
          : "Unlock the Trading Dashboard, Trade Journal & Calendar Analytics, Economic News Calendar, and Private Traders Community + Live Chat with an active plan."}
      </p>

      <button
        type="button"
        className="btn-red"
        onClick={onViewPlans}
        style={{ width: "100%", maxWidth: "240px", marginTop: "4px" }}
      >
        <Sparkles size={16} strokeWidth={1.85} />
        {isExpired ? "Renew Plan" : "View Plans"}
      </button>
    </div>
  );
}
