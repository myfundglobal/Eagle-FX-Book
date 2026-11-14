import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function SplashScreen({ authReady, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 2000;
    let rafId = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed < duration) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setMinTimeDone(true);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (minTimeDone && authReady) {
      const t = window.setTimeout(() => onComplete(), 180);
      return () => window.clearTimeout(t);
    }
  }, [minTimeDone, authReady, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#050505",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px"
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
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
            marginBottom: "22px"
          }}
        >
          <img
            src="logo.png"
            alt="Eagle FX Book"
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

        {/* Slim Red Progress Bar + % */}
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
      </motion.div>
    </motion.div>
  );
}
