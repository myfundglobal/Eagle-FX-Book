import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

window.__EAGLE_MOUNTED__ = true;
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
  // ignore if Capacitor SplashScreen plugin is not present
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
