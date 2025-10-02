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

/* Canonical metric keys we render */
const VC_METRIC_KEYS = [
  "examined",
  "cataract",
  "other_diseases",
  "refractive_errors",
  "spectacles_prescribed",
];

/* Value pickers */
const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const pickStr = (...vals) => {
  for (const v of vals) if (isNonEmpty(v)) return String(v).trim();
  return "";
};
const pickNum = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v) !== "" && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return 0;
};

/* ----------------- render-time resolvers (use RAW row first) --------------- */

const getNameFromRow = (rowObj) => {
  const raw = rowObj?.__raw || {};
  const data = rowObj?.__data || {};
  const idx = rowObj?.__idx;

  // 1) exact vc_{i}_name if we know the row index
  if (idx != null) {
    const v = raw[`vc_${idx}_name`];
    if (isNonEmpty(v)) return String(v).trim();
  }

  // 2) any vc_*_name
  for (const k of Object.keys(raw)) {
    const kl = k.toLowerCase();
    if (/^vc_\d+_name$/.test(kl) && isNonEmpty(raw[k])) return String(raw[k]).trim();
  }

  // 3) other *_name OR *centre/*center keys with non-empty values
  for (const k of Object.keys(raw)) {
    const kl = k.toLowerCase();
    if ((/_name$/.test(kl) || /(centre|center)$/.test(kl)) && isNonEmpty(raw[k])) {
      return String(raw[k]).trim();
    }
  }

  // 4) fallbacks from normalized data
  return pickStr(data.name);
};

const getMetricFromRow = (rowObj, which /* "refractive" | "spectacles" */) => {
  const raw = rowObj?.__raw || {};
  const data = rowObj?.__data || {};
  const idx = rowObj?.__idx;

  const tryKeys = (obj, keys) => {
    for (const k of keys) {
      const v = Number(obj[k]);
      if (Number.isFinite(v)) return v;
    }
    return 0;
  };

  if (which === "refractive") {
    // 1) prefer vc_{i}_refractive_errors
    if (idx != null) {
      const v = tryKeys(raw, [
        `vc_${idx}_refractive_errors`,
        `vc_${idx}_refractive_error`,
        `vc_${idx}_refraction`,
      ]);
      if (v) return v;
    }
    // 2) any vc_* matches
    const vcKeys = Object.keys(raw).filter((k) =>
      /^vc_\d+_/.test(k) && /(refract|refraction)/i.test(k)
    );
    const v2 = tryKeys(raw, vcKeys);
    if (v2) return v2;

    // 3) generic/raw fallbacks
    const v3 = tryKeys(raw, ["refractive_errors", "refractive_error", "refraction"]);
    if (v3) return v3;

    // 4) normalized
    return Number(data.refractive_errors) || 0;
  }

  if (which === "spectacles") {
    // 1) prefer vc_{i}_spectacles_prescribed
    if (idx != null) {
      const v = tryKeys(raw, [
        `vc_${idx}_spectacles_prescribed`,
        `vc_${idx}_spectacle_prescribed`,
        `vc_${idx}_spectacles`,
      ]);
      if (v) return v;
    }
    // 2) any vc_* matches
    const vcKeys = Object.keys(raw).filter((k) =>
      /^vc_\d+_/.test(k) && /(spectacle|spectacles)/i.test(k) && /(prescrib|scribe)?/i.test(k)
    );
    const v2 = tryKeys(raw, vcKeys);
    if (v2) return v2;

    // 3) generic/raw fallbacks
    const v3 = tryKeys(raw, ["spectacles_prescribed", "spectacle_prescribed", "spectacles"]);
    if (v3) return v3;

    // 4) normalized
    return Number(data.spectacles_prescribed) || 0;
  }

  return 0;
};

/* ===================================================================== */

