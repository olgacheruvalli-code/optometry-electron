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

// Actively unregister service workers and clear caches to prevent layout/styling corruption in Electron
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log("Service Worker unregistered successfully.");
      });
    }
  });
}
if (typeof window !== "undefined" && "caches" in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key));
  });
}
