// src/components/VisionCenterTableNew.jsx
import React from "react";

/**
 * VisionCenterTableNew — for INDIVIDUAL ENTRY + INDIVIDUAL VIEW ONLY.
 * Always includes the extra column:
 *   "No of Spectacles prescribed"
 *
 * Stable write keys onChange:
 *   institution, visionCenter, examined, cataract, otherDiseases,
 *   refractiveErrors, spectaclesPrescribed
 *
 * Back-compat reads many legacy/variant keys so old data renders fine.
 */

const NUM_ROWS = 10;

// Helpers
const readStr = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string") return v;
    if (v != null && typeof v?.toString === "function") return v.toString();
  }
  return "";
};

const readNum = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v === "" || v == null) return "";
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
  }
  return "";
};

export default function VisionCenterTableNew({
  data = [],
  onChange,
  disabled = false,
  showInstitution = false, // entry/view usually hides institution col
}) {
  const rows = React.useMemo(() => {
    const base = Array.isArray(data) ? data.slice(0, NUM_ROWS) : [];
    while (base.length < NUM_ROWS) base.push({});
    return base;
  }, [data]);

  // Back-compat getters
  const getInstitution = (r) =>
    readStr(r, [
      "institution", "institutionName", "inst",
      "nameOfInstitution", "Name of Institution", "NameOfInstitution",
    ]);

  const getVCName = (r) =>
    readStr(r, [
      "visionCenter", "visionCentre", "vcName", "name",
      "vision_center", "visioncentre", "Name of Vision Centre", "NameOfVisionCentre",
    ]);

  const getExamined = (r) =>
    readNum(r, [
      "examined", "patientsExamined", "patients",
      "No of patients examined", "noPatientsExamined",
    ]);

  const getCataract = (r) =>
    readNum(r, [
      "cataract", "cataractCases", "cataractDetected",
      "No of Cataract cases detected", "noCataract",
    ]);

  const getOther = (r) =>
    readNum(r, [
      "otherDiseases", "otherEyeDiseases", "others",
      "No of other eye diseases", "noOtherDiseases",
    ]);

  const getRefractive = (r) =>
    readNum(r, [
      "refractiveErrors", "refErrors", "refractive",
      "No of Refractive errors", "noRefractiveErrors",
    ]);

  const getSpectacles = (r) =>
    readNum(r, [
      "spectaclesPrescribed", "spectacles", "specs",
      "No of Spectacles prescribed", "No.of Spectacles prescribed",
    ]);

  const handle = (rowIdx, key, rawVal) => {
    if (!onChange) return;
    if (key === "institution" || key === "visionCenter") {
      const cleaned = (rawVal || "").replace(/[^a-zA-Z0-9 \-\/,.\(\)]/g, "");
      onChange(rowIdx, key, cleaned);
      return;
    }
    const digits = String(rawVal || "").replace(/\D/g, "");
    onChange(rowIdx, key, digits);
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-auto w-full border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1 w-[36px] text-center">#</th>
            {showInstitution && (
              <th className="border p-1 text-left">Name of Institution</th>
            )}
            <th className="border p-1 text-left">Name of Vision Centre</th>
            <th className="border p-1 text-right">No of patients examined</th>
            <th className="border p-1 text-right">No of Cataract cases detected</th>
            <th className="border p-1 text-right">No of other eye diseases</th>
            <th className="border p-1 text-right">No of Refractive errors</th>
            <th className="border p-1 text-right">No of Spectacles prescribed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const vInstitution = getInstitution(row);
            const vVCName = getVCName(row);
            const vExamined = getExamined(row);
            const vCataract = getCataract(row);
            const vOther = getOther(row);
            const vRefractive = getRefractive(row);
            const vSpectacles = getSpectacles(row);

            return (
              <tr key={i}>
                <td className="border p-1 text-center">{i + 1}</td>

                {showInstitution && (
                  <td className="border p-1">
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={vInstitution}
                      onChange={(e) => handle(i, "institution", e.target.value)}
                      disabled={disabled}
                      placeholder="Enter institution name"
                    />
                  </td>
                )}

                <td className="border p-1">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={vVCName}
                    onChange={(e) => handle(i, "visionCenter", e.target.value)}
                    disabled={disabled}
                    placeholder="Enter vision centre name"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vExamined}
                    onChange={(e) => handle(i, "examined", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vCataract}
                    onChange={(e) => handle(i, "cataract", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vOther}
                    onChange={(e) => handle(i, "otherDiseases", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vRefractive}
                    onChange={(e) => handle(i, "refractiveErrors", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vSpectacles}
                    onChange={(e) =>
                      handle(i, "spectaclesPrescribed", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!onChange && (
        <div className="mt-2 text-xs text-red-600">
          VisionCenterTableNew is read-only because no <code>onChange</code> prop was provided.
        </div>
      )}
    </div>
  );
}
