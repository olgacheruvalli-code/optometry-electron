// src/components/SearchReports.jsx
import React from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";

export default function SearchReports({ user, onOpen }) {
  const MONTHS = [
    "April","May","June","July","August","September",
    "October","November","December","January","February","March",
  ];

  const [institution, setInstitution] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [year, setYear] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null); // the single chosen report

  const district = user?.district || "";
  const isDOC = !!(user?.institution || "").toLowerCase().startsWith("doc ");

  // Only institutions of the user’s district, and hide DOC/DC rows
  const instList = React.useMemo(() => {
    const arr = Array.isArray(districtInstitutions[district]) ? districtInstitutions[district] : [];
    return arr.filter((n) => n && !/^doc\s/i.test(n) && !/^dc\s/i.test(n));
  }, [district]);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const pickLatest = (arr) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          new Date(b?.updatedAt || b?.createdAt || 0) -
          new Date(a?.updatedAt || a?.createdAt || 0)
      )[0];

  const handleSearch = async () => {
    setError("");
    setResult(null);

    if (!isDOC) {
      setError("Only DOC users can use this page.");
      return;
    }
    if (!district || !institution || !month || !year) {
      setError("Select Institution, Month and Year.");
      return;
    }

    setLoading(true);
    try {
      // STRICT query: this endpoint already scopes to the 4 fields
      const url =
        `${API_BASE}/api/reports?` +
        `district=${encodeURIComponent(district)}` +
        `&institution=${encodeURIComponent(institution)}` +
        `&month=${encodeURIComponent(month)}` +
        `&year=${encodeURIComponent(year)}`;

      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json?.docs) ? json.docs : Array.isArray(json) ? json : [];

      // STRICT filter again on client (defensive)
      const exact = items.filter(
        (d) =>
          norm(d?.district) === norm(district) &&
          norm(d?.institution) === norm(institution) &&
          norm(d?.month) === norm(month) &&
          String(d?.year || "") === String(year)
      );

      const chosen = pickLatest(exact);
      if (!chosen) {
        setError("No report found for that selection.");
        setResult(null);
        return;
      }

      // Optional: hydrate by id for full doc if available
      let fullDoc = chosen;
      const id = chosen?._id || chosen?.id;
      if (id) {
        try {
          const r2 = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
          const j2 = await r2.json().catch(() => ({}));
          fullDoc = j2?.doc || j2 || chosen;
        } catch {
          // ignore hydrate errors, keep chosen
        }
      }

      setResult(fullDoc);
    } catch (e) {
      console.error("Search failed:", e);
      setError("Could not search at the moment.");
    } finally {
      setLoading(false);
    }
  };

  const openInViewer = () => {
    if (!result) return;
    if (typeof onOpen === "function") onOpen(result); // parent can switch to "view" with this doc
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded-xl shadow font-serif">
      <h2 className="text-xl font-bold text-[#134074] mb-4">Search Reports (DOC)</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-sm font-semibold">Institution</label>
          <select
            className="w-full border rounded p-2"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          >
            <option value="">Select Institution</option>
            {instList.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Month</label>
          <select
            className="w-full border rounded p-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">Select Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Year</label>
          <select
            className="w-full border rounded p-2"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Select Year</option>
            {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded bg-red-100 text-red-700 border">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSearch}
          disabled={loading}
          className={`px-5 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {loading ? "Searching…" : "Search"}
        </button>
        <div className="text-sm text-gray-500 self-center">
          District: <b>{district || "-"}</b>
        </div>
      </div>

      {/* Result preview (single match only) */}
      {result && (
        <div className="border rounded-lg p-3 bg-[#f8fafc]">
          <div className="font-semibold text-[#0b3d91]">
            {result.institution} — {result.month} {result.year}
          </div>
          <div className="text-sm text-gray-600">
            Updated: {result.updatedAt ? new Date(result.updatedAt).toLocaleString() : "—"}
          </div>
          <div className="mt-3">
            <button
              onClick={openInViewer}
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Open Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
