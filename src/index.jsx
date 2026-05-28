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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("PWA SW registered:", reg.scope))
      .catch((err) => console.error("PWA SW registration failed:", err));
  });
}
