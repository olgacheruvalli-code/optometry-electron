// src/index.jsx
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import API_BASE from "./apiBase";

// Some libs expect `global` in the browser
if (typeof window !== "undefined" && !window.global) window.global = window;

// Auto-prefix any relative "/api/..." calls with your API base
const _fetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    return _fetch(`${API_BASE}${input}`, init);
  }
  return _fetch(input, init);
};

console.log("Boot — API_BASE =", API_BASE);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// Register Service Worker for PWA mobile app installation (disabled in Electron)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const isElectron = navigator.userAgent.toLowerCase().includes("electron");
  if (!isElectron) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.log("SW registration notice:", err));
    });
  } else {
    // Actively unregister service workers in Electron to avoid local cache issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  }
}
