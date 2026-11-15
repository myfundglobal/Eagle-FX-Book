import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ authReady, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const completedRef = useRef(false);

  const triggerComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      if (
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.SplashScreen &&
        typeof window.Capacitor.Plugins.SplashScreen.hide === "function"
      ) {
        window.Capacitor.Plugins.SplashScreen.hide();
      }
    } catch {
      // ignore
    }
    onComplete();
  };

  useEffect(() => {
    const start = Date.now();
    const duration = 1400;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        window.clearInterval(timer);
        setMinTimeDone(true);
      }
    }, 50);

    // Hard guarantee so splash can never stay stuck on slow/old WebView
    const safetyTimer = window.setTimeout(() => {
      triggerComplete();
    }, 2800);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    if (minTimeDone && authReady) {
      const t = window.setTimeout(() => triggerComplete(), 120);
      return () => window.clearTimeout(t);
    }
  }, [minTimeDone, authReady]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 9999,
        backgroundColor: "#050505",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px"
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "300px"
        }}
      >
        <div
          style={{
            position: "relative",
            width: "112px",
            height: "112px",
            borderRadius: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 0 64px rgba(225, 29, 46, 0.32), 0 18px 36px rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(225, 29, 46, 0.38)",
            overflow: "hidden",
            marginBottom: "22px",
            backgroundColor: "#0d0d10"
          }}
        >
          <img
            src="logo.png"
            alt="Eagle FX Book"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <h1
          style={{
            margin: "0 0 18px 0",
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "2.4px",
            color: "#F5F5F7",
            textAlign: "center"
          }}
        >
          EAGLE FX BOOK
        </h1>

        <div style={{ width: "100%", marginBottom: "10px" }}>
          <div
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "999px",
              backgroundColor: "#141418",
              overflow: "hidden",
              border: "1px solid #23232A"
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#E11D2E",
                borderRadius: "999px",
                transition: "width 60ms linear"
              }}
            />
          </div>
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}
        >
          <span style={{ fontSize: "12px", color: "#8B8B95" }}>
            Initializing terminal...
          </span>
          <span
            className="font-mono-num"
            style={{ fontSize: "12px", fontWeight: 700, color: "#E11D2E" }}
          >
            {progress}%
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#8B8B95",
            letterSpacing: "0.8px"
          }}
        >
          Trade. Journal. Improve.
        </p>
      </div>
    </div>
  );
}
