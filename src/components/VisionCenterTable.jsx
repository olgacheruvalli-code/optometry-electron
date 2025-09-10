import React, { useMemo } from "react";

const toStr = (v) => (v == null ? "" : String(v));
const digits = (s) => String(s ?? "").replace(/[^\d]/g, "");

const VC_COLUMNS = [
  "SL NO",
  "Name of Vision Centre",
  "No of patients examined",
  "No of Cataract cases detected",
  "No of other eye diseases",
  "No of Refractive errors",
  "No of Spectacles Prescribed",
];

const makeKeys = (idx) => ({
  nameKey: `vc_${idx}_name`,
  examinedKey: `vc_${idx}_examined`,
  cataractKey: `vc_${idx}_cataract`,
  otherDiseasesKey: `vc_${idx}_other_diseases`,
  refractiveErrorsKey: `vc_${idx}_refractive_errors`,
  spectaclesPrescribedKey: `vc_${idx}_spectacles_prescribed`,
});

export default function VisionCenterTable({
  data = [],
  onChange = () => {},
  disabled = false,
  columns,
  rowsCount = 10,
}) {
  const rows = useMemo(() => {
    const count = Math.max(rowsCount, Array.isArray(data) ? data.length : 0, 10);
    return Array.from({ length: count }, (_, i) => {
      const idx = i + 1;
      const keys = makeKeys(idx);
      const src = (Array.isArray(data) && data[i]) || {};
      return {
        slNo: idx,
        keys,
        name: toStr(src[keys.nameKey] ?? src.name ?? ""),
        examined: toStr(src[keys.examinedKey] ?? src.examined ?? ""),
        cataract: toStr(src[keys.cataractKey] ?? src.cataract ?? ""),
        otherDiseases: toStr(src[keys.otherDiseasesKey] ?? src.otherDiseases ?? ""),
        refractiveErrors: toStr(src[keys.refractiveErrorsKey] ?? src.refractiveErrors ?? ""),
        spectaclesPrescribed: toStr(src[keys.spectaclesPrescribedKey] ?? src.spectaclesPrescribed ?? ""),
      };
    });
  }, [data, rowsCount]);

  const cols = Array.isArray(columns) && columns.length >= 7 ? columns : VC_COLUMNS;

  const writeText = (rowIdx, key, val) => onChange(rowIdx, key, val);
  const writeNum = (rowIdx, key, val) => onChange(rowIdx, key, digits(val));

  return (
    <div className="overflow-x-auto mb-6 font-serif">
      <table className="min-w-full border-collapse border border-gray-300 text-[12pt]">
        <thead className="bg-gray-50 text-[#134074]">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className="border px-2 py-1 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="even:bg-gray-50">
              <td className="border px-2 py-1 text-center font-semibold bg-gray-50">{row.slNo}</td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-left"
                  disabled={disabled}
                  value={row.name}
                  placeholder="Enter name"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!/^[a-zA-Z\s]*$/.test(v)) return;
                    writeText(ri, rows[ri].keys.nameKey, v);
                  }}
                  autoComplete="off"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                  disabled={disabled}
                  value={row.examined}
                  onChange={(e) => writeNum(ri, rows[ri].keys.examinedKey, e.target.value)}
                  autoComplete="off"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                  disabled={disabled}
                  value={row.cataract}
                  onChange={(e) => writeNum(ri, rows[ri].keys.cataractKey, e.target.value)}
                  autoComplete="off"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                  disabled={disabled}
                  value={row.otherDiseases}
                  onChange={(e) => writeNum(ri, rows[ri].keys.otherDiseasesKey, e.target.value)}
                  autoComplete="off"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                  disabled={disabled}
                  value={row.refractiveErrors}
                  onChange={(e) => writeNum(ri, rows[ri].keys.refractiveErrorsKey, e.target.value)}
                  autoComplete="off"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                  disabled={disabled}
                  value={row.spectaclesPrescribed}
                  onChange={(e) => writeNum(ri, rows[ri].keys.spectaclesPrescribedKey, e.target.value)}
                  autoComplete="off"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
