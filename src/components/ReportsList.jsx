import React, { useEffect, useState } from "react";
import API_BASE from "../apiBase";

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const url = new URL(`${API_BASE}/api/reports`);
        if (filterMonth) url.searchParams.set("month", filterMonth);
        if (filterYear) url.searchParams.set("year", String(filterYear));
        if (filterDistrict) url.searchParams.set("district", filterDistrict);
        if (filterInstitution) url.searchParams.set("institution", filterInstitution);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.docs) ? data.docs : Array.isArray(data) ? data : [];
        setItems(list);
      } catch (e) {
        console.error("ReportsList fetch error:", e);
        setErr(String(e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterMonth, filterYear, filterDistrict, filterInstitution]);

  if (loading) return <div className="text-center">Loading reports…</div>;
  if (err) return <div className="text-center text-red-600">Error: {err}</div>;

  return (
    <div className="grid gap-2">
      {items.length === 0 && (
        <div className="text-center text-gray-600">No reports found with current filters.</div>
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
