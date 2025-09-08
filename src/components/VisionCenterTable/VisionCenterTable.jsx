// src/components/VisionCenterTable.jsx
import React, { useMemo } from "react";

const toStr = (v) => (v == null ? "" : String(v));
const digits = (s) => String(s ?? "").replace(/[^\d]/g, "");

// Default column headers (keeps your old look/text)
const DEFAULT_COLUMNS = [
  "SL NO",
  "Name of Vision Centre",
  "No of patients examined",
  "No of Cataract cases detected",
  "No of other eye diseases",
  "No of Refractive errors",
  "No of Spectacles Prescribed",
];

// Default 10 rows
const EMPTY_ROW = (i) => ({
  slNo: i + 1,
  name: "",
  examined: "",
  cataract: "",
  otherDiseases: "",
  refractiveErrors: "",
  spectaclesPrescribed: "",
});

export default function VisionCenterTable({
  data = [],
  onChange = () => {},
  disabled = false,
  columns,
}) {
  // Normalize any historical shapes (vc_1_name, vc_examined, etc.)
  const rows = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return Array.from({ length: 10 }, (_, i) => EMPTY_ROW(i));
    }
    return data.map((r, i) => ({
      slNo: r?.slNo ?? i + 1,
      name:
        r?.name ??
        r?.vc_name ??
        r?.[`vc_${i + 1}_name`] ??
        "",
      examined:
        r?.examined ??
        r?.vc_examined ??
        r?.[`vc_${i + 1}_examined`] ??
        "",
      cataract:
        r?.cataract ??
        r?.vc_cataract ??
        r?.[`vc_${i + 1}_cataract`] ??
        "",
      otherDiseases:
        r?.otherDiseases ??
        r?.vc_other_diseases ??
        r?.[`vc_${i + 1}_other_diseases`] ??
        "",
      refractiveErrors:
        r?.refractiveErrors ??
        r?.vc_refractive_errors ??
        r?.[`vc_${i + 1}_refractive_errors`] ??
        "",
      spectaclesPrescribed:
        r?.spectaclesPrescribed ??
        r?.vc_spectacles_prescribed ??
        r?.[`vc_${i + 1}_spectacles_prescribed`] ??
        "",
    }));
  }, [data]);

  const cols = Array.isArray(columns) && columns.length >= 7 ? columns : DEFAULT_COLUMNS;

  const write = (rowIdx, key, value) => {
    const val = key === "name" ? value : digits(value);
    onChange(rowIdx, key, val);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 text-[12pt]">
        <thead className="bg-gray-50">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={`border px-2 py-1 ${i === 0 ? "w-16" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 text-center">{r.slNo}</td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={toStr(r.name)}
                  disabled={disabled}
                  onChange={(e) => write(i, "name", e.target.value)}
                  placeholder="Enter name"
                  className="w-full bg-gray-100 rounded px-2 py-1"
                />
              </td>
              {["examined","cataract","otherDiseases","refractiveErrors","spectaclesPrescribed"].map((k) => (
                <td key={k} className="border px-2 py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={toStr(r[k])}
                    onChange={(e) => write(i, k, e.target.value)}
                    disabled={disabled}
                    className="w-full bg-gray-100 rounded px-2 py-1 text-right"
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
