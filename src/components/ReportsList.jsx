import React, { useEffect, useState } from "react";
import API_BASE from "../apiBase";
import { DEMO_REPORTS_LIST, DEMO_DISTRICT } from "../data/demoData";

export default function ReportsList({
  filterMonth = "",
  filterYear = "",
  filterDistrict = "",
  filterInstitution = "",
  isGuest = false,
  onSelect,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const eq = (a, b) => norm(a) === norm(b);

  useEffect(() => {
    let cancelled = false;

    // 🕶️ GUEST DEMO MODE: return pre-generated sample reports (no backend call)
    if (isGuest || filterDistrict === DEMO_DISTRICT) {
      setLoading(false);
      setError(null);
      let list = [...DEMO_REPORTS_LIST];
      if (filterMonth) list = list.filter((d) => eq(d.month, filterMonth));
      if (filterYear) list = list.filter((d) => String(d.year) === String(filterYear));
      setReports(list);
      return;
    }

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
  }, [filterMonth, filterYear, filterDistrict, filterInstitution, isGuest]);

  if (loading) return <div>Loading reports...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const isDemoMode = isGuest || filterDistrict === DEMO_DISTRICT;

  if (!reports.length) {
    return (
      <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">Saved Reports</h3>
          {isDemoMode && (
            <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              Demo Sample Data
            </span>
          )}
        </div>
        <div className="text-gray-600">No saved reports.</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold">Saved Reports</h3>
        {isDemoMode && (
          <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
            Demo Sample Data
          </span>
        )}
      </div>
      <ul>
        {reports.map((r) => (
          <li key={r._id || `${r.institution}-${r.month}-${r.year}`} className="border-b py-2">
            <button
              className="w-full text-left hover:underline flex justify-between items-center"
              onClick={() => onSelect && onSelect(r)}
            >
              <span>{r.month} {r.year} — {r.institution}, {r.district}</span>
              {isDemoMode && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Demo
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
