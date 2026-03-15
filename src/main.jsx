import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/globals.css";
import { processQueue } from "./lib/aiQueue.js";
import { syncAll }      from "./lib/syncManager.js";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// On load: drain AI queue + push any un-synced local data
window.addEventListener("load", () => { processQueue(); syncAll(); });

// On reconnect: drain AI queue (PRD §5.2) + sync data (PRD §7.3)
window.addEventListener("online", () => { processQueue(); syncAll(); });

// Register a basic service worker for PWA support.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
