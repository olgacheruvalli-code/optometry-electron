// src/components/ViewInstitutionWiseReport.jsx
import React from "react";

// ✅ Inline helper (no new files). Uses dynamic import.
//    Also freezes first row/col in the generated Excel sheet.
const exportTable = async (tableId, filename = "export.xlsx") => {
  const el = document.getElementById(tableId);
  if (!el) return alert("Table not found: " + tableId);
  const XLSX = await import("xlsx");

  // Convert the visible table to a workbook
  const wb = XLSX.utils.table_to_book(el, { sheet: "Institution-wise" });

  // Freeze first row (ySplit:1) and first column (xSplit:1)
  const ws = wb.Sheets["Institution-wise"];
  if (ws) {
    // SheetJS freeze panes (community builds support this field)
    ws["!freeze"] = { xSplit: 1, ySplit: 1 };
  }

  XLSX.writeFile(wb, filename);
};

export default function ViewInstitutionWiseReport({
  questions = [],
  institutionNames = [],
  data = [],
  districtPerformance = {},
  month,
  year,
  reportTitle = "Institution-wise District Report",
}) {
  return (
    <div className="relative overflow-auto max-h-[70vh] rounded border border-gray-300 p-2">
      {reportTitle && (
        <h2 className="text-xl font-bold text-center text-[#134074] my-2 no-print">
          {reportTitle}
        </h2>
      )}

      {/* ✅ Single working download button at the TOP */}
      <div className="mb-3 flex justify-end">
        <button
          onClick={() =>
            exportTable(
              "instWiseTable",
              `${reportTitle.replace(/[^\w]/g, "_")}_${month || ""}-${year || ""}.xlsx`
            )
          }
          className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Download as Excel
        </button>
      </div>

      {/* 👇 table has a stable id */}
      <table
        id="instWiseTable"
        className="min-w-[1000px] w-full text-sm border-collapse"
      >
        <thead>
          <tr>
            {/* First header cell — frozen row + frozen col */}
            <th
              className="sticky top-0 left-0 z-40 bg-[#EAF2FF] text-[#0B3D91] font-semibold border px-2 py-1 text-left"
            >
              Description
            </th>

            {/* Institution (Month) headers — frozen row */}
            {institutionNames.map((n) => (
              <th
                key={`${n}-m-h`}
                className="sticky top-0 z-30 bg-[#EAF2FF] text-[#0B3D91] font-semibold border px-2 py-1 text-center"
              >
                {n} (Month)
              </th>
            ))}

            {/* Institution (Cumulative) headers — frozen row */}
            {institutionNames.map((n) => (
              <th
                key={`${n}-c-h`}
                className="sticky top-0 z-30 bg-[#EAF2FF] text-[#0B3D91] font-semibold border px-2 py-1 text-center"
              >
                {n} (Cumulative)
              </th>
            ))}

            {/* District headers — frozen row */}
            <th className="sticky top-0 z-30 bg-[#EAF2FF] text-[#0B3D91] font-semibold border px-2 py-1 text-center">
              District (Month)
            </th>
            <th className="sticky top-0 z-30 bg-[#EAF2FF] text-[#0B3D91] font-semibold border px-2 py-1 text-center">
              District (Cumulative)
            </th>
          </tr>
        </thead>

        <tbody>
          {questions.map((q, i) => {
            const label = typeof q === "string" ? q : q.label;
            const qIdx = typeof q === "string" ? i : q.index;
            return (
              <tr key={i}>
                {/* First column — frozen col */}
                <td className="sticky left-0 z-20 bg-[#EAF2FF] text-[#0B3D91] border px-2 py-1 text-left font-medium">
                  {label}
                </td>

                {/* Month cells per institution */}
                {institutionNames.map((name) => {
                  const rec = data.find((d) => d.institution === name);
                  return (
                    <td key={`${name}-m-${i}`} className="border px-2 py-1 text-right">
                      {rec?.monthData?.[qIdx] ?? 0}
                    </td>
                  );
                })}

                {/* Cumulative cells per institution */}
                {institutionNames.map((name) => {
                  const rec = data.find((d) => d.institution === name);
                  return (
                    <td key={`${name}-c-${i}`} className="border px-2 py-1 text-right">
                      {rec?.cumulativeData?.[qIdx] ?? 0}
                    </td>
                  );
                })}

                {/* District totals */}
                <td className="border px-2 py-1 text-right">
                  {districtPerformance?.monthData?.[qIdx] ?? 0}
                </td>
                <td className="border px-2 py-1 text-right">
                  {districtPerformance?.cumulativeData?.[qIdx] ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

