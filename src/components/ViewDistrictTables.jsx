// src/components/ViewDistrictTables.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import sections from "../data/questions";
import EyeBankTable from "./EyeBankTable";

/* ----------------------------- helpers ------------------------------ */

function extractRowKeyMatrix(section) {
  const rows = Array.isArray(section?.rows) ? section.rows : [];
  return rows.map((row) => {
    const keys = [];
    for (const [k, v] of Object.entries(row || {})) {
      if (k.endsWith("Key") && typeof v === "string" && v.trim()) keys.push(v);
    }
    return keys;
  });
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function addRowInto(targetRow, sourceRow, numericOnlyKeys = null) {
  if (!sourceRow || typeof sourceRow !== "object") return;
  for (const [k, v] of Object.entries(sourceRow)) {
    if (Array.isArray(numericOnlyKeys) && numericOnlyKeys.length && !numericOnlyKeys.includes(k))
      continue;
    const n = num(v);
    if (n || n === 0) targetRow[k] = num(targetRow[k]) + n;
  }
}

const fixedLengthArray = (len) => Array.from({ length: len }, () => ({}));

function prettyMetric(k = "") {
  const s = String(k).replace(/[_\-]+/g, " ").toLowerCase();
  if (/(patients.*examined|examined)/i.test(s)) return "No of patients examined";
  if (/cataract/i.test(s)) return "No of Cataract cases detected";
  if (/(other).*dise/i.test(s)) return "No of other eye diseases";
  if (/refract/i.test(s)) return "No of Refractive errors";
  if (/spectacle/i.test(s)) return "No of Spectacles Prescribed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function metricRank(k = "") {
  const s = String(k).toLowerCase();
  if (s.includes("examined") || /patients/.test(s)) return 1;
  if (s.includes("cataract")) return 2;
  if (s.includes("other") && s.includes("dise")) return 3;
  if (s.includes("refract")) return 4;
  if (s.includes("spectacle")) return 5;
  return 99;
}

/* Canonical VC metric keys we render */
const VC_METRIC_KEYS = [
  "examined",
  "cataract",
  "other_diseases",
  "refractive_errors",
  "spectacles_prescribed",
];

/* ===================================================================== */

export default function ViewDistrictTables({ user, month, year }) {
  const district = user?.district || "";

  const eyeBankSection = useMemo(
    () => sections.find((s) => (s?.title || "").toLowerCase().includes("eye bank")),
    []
  );
  const visionCenterSection = useMemo(
    () => sections.find((s) => (s?.title || "").toLowerCase().match(/vision (center|centre)/)),
    []
  );

  const ebRowKeys = useMemo(() => extractRowKeyMatrix(eyeBankSection), [eyeBankSection]);

  const [ebTotals, setEbTotals] = useState(() =>
    fixedLengthArray((eyeBankSection?.rows || []).length)
  );
  const [vcRows, setVcRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState("");

  useEffect(() => {
    if (!district || !month || !year) return;

    let cancelled = false;

    const fetchList = async (url) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return [];
        const j = await r.json().catch(() => ({}));
        return Array.isArray(j) ? j : Array.isArray(j?.docs) ? j.docs : [];
      } catch {
        return [];
      }
    };

    // keys from questions.js for row i; fallback to vc_{i}_*
    const vcKeyset = (i) => {
      const idx = i + 1;
      const cfg = Array.isArray(visionCenterSection?.rows) ? visionCenterSection.rows[i] : null;
      return {
        nameKey: cfg?.nameKey ?? cfg?.NameKey ?? `vc_${idx}_name`,
        examinedKey: cfg?.patientsExaminedKey ?? `vc_${idx}_examined`,
        cataractKey: cfg?.cataractDetectedKey ?? `vc_${idx}_cataract`,
        otherDiseasesKey: cfg?.otherEyeDiseasesKey ?? `vc_${idx}_other_diseases`,
        refractiveErrorsKey: cfg?.refractiveErrorsKey ?? `vc_${idx}_refractive_errors`,
        spectaclesPrescribedKey: cfg?.spectaclesPrescribedKey ?? `vc_${idx}_spectacles_prescribed`,
      };
    };

    const pickStr = (...vals) => {
      for (const v of vals)
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      return "";
    };
    const pickNum = (...vals) => {
      for (const v of vals)
        if (v !== undefined && v !== null && String(v) !== "" && Number.isFinite(Number(v)))
          return Number(v);
      return 0;
    };

    const mapRowToCanonical = (row, i) => {
      const r = row || {};
      const ks = vcKeyset(i);
      const idx = i + 1;

      return {
        name: pickStr(r[ks.nameKey], r[`vc_${idx}_name`], r.name),
        examined: pickNum(
          r[ks.examinedKey],
          r[`vc_${idx}_examined`],
          r.examined,
          r.patients_examined,
          r.patientsExamined
        ),
        cataract: pickNum(
          r[ks.cataractKey],
          r[`vc_${idx}_cataract`],
          r.cataract,
          r.cataractDetected,
          r.cataract_cases
        ),
        other_diseases: pickNum(
          r[ks.otherDiseasesKey],
          r[`vc_${idx}_other_diseases`],
          r.other_diseases,
          r.otherDiseases
        ),
        refractive_errors: pickNum(
          r[ks.refractiveErrorsKey],
          r[`vc_${idx}_refractive_errors`],
          r.refractive_errors,
          r.refractive_error,
          r.refraction
        ),
        spectacles_prescribed: pickNum(
          r[ks.spectaclesPrescribedKey],
          r[`vc_${idx}_spectacles_prescribed`],
          r.spectacles_prescribed,
          r.spectacle_prescribed,
          r.spectacles
        ),
        __raw: r,
      };
    };

    (async () => {
      setLoading(true);
      setErrText("");
      try {
        // 1) Query for exact month/year for the district
        const q =
          `district=${encodeURIComponent(district)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;
        let list = await fetchList(`${API_BASE}/api/reports?${q}`);

        // 2) If nothing comes back, optionally broaden by district only
        //    (we will still STRICTLY filter to month/year below).
        if (!list.length) {
          const q2 = `district=${encodeURIComponent(district)}`;
          list = await fetchList(`${API_BASE}/api/reports?${q2}`);
        }

        // 3) STRICT filter — never use data from other months/years
        const filtered = list.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(district).trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() ===
              String(month).trim().toLowerCase() &&
            String(d?.year || "") === String(year)
        );

        if (!filtered.length) {
          if (!cancelled) {
            setEbTotals(fixedLengthArray((eyeBankSection?.rows || []).length));
            setVcRows([]);
            setErrText(`No district reports for ${month} ${year}.`);
          }
          return;
        }

        /* Eye Bank totals */
        const ebOut = fixedLengthArray((eyeBankSection?.rows || []).length);
        filtered.forEach((rep) => {
          const eb = rep?.eyeBank || rep?.eyebank || rep?.eye_bank || [];
          for (let i = 0; i < ebOut.length; i++) {
            const srcRow = eb[i];
            if (!srcRow) continue;
            addRowInto(ebOut[i], srcRow, ebRowKeys[i]);
          }
        });

        /* Vision Centre rows */
        const vcOut = [];
        filtered.forEach((rep) => {
          const instName = String(rep?.institution || "").trim();

          let vc =
            rep?.visionCenter ||
            rep?.visionCentre ||
            rep?.vision_centre ||
            rep?.visioncentre ||
            [];

          // Rebuild from answers if array missing
          if (!Array.isArray(vc) || !vc.length) {
            const a = rep?.answers || {};
            const rebuilt = [];
            for (let j = 1; j <= 25; j++) {
              const rowObj = {
                [`vc_${j}_name`]: a[`vc_${j}_name`],
                [`vc_${j}_examined`]: a[`vc_${j}_examined`],
                [`vc_${j}_cataract`]: a[`vc_${j}_cataract`],
                [`vc_${j}_other_diseases`]: a[`vc_${j}_other_diseases`],
                [`vc_${j}_refractive_errors`]: a[`vc_${j}_refractive_errors`],
                [`vc_${j}_spectacles_prescribed`]: a[`vc_${j}_spectacles_prescribed`],
              };
              const anyNum = Object.values(rowObj).some(
                (v) => Number.isFinite(Number(v)) && Number(v) !== 0
              );
              if (String(rowObj[`vc_${j}_name`] || "").trim() !== "" || anyNum) {
                rebuilt.push(rowObj);
              }
            }
            vc = rebuilt;
          }

          if (!Array.isArray(vc) || !vc.length) return;

          vc.forEach((row, i) => {
            const canon = mapRowToCanonical(row, i);
            const hasAny =
              String(canon.name || "").trim() !== "" ||
              VC_METRIC_KEYS.some((k) => num(canon[k]) !== 0);
            if (hasAny) {
              vcOut.push({
                __institution: instName || "Unknown Institution",
                __data: canon,
              });
            }
          });
        });

        vcOut.sort((a, b) => {
          const ai = (a.__institution || "").toLowerCase();
          const bi = (b.__institution || "").toLowerCase();
          if (ai < bi) return -1;
          if (ai > bi) return 1;
          const an = String(a.__data?.name || "").toLowerCase();
          const bn = String(b.__data?.name || "").toLowerCase();
          return an.localeCompare(bn, undefined, { numeric: true });
        });

        if (!cancelled) {
          setEbTotals(ebOut);
          setVcRows(vcOut);
        }
      } catch (e) {
        console.error("District tables fetch failed:", e);
        if (!cancelled) {
          setErrText("Failed to load district tables. See console for details.");
          setEbTotals(fixedLengthArray((eyeBankSection?.rows || []).length));
          setVcRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [district, month, year, eyeBankSection, visionCenterSection, ebRowKeys]);

  /* --------------------------- XLSX exporters --------------------------- */
  const handleDownloadEyeBank = async () => {
    const XLSX = await import("xlsx");

    // Column headers (match on-screen labels)
    const EB_HEADERS = [
      "Status",
      "No of Eyes collected during the month",
      "No of Eyes utilized for Keratoplasty",
      "No of Eyes used for Research purpose",
      "No of Eyes distributed to other Institutions",
      "No of Eye Donation Pledge forms received",
    ];

    // Try to derive row labels from the section config, else sensible fallbacks.
    const rowLabel = (i) => {
      const cfg = eyeBankSection?.rows?.[i] || {};
      return (
        cfg.status ||
        cfg.label ||
        cfg.name ||
        (i === 0 ? "Eye Bank" : i === 1 ? "Eye Collection Centre" : `Row ${i + 1}`)
      );
    };

    // Keys per row (already in correct order from questions.js)
    const aoa = [EB_HEADERS];
    for (let i = 0; i < ebTotals.length; i++) {
      const keys = ebRowKeys[i] || [];
      if (!keys.length) continue;
      const row = [rowLabel(i)];
      for (const k of keys) row.push(num(ebTotals[i]?.[k]));
      // ensure col count matches header length
      while (row.length < EB_HEADERS.length) row.push(0);
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = EB_HEADERS.map((h, idx) =>
      idx === 0 ? { wch: 24 } : { wch: Math.min(Math.max(h.length, 10), 42) }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eye Bank");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EyeBank_${district || "District"}_${month}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadVisionCenter = async () => {
    const XLSX = await import("xlsx");

    const VC_HEADERS = [
      "SL. NO",
      "Institution",
      "Name of Vision Centre",
      "No of patients examined",
      "No of Cataract cases detected",
      "No of other eye diseases",
      "No of Refractive errors",
      "No of Spectacles Prescribed",
    ];

    const aoa = [VC_HEADERS];
    vcRows.forEach((row, idx) => {
      const d = row.__data || {};
      aoa.push([
        idx + 1,
        row.__institution || "",
        String(d.name || ""),
        num(d.examined),
        num(d.cataract),
        num(d.other_diseases),
        num(d.refractive_errors),
        num(d.spectacles_prescribed),
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = VC_HEADERS.map((h, i) =>
      i <= 2 ? { wch: Math.max(18, h.length + 2) } : { wch: 16 }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vision Center");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `VisionCenter_${district || "District"}_${month}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ------------------------------ RENDER VC LIST ----------------------------- */
  const renderDistrictVisionCenterTable = () => {
    return (
      <div className="overflow-x-auto">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            className="px-3 py-1.5 bg-green-600 text-white rounded disabled:opacity-50"
            onClick={handleDownloadVisionCenter}
            disabled={!vcRows.length}
          >
            Download Vision Center (XLSX)
          </button>
        </div>

        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1 text-left w-14">SL. NO</th>
              <th className="border px-2 py-1 text-left">Institution</th>
              <th className="border px-2 py-1 text-left">Name of Vision Centre</th>
              {VC_METRIC_KEYS.slice()
                .sort((a, b) => metricRank(a) - metricRank(b))
                .map((key) => (
                  <th key={key} className="border px-2 py-1 text-center">
                    {prettyMetric(key)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {vcRows.map((row, idx) => {
              const d = row.__data || {};
              return (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{row.__institution || ""}</td>
                  <td className="border px-2 py-1">{String(d.name || "")}</td>
                  {VC_METRIC_KEYS.slice()
                    .sort((a, b) => metricRank(a) - metricRank(b))
                    .map((key) => (
                      <td key={key} className="border px-2 py-1 text-right">
                        {num(d[key])}
                      </td>
                    ))}
                </tr>
              );
            })}
            {!vcRows.length && (
              <tr>
                <td
                  className="border px-2 py-3 text-center text-gray-500"
                  colSpan={3 + VC_METRIC_KEYS.length}
                >
                  No Vision Centre data for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="text-center text-lg font-bold">
        District Tables — {district} ({month} {year})
      </div>

      {loading && (
        <div className="text-center text-sm text-gray-600">
          Loading district tables…
        </div>
      )}
      {errText && <div className="text-center text-sm text-red-600">{errText}</div>}

      {/* Eye Bank: district total */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">III. EYE BANK — District Total</h3>
          <button
            type="button"
            className="px-3 py-1.5 bg-green-600 text-white rounded disabled:opacity-50"
            onClick={handleDownloadEyeBank}
            disabled={!ebTotals?.length}
          >
            Download Eye Bank (XLSX)
          </button>
        </div>
        <EyeBankTable data={ebTotals} disabled cumulative />
      </section>

      {/* Vision Center: each real centre row */}
      <section>
        <h3 className="text-base font-semibold mb-2">
          V. VISION CENTER — District Total
        </h3>
        {renderDistrictVisionCenterTable()}
      </section>
    </div>
  );
}
