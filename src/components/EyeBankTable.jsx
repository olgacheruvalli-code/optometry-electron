import React from "react";
import { sections } from "../data/questions";

// ✅ Inline helper (no new files)
const exportTable = async (tableId, filename = "export.xlsx") => {
  const el = document.getElementById(tableId);
  if (!el) return alert("Table not found: " + tableId);
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.table_to_book(el, { sheet: "Sheet1" });
  XLSX.writeFile(wb, filename);
};

export default function EyeBankTable({
  data,
  onChange,
  disabled = false,
  // NEW:
  showDownload = false,
  tableId = "eyeBankTable",
  month,
  year,
  district,
}) {
  const cfg = sections.find(
    (s) => s.table && (s.title || "").includes("EYE BANK")
  );
  if (!cfg || !cfg.rows || !cfg.columns) {
    return (
      <div className="text-red-600 p-2">
        ⚠️ Eye Bank section not found in questions
      </div>
    );
  }

  const rowCount = cfg.rows.length;

  return (
    <div className="overflow-x-auto mb-6 font-serif">
      {/* 👇 give the table a stable id for export */}
      <table id={tableId} className="min-w-full border-collapse border">
        <thead className="bg-gray-200 text-xs text-[#134074]">
          <tr>
            {cfg.columns.map((col) => (
              <th key={col} className="border p-1 text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cfg.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="even:bg-gray-50">
              <td className="border p-1 font-semibold bg-gray-50">
                {row.status}
              </td>
              {row.data.map((key) => {
                const val = data?.[rowIdx]?.[key];
                return (
                  <td key={key} className="border p-1">
                    <input
                      type="text"
                      className="w-full px-1 py-0.5 border rounded text-right"
                      disabled={disabled}
                      value={val !== undefined ? val : "0"}
                      onChange={(e) => {
                        if (onChange && !disabled) {
                          onChange(rowIdx, key, e.target.value);
                        }
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Total for the Month */}
          {data?.length > rowCount && (
            <tr className="bg-yellow-100 font-semibold">
              <td className="border p-1">Total for the month</td>
              {cfg.rows[0].data.map((key, colIdx) => {
                const val = data?.[rowCount]?.[key] ?? "0";
                return (
                  <td key={colIdx} className="border p-1 text-right">
                    {val}
                  </td>
                );
              })}
            </tr>
          )}

          {/* Cumulative Total */}
          {data?.length > rowCount + 1 && (
            <tr className="bg-green-100 font-bold">
              <td className="border p-1">Cumulative Total</td>
              {cfg.rows[0].data.map((key, colIdx) => {
                const val = data?.[rowCount + 1]?.[key] ?? "0";
                return (
                  <td key={colIdx} className="border p-1 text-right">
                    {val}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>

      {/* ✅ Download button (only when enabled) */}
      {showDownload && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() =>
              exportTable(
                tableId,
                `EyeBank_${district || ""}_${month || ""}-${year || ""}.xlsx`
              )
            }
            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Download as Excel
          </button>
        </div>
      )}
    </div>
  );
}
