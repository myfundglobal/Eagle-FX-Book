import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function UpdatePopup() {
  const registrationRef = useRef(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registrationRef.current = registration;
      registration.update().catch(() => {});
    },
    onRegisterError(error) {
      console.error("Service worker registration error:", error);
    }
  });

  useEffect(() => {
    const checkForUpdate = () => {
      if (registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New update available"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(5, 5, 5, 0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        className="pro-card"
        style={{
          width: "100%",
          maxWidth: "360px",
          borderColor: "rgba(225, 29, 46, 0.5)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(225, 29, 46, 0.14)",
                border: "1px solid rgba(225, 29, 46, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E11D2E"
              }}
            >
              <RefreshCw size={18} strokeWidth={1.75} />
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#F5F5F7" }}>
              New update available
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label="Close"
            className="touch-target"
            style={{
              background: "transparent",
              border: "none",
              color: "#8B8B95",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <p style={{ margin: "0 0 18px 0", fontSize: "13px", lineHeight: 1.55, color: "#8B8B95" }}>
          A new version of Eagle FX Book is ready. Update now to apply improvements without reinstalling.
        </p>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-surface"
            onClick={() => setNeedRefresh(false)}
            style={{ flex: 1 }}
          >
            Later
          </button>
          <button
            type="button"
            className="btn-red"
            onClick={() => updateServiceWorker(true)}
            style={{ flex: 1.3 }}
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}
