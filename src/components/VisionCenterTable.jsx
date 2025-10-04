// src/components/VisionCenterTable.jsx
import React from "react";

/** Get the first defined, non-null value from possible keys */
function read(row, keys, fallback = "") {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

/** Coerce numeric-looking strings to integers for footer totals */
function toInt(v) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function VisionCenterTable({
  data = [],
  onChange,
  disabled = false,
  showInstitution = true, // 👈 NEW: hide Institution column when false
}) {
  const rows = Array.isArray(data) ? data : [];

  // Write only to canonical field; caller's setState should merge rows (spread)
  const handle = (rowIdx, canonicalKey, value) => {
    if (!onChange) return;
    onChange(rowIdx, canonicalKey, value);
  };

  // When Institution column is hidden, totals header colspan changes
  const totalLabelColSpan = showInstitution ? 3 : 2;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-center">Sl. No.</th>
            {showInstitution && (
              <th className="border p-2">Name of Institution</th>
            )}
            <th className="border p-2">Name of Vision Centre</th>
            <th className="border p-2 text-right">No. of patients examined</th>
            <th className="border p-2 text-right">No. of Cataract cases detected</th>
            <th className="border p-2 text-right">No. of other eye diseases</th>
            <th className="border p-2 text-right">No. of Refractive errors</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border p-2 text-center" colSpan={showInstitution ? 7 : 6}>
                No rows. Add entries from the report entry page.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              // Read with legacy aliases so old data shows up again
              const vInstitution = read(row, [
                "institution", "inst", "hospital", "institutionName", "nameOfInstitution"
              ]);
              const vCentre = read(row, [
                "centre", "center", "visionCentre", "visionCenter", "vcName", "name", "vision_centre"
              ]);
              const vExamined = read(row, [
                "examined", "patientsExamined", "patients", "noExamined"
              ], "");
              const vCataract = read(row, [
                "cataract", "cataractDetected", "cat"
              ], "");
              const vOther = read(row, [
                "other", "otherDiseases", "otherEyeDiseases"
              ], "");
              const vRefrac = read(row, [
                "refrac", "refr", "refractiveErrors", "refraction"
              ], "");

              return (
                <tr key={i}>
                  <td className="border p-2 text-center">{i + 1}</td>

                  {showInstitution && (
                    <td className="border p-1">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1"
                        value={vInstitution}
                        onChange={(e) => handle(i, "institution", e.target.value)}
                        disabled={disabled}
                        placeholder="Institution name"
                      />
                    </td>
                  )}

                  <td className="border p-1">
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={vCentre}
                      onChange={(e) => handle(i, "centre", e.target.value)}
                      disabled={disabled}
                      placeholder="Vision centre name"
                    />
                  </td>

                  <td className="border p-1 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full border rounded px-2 py-1 text-right"
                      value={String(vExamined)}
                      onChange={(e) =>
                        handle(i, "examined", e.target.value.replace(/\D/g, ""))
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
                      value={String(vCataract)}
                      onChange={(e) =>
                        handle(i, "cataract", e.target.value.replace(/\D/g, ""))
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
                      value={String(vOther)}
                      onChange={(e) =>
                        handle(i, "other", e.target.value.replace(/\D/g, ""))
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
                      value={String(vRefrac)}
                      onChange={(e) =>
                        handle(i, "refrac", e.target.value.replace(/\D/g, ""))
                      }
                      disabled={disabled}
                      placeholder="0"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="border p-2 text-right" colSpan={totalLabelColSpan}>Total</td>
              <td className="border p-2 text-right">
                {rows.reduce((s, r) => s + toInt(read(r, ["examined","patientsExamined","patients","noExamined"])), 0)}
              </td>
              <td className="border p-2 text-right">
                {rows.reduce((s, r) => s + toInt(read(r, ["cataract","cataractDetected","cat"])), 0)}
              </td>
              <td className="border p-2 text-right">
                {rows.reduce((s, r) => s + toInt(read(r, ["other","otherDiseases","otherEyeDiseases"])), 0)}
              </td>
              <td className="border p-2 text-right">
                {rows.reduce((s, r) => s + toInt(read(r, ["refrac","refr","refractiveErrors","refraction"])), 0)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
