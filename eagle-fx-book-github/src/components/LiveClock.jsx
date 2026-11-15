import { useEffect, useState } from "react";
import { getShortTimeZoneName, resolveTimeZone } from "../utils/calendarData.js";

export default function LiveClock({ timeZone = "local", use24h = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const tz = resolveTimeZone(timeZone);
  const tzShort = getShortTimeZoneName(tz, now);

  let datePart = "";
  let timePart = "";
  try {
    datePart = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(now);
    timePart = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !use24h
    }).format(now);
  } catch {
    datePart = now.toDateString();
    timePart = now.toLocaleTimeString([], { hour12: !use24h });
  }

  return (
    <div
      className="font-mono-num"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "7px 12px",
        borderRadius: "12px",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        fontSize: "11px",
        color: "var(--muted)",
        marginBottom: "12px",
        transition: "background-color 0.22s ease, border-color 0.22s ease"
      }}
    >
      <span style={{ color: "var(--text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {datePart} &bull; {timePart}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: "6px",
          backgroundColor: "rgba(225, 29, 46, 0.14)",
          color: "var(--primary)",
          flexShrink: 0
        }}
      >
        {tzShort}
      </span>
    </div>
  );
}
