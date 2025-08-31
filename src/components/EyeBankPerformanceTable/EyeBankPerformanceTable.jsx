// src/components/EyeBankTable.jsx
import React from 'react';

function EyeBankTable({ data, onChange, disabled = false }) {
  const cfg = sections.find(s => s.table && (s.title || "").includes("EYE BANK"));
  if (!cfg) return null;

  return (
    <div className="overflow-x-auto mb-6 font-serif">
      <table className="min-w-full border-collapse border">
        <thead className="bg-gray-200 text-xs text-[#134074]">
          <tr>
            {cfg.columns.map(col => (
              <th key={col} className="border p-1 text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cfg.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="even:bg-gray-50">
              <td className="border p-1 font-semibold bg-gray-50">{row.status}</td>
              {row.data.map((key) => (
                <td key={key} className="border p-1">
                  <input
                    type="text"
                    className="w-full px-1 py-0.5 border rounded text-right"
                    disabled={disabled}
                    value={data?.[rowIdx]?.[key] || ""}
                    onChange={(e) => onChange(rowIdx, key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EyeBankTable;