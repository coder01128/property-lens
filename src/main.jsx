import React from "react";
import ReactDOM from "react-dom/client";
import App from "../inventory-app.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// Register a basic service worker for PWA support.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
