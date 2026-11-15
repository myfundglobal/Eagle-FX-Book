import { AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { formatPlanDate } from "../utils/subscription.js";

export default function PlanSummaryCard({ planInfo, onRenew, compact = false }) {
  const statusColor =
    planInfo.status === "Active"
      ? "var(--profit)"
      : planInfo.status === "Expired"
        ? "var(--loss)"
        : "var(--muted)";

  const badgeText =
    planInfo.status === "Active"
      ? "Active"
      : planInfo.status === "Expired"
        ? "Expired"
        : "No plan";

  const showWarning =
    planInfo.expiryWarning === "1d" ||
    planInfo.expiryWarning === "7d" ||
    planInfo.expiryWarning === "expired";

  return (
    <div
      className={compact ? "pro-card-flat" : "pro-card"}
      style={{
        padding: compact ? "12px 14px" : "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {planInfo.status === "Active" ? (
            <CheckCircle2 size={16} strokeWidth={1.9} color="var(--profit)" />
          ) : (
            <Clock size={16} strokeWidth={1.9} color={statusColor} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.7px" }}>
              SUBSCRIPTION PLAN
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {planInfo.planName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: "999px",
            backgroundColor:
              planInfo.status === "Active"
                ? "rgba(34, 197, 94, 0.14)"
                : planInfo.status === "Expired"
                  ? "rgba(255, 92, 92, 0.14)"
                  : "var(--surface-2)",
            color: statusColor,
            flexShrink: 0
          }}
        >
          {badgeText}
        </span>
      </div>

      <div
        className="font-mono-num"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "11px",
          color: "var(--muted)"
        }}
      >
        <div>
          Start: <strong style={{ color: "var(--text)" }}>{formatPlanDate(planInfo.startDateMillis)}</strong>
        </div>
        <div style={{ textAlign: "right" }}>
          Expiry:{" "}
          <strong style={{ color: "var(--text)" }}>
            {planInfo.isLifetime ? "Lifetime" : formatPlanDate(planInfo.expiryDateMillis)}
          </strong>
        </div>
      </div>

      {!planInfo.isLifetime && (
        <div>
          <div
            className="font-mono-num"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--muted)",
              marginBottom: "5px"
            }}
          >
            <span>
              {planInfo.status === "Active"
                ? `${planInfo.daysLeft} day${planInfo.daysLeft === 1 ? "" : "s"} left`
                : planInfo.status === "Expired"
                  ? "0 days left"
                  : "Subscribe to activate"}
            </span>
            {planInfo.totalDays > 0 && <span>{planInfo.progressPct}%</span>}
          </div>
          <div
            style={{
              height: "6px",
              borderRadius: "999px",
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${planInfo.progressPct}%`,
                height: "100%",
                borderRadius: "999px",
                backgroundColor:
                  planInfo.expiryWarning === "1d" || planInfo.status === "Expired"
                    ? "var(--loss)"
                    : planInfo.expiryWarning === "7d"
                      ? "var(--warning)"
                      : "var(--primary)",
                transition: "width 0.3s ease"
              }}
            />
          </div>
        </div>
      )}

      {showWarning && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "9px 11px",
            borderRadius: "12px",
            backgroundColor:
              planInfo.expiryWarning === "7d"
                ? "rgba(245, 179, 1, 0.12)"
                : "rgba(225, 29, 46, 0.12)",
            border:
              planInfo.expiryWarning === "7d"
                ? "1px solid rgba(245, 179, 1, 0.4)"
                : "1px solid rgba(225, 29, 46, 0.4)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: "var(--text)", fontWeight: 600 }}>
            <AlertTriangle
              size={14}
              color={planInfo.expiryWarning === "7d" ? "var(--warning)" : "var(--primary)"}
            />
            <span>
              {planInfo.expiryWarning === "expired"
                ? "Plan expired! Renew now."
                : planInfo.expiryWarning === "1d"
                  ? "Expires within 24 hours!"
                  : `Plan expires in ${planInfo.daysLeft} days`}
            </span>
          </div>
          {onRenew && (
            <button
              type="button"
              onClick={onRenew}
              className="btn-red"
              style={{ minHeight: "32px", padding: "5px 10px", fontSize: "11px", borderRadius: "9px", flexShrink: 0 }}
            >
              <Sparkles size={12} />
              Renew
            </button>
          )}
        </div>
      )}
    </div>
  );
}
