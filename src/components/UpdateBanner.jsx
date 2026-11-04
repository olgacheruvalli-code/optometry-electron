// Top-right "Update available" popup.
// Checks ./version.json (never cached) on start, every 5 minutes, and whenever
// the app comes back to the foreground. If a newer build is deployed, shows a
// popup; tapping it clears old caches and reloads the fresh version.
import React, { useEffect, useState } from "react";
import { BUILD_ID } from "../buildInfo";

const CHECK_EVERY_MS = 5 * 60 * 1000;

async function fetchLatestId() {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    return j && j.buildId ? String(j.buildId) : null;
  } catch {
    return null; // offline or file missing → ignore
  }
}

export async function applyUpdate(latestId) {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => {})));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set("v", latestId || Date.now());
  window.location.replace(url.toString());
}

export default function UpdateBanner() {
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (navigator.userAgent.toLowerCase().includes("electron")) return;
    let stopped = false;
    const check = async () => {
      const id = await fetchLatestId();
      if (!stopped && id && id !== BUILD_ID) setLatest(id);
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", check);
    };
  }, []);

  if (!latest) return null;

  return (
    <div
      className="no-print"
      role="alert"
      style={{
        position: "fixed",
        top: "calc(12px + env(safe-area-inset-top, 0px))",
        right: 12,
        zIndex: 99999,
        maxWidth: "calc(100vw - 24px)",
        animation: "__upd-in .35s ease-out",
      }}
    >
      <style>{`@keyframes __upd-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
               @keyframes __upd-pulse{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.55)}70%{box-shadow:0 0 0 10px rgba(22,163,74,0)}}`}</style>
      <button
        onClick={() => { setBusy(true); applyUpdate(latest); }}
        disabled={busy}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#16a34a", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.2)", animation: "__upd-pulse 2s infinite",
          textAlign: "left", fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 20 }}>{busy ? "⏳" : "🔄"}</span>
        <span>
          {busy ? "Updating…" : "Update available"}
          {!busy && (
            <span style={{ display: "block", fontWeight: 400, fontSize: 12, opacity: 0.9 }}>
              Tap to update now
            </span>
          )}
        </span>
      </button>
      {!busy && (
        <button
          aria-label="Later"
          onClick={() => setLatest(null)}
          style={{
            position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 11,
            border: "none", background: "#fff", color: "#333", fontSize: 13, lineHeight: "22px",
            boxShadow: "0 1px 4px rgba(0,0,0,.3)", cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
