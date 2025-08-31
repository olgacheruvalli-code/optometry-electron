import React from "react";
import { sections } from "../data/questions";

export default function VisionCenterTable({ data, onChange, disabled = false }) {
  const cfg = sections.find(s => s.table && s.title?.toUpperCase().includes("VISION CENTER"));
  if (!cfg || !cfg.rows || !cfg.columns) {
    return <div className="text-red-600 p-2">⚠️ Vision Center section not found in questions</div>;
  }

  const keys = [
    "nameKey",
    "examinedKey",
    "cataractKey",
    "otherDiseasesKey",
    "refractiveErrorsKey",
    "spectaclesPrescribedKey"
  ];

  return (
    <div className="overflow-x-auto mb-6 font-serif">
      <table className="min-w-full border-collapse border">
        <thead className="bg-gray-200 text-xs text-[#134074]">
          <tr>
            {cfg.columns.map((col) => (
              <th key={col} className="border p-1 text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cfg.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="even:bg-gray-50">
              <td className="border p-1 text-center">{row.slNo}</td>
              {keys.map((fieldKey, colIdx) => {
                const key = row[fieldKey];
                const val = data?.[rowIdx]?.[key];

                // Only for the Name column (the very first key)
                if (colIdx === 0) {
                  return (
                    <td key={key} className="border p-1">
                      <input
                        type="text"
                        className="w-full px-1 py-0.5 border rounded text-left"
                        disabled={disabled}
                        value={typeof val === "string" ? val : ""}
                        placeholder="Enter name"
                        onChange={e => {
                          if (onChange && !disabled) {
                            const inputVal = e.target.value;
                            // Allow only letters and spaces
                            if (!/^[a-zA-Z\s]*$/.test(inputVal)) return;
                            onChange(rowIdx, key, inputVal);
                          }
                        }}
                        autoComplete="off"
                      />
                    </td>
                  );
                }

                // All other columns: keep as before (numbers only)
                return (
                  <td key={key} className="border p-1">
                    <input
                      type="text"
                      className="w-full px-1 py-0.5 border rounded text-right"
                      disabled={disabled}
                      value={val !== undefined && !isNaN(val) ? String(val) : "0"}
                      onChange={e => {
                        if (onChange && !disabled) {
                          // Only allow digits
                          const inputVal = e.target.value.replace(/\D/g, "");
                          onChange(rowIdx, key, inputVal);
                        }
                      }}
                      autoComplete="off"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}