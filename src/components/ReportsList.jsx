// src/components/ReportsList.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";

// Normalize any filter value: trim, collapse weird spaces, NFC/NFKC normalize
function norm(val) {
  if (val == null) return "";
  return String(val)
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")     // non-breaking space -> regular space
    .replace(/\s+/g, " ")        // collapse whitespace
    .trim();
}

export default function ReportsList({
  filterMonth,
  filterYear,
  filterDistrict,
  filterInstitution,
  onSelect,
}) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Build the URL once per filter change (normalized)
  const urlStr = useMemo(() => {
    const month = norm(filterMonth);
    const year = norm(filterYear);
    const district = norm(filterDistrict);
    const institution = norm(filterInstitution);

    const url = new URL(`${API_BASE}/api/reports`);
    if (month) url.searchParams.set("month", month);
    if (year) url.searchParams.set("year", year);
    if (district) url.searchParams.set("district", district);
    if (institution) url.searchParams.set("institution", institution);

    return url.toString();
  }, [filterMonth, filterYear, filterDistrict, filterInstitution]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      setItems([]);

      // tiny retry for cold starts / transient network
      const tryFetch = async (attempt = 1) => {
        try {
          console.log("[ReportsList] GET", urlStr);
          const res = await fetch(urlStr, { signal: controller.signal /*, mode: "cors"*/ });
          console.log("[ReportsList] status", res.status);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));

          // backend may return an array or {docs:[...]}
          const list = Array.isArray(data?.docs)
            ? data.docs
            : Array.isArray(data)
            ? data
            : [];

          setItems(list);
        } catch (e) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 700));
            return tryFetch(attempt + 1);
          }
          console.error("ReportsList fetch error:", e);
          // Show a friendly hint if it's the typical CORS/network TypeError
          const msg =
            (e && e.message) || String(e);
          const maybeCors =
            msg.toLowerCase().includes("failed to fetch") ||
            msg.toLowerCase().includes("network");
          setErr(maybeCors ? `${msg} (Possible CORS/network issue)` : msg);
        } finally {
          setLoading(false);
        }
      };

      tryFetch();
    }

    load();
    return () => controller.abort();
  }, [urlStr]);

  if (loading) return <div className="text-center">Loading reports…</div>;

  if (err) {
    return (
      <div className="space-y-2 text-center">
        <div className="text-red-600">Error: {err}</div>
        <div className="text-xs text-gray-500 break-all">
          URL:{" "}
          <a className="underline" href={urlStr} target="_blank" rel="noreferrer">
            {urlStr}
          </a>
        </div>
        <div className="text-xs text-gray-500">
          If this is CORS, ensure your backend allows your frontend origin (e.g.
          add it to <code>ALLOWED_ORIGINS</code> on the server).
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {items.length === 0 && (
        <div className="text-center text-gray-600">
          No reports found with current filters.
        </div>
      )}
      {items.map((r) => (
        <button
          key={r._id || `${r.institution}-${r.month}-${r.year}`}
          onClick={() => onSelect(r)}
          className="text-left bg-white border rounded px-3 py-2 hover:bg-gray-50 shadow-sm"
        >
          <div className="font-semibold">{r.institution}</div>
          <div className="text-sm text-gray-600">
            {r.district} • {r.month} {r.year}
          </div>
        </button>
      ))}
    </div>
  );
}
