import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected rendering error"
    };
  }

  componentDidCatch(error, info) {
    console.error("Eagle FX Book ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            backgroundColor: "var(--bg)",
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div className="pro-card" style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
            <AlertTriangle
              size={34}
              strokeWidth={1.75}
              color="var(--primary)"
              style={{ marginBottom: "12px" }}
            />
            <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
              Something went wrong
            </h2>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--muted)" }}>
              {this.state.message}
            </p>
            <button
              type="button"
              className="btn-red"
              style={{ width: "100%" }}
              onClick={() => window.location.reload()}
            >
              <RotateCcw size={16} strokeWidth={1.75} />
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
