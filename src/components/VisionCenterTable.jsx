// src/components/VisionCenterTable.jsx
import React from "react";

export default function VisionCenterTable({ data = [], onChange, disabled = false }) {
  // ensure at least 10 visible rows
  const rows = Array.isArray(data) && data.length ? [...data] : Array.from({ length: 10 }, () => ({ name: "", examined: "" }));

  const handle = (rowIdx, key, rawVal) => {
    if (!onChange) return;

    if (key === "name") {
      // letters + spaces + dots only
      const cleaned = String(rawVal || "").replace(/[^a-zA-Z\s.]/g, "");
      onChange(rowIdx, "name", cleaned);
      return;
    }

    if (key === "examined") {
      // keep only digits; allow empty
      const cleaned = String(rawVal || "").replace(/\D/g, "");
      onChange(rowIdx, "examined", cleaned);
      return;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-sm border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1 w-10 text-center">#</th>
            <th className="border p-1 text-left">Name (letters only)</th>
            <th className="border p-1 text-right">Examined (numbers only)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border p-1 text-center">{i + 1}</td>
              <td className="border p-1">
                <input
                  type="text"
                  inputMode="text"
                  pattern="[A-Za-z\s.]*"
                  autoComplete="off"
                  placeholder="Enter name"
                  disabled={disabled}
                  className="w-full px-2 py-1 border rounded"
                  value={typeof r?.name === "string" ? r.name : ""}
                  onChange={(e) => handle(i, "name", e.target.value)}
                />
              </td>
              <td className="border p-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="0"
                  disabled={disabled}
                  className="w-full px-2 py-1 border rounded text-right"
                  value={
                    typeof r?.examined === "string"
                      ? r.examined
                      : Number.isFinite(r?.examined)
                      ? String(r.examined)
                      : ""
                  }
                  onChange={(e) => handle(i, "examined", e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <div className="text-xs text-gray-500 mt-1">
          Add names on the left; enter counts in “Examined”.
        </div>
      )}
    </div>
  );
}
