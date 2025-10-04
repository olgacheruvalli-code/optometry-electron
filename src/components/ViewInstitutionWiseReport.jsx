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
}) {
  return (
    <div className="relative overflow-auto max-h-[70vh] rounded border border-gray-300">
      {/* 👇 give the table a stable id */}
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
          {questions.map((label, i) => (
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
                    {rec?.monthData?.[i] ?? 0}
                  </td>
                );
              })}

              {/* Cumulative cells per institution */}
              {institutionNames.map((name) => {
                const rec = data.find((d) => d.institution === name);
                return (
                  <td key={`${name}-c-${i}`} className="border px-2 py-1 text-right">
                    {rec?.cumulativeData?.[i] ?? 0}
                  </td>
                );
              })}

              {/* District totals */}
              <td className="border px-2 py-1 text-right">
                {districtPerformance?.monthData?.[i] ?? 0}
              </td>
              <td className="border px-2 py-1 text-right">
                {districtPerformance?.cumulativeData?.[i] ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Download as Excel button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() =>
            exportTable(
              "instWiseTable",
              `Institution-wise_${month || ""}-${year || ""}.xlsx`
            )
          }
          className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Download as Excel
        </button>
      </div>
    </div>
  );
}
