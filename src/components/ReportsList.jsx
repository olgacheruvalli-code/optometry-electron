// src/components/ReportsList.jsx
import React, { useEffect, useState } from "react";
import API_BASE from "../apiBase";

export default function ReportsList({
  filterMonth = "",
  filterYear = "",
  filterDistrict = "",
  filterInstitution = "",
  onSelect,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const eq = (a, b) => norm(a) === norm(b);

  useEffect(() => {
    let cancelled = false;

    // Build server query (use only provided filters)
    const qs = new URLSearchParams(
      Object.fromEntries(
        [
          ["month", filterMonth || ""],
          ["year", filterYear || ""],
          ["district", filterDistrict || ""],
          // NOTE: the API typically doesn’t filter by institution unless passed.
          ["institution", filterInstitution || ""],
        ].filter(([, v]) => v !== "")
      )
    ).toString();

    const url = `${API_BASE}/api/reports${qs ? `?${qs}` : ""}`;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json().catch(() => ({}));
        let list = Array.isArray(json?.docs) ? json.docs : Array.isArray(json) ? json : [];

        // Defensive client-side filtering too (in case backend returns extra)
        if (filterMonth) list = list.filter((d) => eq(d.month, filterMonth));
        if (filterYear) list = list.filter((d) => String(d.year) === String(filterYear));
        if (filterDistrict) list = list.filter((d) => eq(d.district, filterDistrict));
        if (filterInstitution) list = list.filter((d) => eq(d.institution, filterInstitution));

        // Sort newest first
        list.sort(
          (a, b) =>
            new Date(b?.updatedAt || b?.createdAt || 0) -
            new Date(a?.updatedAt || a?.createdAt || 0)
        );

        if (!cancelled) setReports(list);
      } catch (err) {
        console.error("Failed to load reports:", err);
        if (!cancelled) {
          setError("Could not load reports");
          setReports([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterMonth, filterYear, filterDistrict, filterInstitution]);

  if (loading) return <div>Loading reports...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  if (!reports.length) {
    return (
      <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
        <h3 className="text-xl font-bold mb-2">Saved Reports</h3>
        <div className="text-gray-600">No saved reports.</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h3 className="text-xl font-bold mb-2">Saved Reports</h3>
      <ul>
        {reports.map((r) => (
          <li key={r._id || `${r.institution}-${r.month}-${r.year}`} className="border-b py-2">
            <button
              className="w-full text-left hover:underline"
              onClick={() => onSelect && onSelect(r)}
            >
              {r.month} {r.year} — {r.institution}, {r.district}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
