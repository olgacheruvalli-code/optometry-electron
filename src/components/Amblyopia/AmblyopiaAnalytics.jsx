import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../apiBase.js";

import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";

// Register chart.js components
ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale
);

/**
 * SAFE Amblyopia Analytics Dashboard
 * - No React elements inside chart data
 * - Only simple values (numbers / strings)
 * - Handles empty / error states gracefully
 */

export default function AmblyopiaAnalytics({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Adjust this endpoint name if your backend uses a different route:
  // e.g. /api/amblyopia, /api/amblyopia-records, etc.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (user?.district) params.append("district", user.district);
        if (user?.institution) params.append("institution", user.institution);

        const res = await fetch(
          `${API_BASE}/api/amblyopia-records?${params.toString()}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json().catch(() => ({}));
        const docs = Array.isArray(json?.docs)
          ? json.docs
          : Array.isArray(json)
          ? json
          : [];

        if (!cancelled) {
          setRecords(docs);
        }
      } catch (e) {
        console.error("Amblyopia analytics fetch failed:", e);
        if (!cancelled) {
          setError("Unable to load analytics data.");
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.district, user?.institution]);

  // Small helper for defensive access
  const safeField = (rec, key, fallback = "Unknown") => {
    const v = rec?.[key];
    if (v === undefined || v === null || v === "") return fallback;
    return String(v).trim();
  };

  // Basic totals and groupings
  const stats = useMemo(() => {
    const total = records.length;

    const byGender = {};
    const byAgeGroup = {};
    const bySeverity = {};
    const byLaterality = {}; // e.g. "Unilateral", "Bilateral"
    const byMonth = {}; // for timeline

    records.forEach((rec) => {
      const gender = safeField(rec, "gender");
      const ageGroup = safeField(rec, "ageGroup");
      const severity = safeField(rec, "severity");
      const laterality = safeField(rec, "laterality");
      const dateStr = safeField(rec, "diagnosisDate", "");
      let monthKey = "Unknown";

      if (dateStr && !isNaN(Date.parse(dateStr))) {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const mm = m < 10 ? `0${m}` : `${m}`;
        monthKey = `${y}-${mm}`; // e.g. "2025-04"
      }

      byGender[gender] = (byGender[gender] || 0) + 1;
      byAgeGroup[ageGroup] = (byAgeGroup[ageGroup] || 0) + 1;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
      byLaterality[laterality] = (byLaterality[laterality] || 0) + 1;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    // Convert grouped objects to arrays
    const objToSortedEntries = (obj) =>
      Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      total,
      byGender: objToSortedEntries(byGender),
      byAgeGroup: objToSortedEntries(byAgeGroup),
      bySeverity: objToSortedEntries(bySeverity),
      byLaterality: objToSortedEntries(byLaterality),
      byMonth: objToSortedEntries(byMonth),
    };
  }, [records]);

  // ===== Chart data (ONLY simple values, NO React elements) =====

  const genderPieData = useMemo(
    () => ({
      labels: stats.byGender.map(([g]) => g),
      datasets: [
        {
          label: "Count",
          data: stats.byGender.map(([, n]) => n),
        },
      ],
    }),
    [stats.byGender]
  );

  const ageBarData = useMemo(
    () => ({
      labels: stats.byAgeGroup.map(([age]) => age),
      datasets: [
        {
          label: "Patients",
          data: stats.byAgeGroup.map(([, n]) => n),
        },
      ],
    }),
    [stats.byAgeGroup]
  );

  const severityBarData = useMemo(
    () => ({
      labels: stats.bySeverity.map(([sev]) => sev),
      datasets: [
        {
          label: "Cases",
          data: stats.bySeverity.map(([, n]) => n),
        },
      ],
    }),
    [stats.bySeverity]
  );

  const timelineData = useMemo(
    () => ({
      labels: stats.byMonth.map(([month]) => month),
      datasets: [
        {
          label: "New Amblyopia Cases",
          data: stats.byMonth.map(([, n]) => n),
        },
      ],
    }),
    [stats.byMonth]
  );

  // ===== Render =====

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-700">
        🔄 Loading Amblyopia Analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {error}
        <div className="mt-2 text-sm text-gray-600">
          You can still use the entry and view pages normally.
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="p-6 text-center text-gray-700">
        📊 No amblyopia records found yet for this institution/district.
        <div className="mt-2 text-sm text-gray-600">
          Please add some records from <b>Amblyopia – Entry</b> and then open this dashboard again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Amblyopia Analytics Dashboard
          </h2>
          <p className="text-sm text-gray-600">
            District: <b>{user?.district || "—"}</b> &nbsp; | &nbsp; Institution:{" "}
            <b>{user?.institution || "—"}</b>
          </p>
        </div>
        <div className="text-right text-sm text-gray-700">
          <div>
            Total records:{" "}
            <span className="font-semibold text-indigo-700">{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-xs uppercase text-gray-500 font-semibold">
            Total Patients
          </div>
          <div className="text-3xl font-bold mt-2 text-gray-900">
            {stats.total}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            All amblyopia entries in this filter.
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-xs uppercase text-gray-500 font-semibold">
            Most common age group
          </div>
          <div className="text-lg font-semibold mt-2 text-gray-900">
            {stats.byAgeGroup.length
              ? stats.byAgeGroup.reduce((max, cur) =>
                  cur[1] > max[1] ? cur : max
                )[0]
              : "—"}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-xs uppercase text-gray-500 font-semibold">
            Most common severity
          </div>
          <div className="text-lg font-semibold mt-2 text-gray-900">
            {stats.bySeverity.length
              ? stats.bySeverity.reduce((max, cur) =>
                  cur[1] > max[1] ? cur : max
                )[0]
              : "—"}
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Pie */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Gender distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Pie
              data={genderPieData}
              options={{
                plugins: {
                  legend: { position: "bottom" },
                },
              }}
            />
          </div>
        </div>

        {/* Age bar */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Age-group distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={ageBarData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: { ticks: { autoSkip: false } },
                  y: { beginAtZero: true, precision: 0 },
                },
              }}
            />
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Severity pattern
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={severityBarData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: { ticks: { autoSkip: false } },
                  y: { beginAtZero: true, precision: 0 },
                },
              }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            New cases over time
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Line
              data={timelineData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: {
                    ticks: { autoSkip: false },
                  },
                  y: {
                    beginAtZero: true,
                    precision: 0,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Table – short summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Quick summary table
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Group</th>
                <th className="border px-2 py-1 text-left">Category</th>
                <th className="border px-2 py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.byGender.map(([g, n]) => (
                <tr key={`gender-${g}`}>
                  <td className="border px-2 py-1">Gender</td>
                  <td className="border px-2 py-1">{g}</td>
                  <td className="border px-2 py-1 text-right">{n}</td>
                </tr>
              ))}
              {stats.byAgeGroup.map(([a, n]) => (
                <tr key={`age-${a}`}>
                  <td className="border px-2 py-1">Age group</td>
                  <td className="border px-2 py-1">{a}</td>
                  <td className="border px-2 py-1 text-right">{n}</td>
                </tr>
              ))}
              {stats.bySeverity.map(([s, n]) => (
                <tr key={`sev-${s}`}>
                  <td className="border px-2 py-1">Severity</td>
                  <td className="border px-2 py-1">{s}</td>
                  <td className="border px-2 py-1 text-right">{n}</td>
                </tr>
              ))}
              {stats.byLaterality.map(([l, n]) => (
                <tr key={`lat-${l}`}>
                  <td className="border px-2 py-1">Laterality</td>
                  <td className="border px-2 py-1">{l}</td>
                  <td className="border px-2 py-1 text-right">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
