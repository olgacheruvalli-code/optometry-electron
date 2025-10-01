// src/components/VisionCenterTable.jsx
import React from "react";

/**
 * A robust 7-column Vision Center table.
 * Columns:
 *  # | Institution | Vision Centre | Patients Examined | Cataract Cases | Other Eye Diseases | Refractive Errors
 *
 * Back-compat: accepts many legacy/variant key names and normalizes them.
 * Emits a stable set of keys onChange:
 *   institution, visionCenter, examined, cataract, otherDiseases, refractiveErrors
 */

const NUM_ROWS = 10;

// Read a string field from a row using multiple possible keys
const readStr = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string") return v;
    if (v != null && typeof v?.toString === "function") return v.toString();
  }
  return "";
};

// Read a numeric field from a row using multiple possible keys; return "" for empty
const readNum = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v === "" || v == null) return "";
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
  }
  return "";
};

// Update helper (immutable)
const updateAt = (arr, idx, patch) => {
  const next = arr.slice();
  next[idx] = { ...(next[idx] || {}), ...patch };
  return next;
};

export default function VisionCenterTable({ data = [], onChange, disabled = false }) {
  // Build rows to show: existing rows + blank rows up to NUM_ROWS
  const rows = React.useMemo(() => {
    const base = Array.isArray(data) ? data.slice(0, NUM_ROWS) : [];
    while (base.length < NUM_ROWS) base.push({});
    return base;
  }, [data]);

  // Normalized getters (back-compat aliases)
  const getInstitution = (r) =>
    readStr(r, ["institution", "institutionName", "inst", "nameOfInstitution", "Name of Institution", "NameOfInstitution"]);

  const getVCName = (r) =>
    readStr(r, ["visionCenter", "visionCentre", "vcName", "name", "vision_center", "visioncentre", "Name of Vision Centre", "NameOfVisionCentre"]);

  const getExamined = (r) =>
    readNum(r, ["examined", "patientsExamined", "patients", "No of patients examined", "noPatientsExamined"]);

  const getCataract = (r) =>
    readNum(r, ["cataract", "cataractCases", "cataractDetected", "No of Cataract cases detected", "noCataract"]);

  const getOther = (r) =>
    readNum(r, ["otherDiseases", "otherEyeDiseases", "others", "No of other eye diseases", "noOtherDiseases"]);

  const getRefractive = (r) =>
    readNum(r, ["refractiveErrors", "refErrors", "refractive", "No of Refractive errors", "noRefractiveErrors"]);

  const handle = (rowIdx, key, rawVal) => {
    if (!onChange) return;

    // Validate & normalize by key
    if (key === "institution" || key === "visionCenter") {
      // Only letters, numbers, spaces, dash, slash, comma, dot
      const cleaned = (rawVal || "").replace(/[^a-zA-Z0-9 \-\/,.\(\)]/g, "");
      onChange(rowIdx, key, cleaned);
      return;
    }

    // Numeric fields: strip all non-digits
    const digits = String(rawVal || "").replace(/\D/g, "");
    onChange(rowIdx, key, digits);
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-auto w-full border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1 w-[36px] text-center">#</th>
            <th className="border p-1 text-left">Name of Institution</th>
            <th className="border p-1 text-left">Name of Vision Centre</th>
            <th className="border p-1 text-right">No of patients examined</th>
            <th className="border p-1 text-right">No of Cataract cases detected</th>
            <th className="border p-1 text-right">No of other eye diseases</th>
            <th className="border p-1 text-right">No of Refractive errors</th>
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

            return (
              <tr key={i}>
                <td className="border p-1 text-center">{i + 1}</td>

                <td className="border p-1">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={vInstitution}
                    onChange={(e) =>
                      handle(i, "institution", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="Enter institution name"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={vVCName}
                    onChange={(e) =>
                      handle(i, "visionCenter", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="Enter vision centre name"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vExamined}
                    onChange={(e) =>
                      handle(i, "examined", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vCataract}
                    onChange={(e) =>
                      handle(i, "cataract", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vOther}
                    onChange={(e) =>
                      handle(i, "otherDiseases", e.target.value)
                    }
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vRefractive}
                    onChange={(e) =>
                      handle(i, "refractiveErrors", e.target.value)
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

      {/* If parent forgot to provide onChange, prevent silent edits */}
      {!onChange && (
        <div className="mt-2 text-xs text-red-600">
          VisionCenterTable is read-only because no <code>onChange</code> prop was provided.
        </div>
      )}
    </div>
  );
}