export default function ViewDistrictTables({ user, month, year }) {
  const district = user?.district || "";

  const eyeBankSection = useMemo(
    () => sections.find((s) => s?.title?.toLowerCase().includes("eye bank")),
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

    // Map any VC row to canonical fields; keep RAW + 1-based index for render
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
        // leave refractive/spectacles to render-time resolver as well
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
        __idx: idx,
      };
    };

    (async () => {
      setLoading(true);
      setErrText("");
      try {
        const q =
          `district=${encodeURIComponent(district)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;
        let list = await fetchList(`${API_BASE}/api/reports?${q}`);
        if (!list.length) list = await fetchList(`${API_BASE}/api/reports`);

        const filtered = list.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(district).trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() ===
              String(month).trim().toLowerCase() &&
            String(d?.year || "") === String(year)
        );
        const source = filtered.length ? filtered : list;
        if (!source.length) {
          setEbTotals(fixedLengthArray((eyeBankSection?.rows || []).length));
          setVcRows([]);
          setLoading(false);
          setErrText("No reports returned by API.");
          return;
        }

        /* Eye Bank totals */
        const ebOut = fixedLengthArray((eyeBankSection?.rows || []).length);
        source.forEach((rep) => {
          const eb = rep?.eyeBank || rep?.eyebank || rep?.eye_bank || [];
          for (let i = 0; i < ebOut.length; i++) {
            const srcRow = eb[i];
            if (!srcRow) continue;
            addRowInto(ebOut[i], srcRow, ebRowKeys[i]);
          }
        });

        /* Vision Centre rows */
        const vcOut = [];
        source.forEach((rep) => {
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
              if (String(rowObj[`vc_${j}_name`] || "").trim() !== "" || anyNum) rebuilt.push(rowObj);
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
                __raw: canon.__raw,
                __idx: canon.__idx, // 1-based index in that report
              });
            }
          });
        });

        vcOut.sort((a, b) => {
          const ai = (a.__institution || "").toLowerCase();
          const bi = (b.__institution || "").toLowerCase();
          if (ai < bi) return -1;
          if (ai > bi) return 1;
          const an = String(getNameFromRow(a) || "").toLowerCase();
          const bn = String(getNameFromRow(b) || "").toLowerCase();
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

    return () => { cancelled = true; };
  }, [district, month, year, eyeBankSection, visionCenterSection]);

  /* ------------------------------ renderers ------------------------------ */
  const renderDistrictVisionCenterTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1 text-left w-14">SL. NO</th>
              <th className="border px-2 py-1 text-left">Institution</th>
              <th className="border px-2 py-1 text-left">Name of Vision Centre</th>
              {VC_METRIC_KEYS.slice().sort((a, b) => metricRank(a) - metricRank(b)).map((key) => (
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

                  {/* Column 3 — resolve from RAW first */}
                  <td className="border px-2 py-1">{getNameFromRow(row)}</td>

                  {/* Cols 4–6 from canonical; 7–8 via RAW-first resolvers */}
                  <td className="border px-2 py-1 text-right">{num(d.examined)}</td>
                  <td className="border px-2 py-1 text-right">{num(d.cataract)}</td>
                  <td className="border px-2 py-1 text-right">{num(d.other_diseases)}</td>
                  <td className="border px-2 py-1 text-right">{getMetricFromRow(row, "refractive")}</td>
                  <td className="border px-2 py-1 text-right">{getMetricFromRow(row, "spectacles")}</td>
                </tr>
              );
            })}
            {!vcRows.length && (
              <tr>
                <td className="border px-2 py-3 text-center text-gray-500" colSpan={3 + VC_METRIC_KEYS.length}>
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

      {loading && <div className="text-center text-sm text-gray-600">Loading district tables…</div>}
      {errText && <div className="text-center text-sm text-red-600">{errText}</div>}

      <section>
        <h3 className="text-base font-semibold mb-2">III. EYE BANK — District Total</h3>
        <EyeBankTable data={ebTotals} disabled cumulative />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">V. VISION CENTER — District Total</h3>
        {renderDistrictVisionCenterTable()}
      </section>
    </div>
  );
}
