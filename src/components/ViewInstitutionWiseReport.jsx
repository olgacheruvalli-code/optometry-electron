// src/components/ViewInstitutionWiseReport.jsx
import React from "react";

// ✅ Inline helper (no new files). Uses dynamic import.
const exportTable = async (tableId, filename = "export.xlsx") => {
  const el = document.getElementById(tableId);
  if (!el) return alert("Table not found: " + tableId);
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.table_to_book(el, { sheet: "Sheet1" });
  XLSX.writeFile(wb, filename);
};

export default function ViewInstitutionWiseReport({
  questions = [],
  institutionNames = [],
  data = [],
  districtPerformance = {},
  month,
  year,
}) {
  const header = [
    "Description",
    ...institutionNames.flatMap((n) => [`${n} (Month)`, `${n} (Cumulative)`]),
    "District (Month)",
    "District (Cumulative)",
  ];

  return (
    <div className="overflow-auto">
      {/* 👇 give the table a stable id */}
      <table id="instWiseTable" className="table-auto w-full text-sm border border-black">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="border p-1 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((label, i) => {
            const row = [label];
            institutionNames.forEach((name) => {
              const rec = data.find((d) => d.institution === name);
              row.push(rec?.monthData?.[i] ?? 0, rec?.cumulativeData?.[i] ?? 0);
            });
            row.push(districtPerformance?.monthData?.[i] ?? 0, districtPerformance?.cumulativeData?.[i] ?? 0);
            return (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border p-1">
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ✅ Download as Excel button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => exportTable("instWiseTable", `Institution-wise_${month || ""}-${year || ""}.xlsx`)}
          className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Download as Excel
        </button>
      </div>
    </div>
  );
}
