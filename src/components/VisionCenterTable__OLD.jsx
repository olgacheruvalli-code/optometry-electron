// src/components/VisionCenterTable.jsx
import React from "react";

/* Excel export (optional, used when showDownload=true) */
const exportTable = async (tableId, filename = "export.xlsx") => {
  const el = document.getElementById(tableId);
  if (!el) return alert("Table not found: " + tableId);
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.table_to_book(el, { sheet: "Sheet1" });
  XLSX.writeFile(wb, filename);
};

const NUM_ROWS = 10;

/* ------------ helpers (compat + parsing) ------------ */
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

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function VisionCenterTable({
  data = [],
  onChange,
  disabled = false,
  showInstitution = false,         // entry form hides institution column
  showDownload = false,
  showTotals = true,               // ✅ include Total row like your screenshot
  tableId = "visionCenterTable",
  month,
  year,
  district,
}) {
  /* Build rows: pad to 10 */
  const rows = React.useMemo(() => {
    const base = Array.isArray(data) ? data.slice(0, NUM_ROWS) : [];
    while (base.length < NUM_ROWS) base.push({});
    return base;
  }, [data]);

  /* Normalized getters (accept many legacy keys) */
  const getInstitution = (r) =>
    readStr(r, [
      "institution",
      "institutionName",
      "inst",
      "nameOfInstitution",
      "Name of Institution",
      "NameOfInstitution",
    ]);

  const getVCName = (r) =>
    readStr(r, [
      "visionCenter",
      "visionCentre",
      "vcName",
      "name",
      "vision_center",
      "visioncentre",
      "Name of Vision Centre",
      "NameOfVisionCentre",
    ]);

  const getExamined = (r) =>
    readNum(r, [
      "examined",
      "patientsExamined",
      "patients",
      "No of patients examined",
      "noPatientsExamined",
    ]);

  const getCataract = (r) =>
    readNum(r, [
      "cataract",
      "cataractCases",
      "cataractDetected",
      "No of Cataract cases detected",
      "noCataract",
    ]);

  const getOther = (r) =>
    readNum(r, [
      "otherDiseases",
      "otherEyeDiseases",
      "others",
      "No of other eye diseases",
      "noOtherDiseases",
    ]);

  const getRefractive = (r) =>
    readNum(r, [
      "refractiveErrors",
      "refErrors",
      "refractive",
      "No of Refractive errors",
      "noRefractiveErrors",
    ]);

  /* ✅ NEW: spectacles prescribed */
  const getSpectacles = (r) =>
    readNum(r, [
      "spectaclesPrescribed",
      "spectacles",
      "spectacles_prescribed",
      "No of Spectacles prescribed",
      "noSpectaclesPrescribed",
      "No.of spectacles presribed",
    ]);

  /* Controlled change handler */
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

  /* Totals (client-side) */
  const totals = React.useMemo(() => {
    let examined = 0,
      cataract = 0,
      other = 0,
      refractive = 0,
      spectacles = 0;

    rows.forEach((r) => {
      examined += toInt(getExamined(r));
      cataract += toInt(getCataract(r));
      other += toInt(getOther(r));
      refractive += toInt(getRefractive(r));
      spectacles += toInt(getSpectacles(r));
    });

    return { examined, cataract, other, refractive, spectacles };
  }, [rows]);

  /* ---------- render ---------- */
  return (
    <div className="overflow-x-auto">
      <table id={tableId} className="table-auto w-full border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1 w-[48px] text-center">Sl. No.</th>
            {showInstitution && (
              <th className="border p-1 text-left">Name of Institution</th>
            )}
            <th className="border p-1 text-left">Name of Vision Centre</th>
            <th className="border p-1 text-right">No of patients examined</th>
            <th className="border p-1 text-right">No of Cataract cases detected</th>
            <th className="border p-1 text-right">No of other eye diseases</th>
            <th className="border p-1 text-right">No of Refractive errors</th>
            {/* ✅ NEW column header */}
            <th className="border p-1 text-right">No.of spectacles presribed</th>
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
                      placeholder="Institution name"
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
                    placeholder="Vision centre name"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vExamined}
                    onChange={(e) => handle(i, "examined", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vCataract}
                    onChange={(e) => handle(i, "cataract", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vOther}
                    onChange={(e) => handle(i, "otherDiseases", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border rounded px-2 py-1 text-right"
                    value={vRefractive}
                    onChange={(e) => handle(i, "refractiveErrors", e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                  />
                </td>

                {/* ✅ NEW input cell */}
                <td className="border p-1 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
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

          {/* ✅ Total row like your existing screen */}
          {showTotals && (
            <tr>
              <td className="border p-1 text-right font-semibold" colSpan={showInstitution ? 2 : 1}>
                Total
              </td>
              <td className="border p-1 text-right font-semibold">{totals.examined}</td>
              <td className="border p-1 text-right font-semibold">{totals.cataract}</td>
              <td className="border p-1 text-right font-semibold">{totals.other}</td>
              <td className="border p-1 text-right font-semibold">{totals.refractive}</td>
              <td className="border p-1 text-right font-semibold">{totals.spectacles}</td>
            </tr>
          )}
        </tbody>
      </table>

      {showDownload && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() =>
              exportTable(
                tableId,
                `VisionCenter_${district || ""}_${month || ""}-${year || ""}.xlsx`
              )
            }
            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Download as Excel
          </button>
        </div>
      )}

      {!onChange && (
        <div className="mt-2 text-xs text-red-600">
          VisionCenterTable is read-only because no <code>onChange</code> prop was provided.
        </div>
      )}
    </div>
  );
}
