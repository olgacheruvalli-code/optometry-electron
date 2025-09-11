// src/components/ViewDistrictTables.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import sections from "../data/questions";
import EyeBankTable from "./EyeBankTable";

/* ----------------------------- small helpers ------------------------------ */

// For Eye Bank totals: collect numeric keys per template row
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

/* Make human labels for VC metric keys/suffixes */
function prettyMetric(k = "") {
  const s = String(k).replace(/[_\-]+/g, " ").toLowerCase();
  if (/(patients.*examined|examined)/i.test(s)) return "No of patients examined";
  if (/cataract/i.test(s)) return "No of Cataract cases detected";
  if (/(other).*dise/i.test(s)) return "No of other eye diseases";
  if (/refract/i.test(s)) return "No of Refractive errors";
  if (/spectacle/i.test(s)) return "No of Spectacles Prescribed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Preferred order for VC metric columns */
function metricRank(k = "") {
  const s = String(k).toLowerCase();
  if (s.includes("examined") || /patients/.test(s)) return 1;
  if (s.includes("cataract")) return 2;
  if (s.includes("other") && s.includes("dise")) return 3;
  if (s.includes("refract")) return 4;
  if (s.includes("spectacle")) return 5;
  return 99;
}

/* -------- Suffix-based helpers (kept for compatibility) ------------------- */

const VC_SUFFIXES = [
  ["_examined", ["examined", "patientsExamined", "patients_examined"]],
  ["_cataract", ["cataract", "cataractDetected", "cataract_cases"]],
  ["_other_diseases", ["otherDiseases", "other_diseases"]],
  ["_refractive_errors", ["refractiveErrors", "refractive_errors"]],
  ["_spectacles_prescribed", ["spectaclesPrescribed", "spectacles_prescribed"]],
];

// find a value by suffix (e.g. “…_examined”), ignoring row index prefixes
function findBySuffix(obj, suffix) {
  if (!obj) return undefined;
  const suf = String(suffix).toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase().endsWith(suf)) return obj[k];
  }
  return undefined;
}

// SMART getMetric: legacy-if-real → suffix → alt-suffix variants
function getMetric(row, suffix, legacy = []) {
  // 1) legacy keys only if they carry a real value (not "", null, undefined)
  for (const key of legacy) {
    const val = row?.[key];
    if (val !== undefined && val !== null && String(val) !== "") {
      return num(val);
    }
  }

  // 2) primary suffix
  let v = findBySuffix(row, suffix);

  // 3) alt suffixes commonly seen in data
  if (v === undefined) {
    if (suffix === "_refractive_errors") {
      v = findBySuffix(row, "_refractive_error") ?? findBySuffix(row, "_refraction");
    } else if (suffix === "_spectacles_prescribed") {
      v = findBySuffix(row, "_spectacle_prescribed") ?? findBySuffix(row, "_spectacles");
    }
  }

  return num(v);
}

/* -------- Rebuild VC rows from answers when no array is present ----------- */
function buildVcRowsFromAnswers(answers = {}, max = 25) {
  const out = [];
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  for (let i = 1; i <= max; i++) {
    const name = (answers[`vc_${i}_name`] ?? "").toString().trim();
    const examined = n(answers[`vc_${i}_examined`]);
    const cataract = n(answers[`vc_${i}_cataract`]);
    const other = n(answers[`vc_${i}_other_diseases`]);
    const refr = n(answers[`vc_${i}_refractive_errors`]);
    const specs = n(answers[`vc_${i}_spectacles_prescribed`]);
    if (name || examined || cataract || other || refr || specs) {
      out.push({
        [`vc_${i}_name`]: name,
        [`vc_${i}_examined`]: examined,
        [`vc_${i}_cataract`]: cataract,
        [`vc_${i}_other_diseases`]: other,
        [`vc_${i}_refractive_errors`]: refr,
        [`vc_${i}_spectacles_prescribed`]: specs,
      });
    }
  }
  return out;
}

/* ========================================================================== */

export default function ViewDistrictTables({ user, month, year }) {
  const district = user?.district || "";

  // locate sections
  const eyeBankSection = useMemo(
    () => sections.find((s) => s?.title?.toLowerCase().includes("eye bank")),
    []
  );
  const visionCenterSection = useMemo(
    () =>
      sections.find((s) => {
        const t = (s?.title || "").toLowerCase();
        return t.includes("vision center") || t.includes("vision centre");
      }),
    []
  );

  // numeric keys by row for eyebank totals
  const ebRowKeys = useMemo(() => extractRowKeyMatrix(eyeBankSection), [eyeBankSection]);

  // outputs
  const [ebTotals, setEbTotals] = useState(() =>
    fixedLengthArray((eyeBankSection?.rows || []).length)
  );
  const [vcRows, setVcRows] = useState([]); // every VALID VC row across all institutions

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
        // Accept both array responses and {docs: []}
        return Array.isArray(j) ? j : Array.isArray(j?.docs) ? j.docs : [];
      } catch {
        return [];
      }
    };

    // build the keyset for VC row i (0-based) using questions.js, fallback to vc_* keys
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

    (async () => {
      setLoading(true);
      setErrText("");
      try {
        const filteredURL =
          `${API_BASE}/api/reports?district=${encodeURIComponent(district)}` +
          `&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;

        let list = await fetchList(filteredURL);
        if (!list.length) list = await fetchList(`${API_BASE}/api/reports`);

        const filtered = list.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(district).trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() ===
              String(month).trim().toLowerCase() &&
            String(d?.year || "") === String(year)
        );

        // No per-id hydrate: use the filtered array as-is (avoids 404)
        const hydrated = filtered;
        if (cancelled) return;

        /* --------------------------- Eye Bank: TOTALS --------------------------- */
        const ebOut = fixedLengthArray((eyeBankSection?.rows || []).length);
        hydrated.forEach((rep) => {
          const eb = rep?.eyeBank || rep?.eyebank || rep?.eye_bank || [];
          for (let i = 0; i < ebOut.length; i++) {
            const srcRow = eb[i];
            if (!srcRow) continue;
            addRowInto(ebOut[i], srcRow, ebRowKeys[i]);
          }
        });

        /* -------------------- Vision Center: normalize rows -------------------- */
        const vcOut = [];
        hydrated.forEach((rep) => {
          const instName = String(rep?.institution || "").trim();

          // tolerate both spellings and shapes
          let vc =
            rep?.visionCenter ||
            rep?.visionCentre ||
            rep?.vision_centre ||
            rep?.visioncentre ||
            [];

          // Fallback: some prod saves VC inside `answers` with vc_* keys
          if (!Array.isArray(vc) || !vc.length) {
            vc = buildVcRowsFromAnswers(rep?.answers || {}, 25);
          }
          if (!Array.isArray(vc) || !vc.length) return;

          vc.forEach((row, i) => {
            const r = row || {};
            const ks = vcKeyset(i);

            // name needs suffix fallback to hit vc_#_name
            const name = String(
              r?.[ks.nameKey] ?? r?.name ?? findBySuffix(r, "_name") ?? ""
            ).trim();

            // numbers: prefer cfg keys; fallback to suffix/alt-suffix
            const examined = num(r?.[ks.examinedKey] ?? findBySuffix(r, "_examined"));
            const cataract = num(r?.[ks.cataractKey] ?? findBySuffix(r, "_cataract"));
            const other = num(r?.[ks.otherDiseasesKey] ?? findBySuffix(r, "_other_diseases"));
            const refr = num(
              r?.[ks.refractiveErrorsKey] ??
                findBySuffix(r, "_refractive_errors") ??
                findBySuffix(r, "_refractive_error") ??
                findBySuffix(r, "_refraction")
            );
            const specs = num(
              r?.[ks.spectaclesPrescribedKey] ??
                findBySuffix(r, "_spectacles_prescribed") ??
                findBySuffix(r, "_spectacle_prescribed") ??
                findBySuffix(r, "_spectacles")
            );

            // keep only real rows
            if (!name && !examined && !cataract && !other && !refr && !specs) return;

            // normalize so renderer (getMetric by suffix) shows values reliably
            const normalized = {
              name,
              norm_examined: examined,
              norm_cataract: cataract,
              norm_other_diseases: other,
              norm_refractive_errors: refr,
              norm_spectacles_prescribed: specs,
            };

            vcOut.push({
              __institution: instName || "Unknown Institution",
              __data: normalized,
            });
          });
        });

        // sort by Institution then VC name
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
  }, [district, month, year, eyeBankSection, visionCenterSection]);

  /* ------------------------------ RENDER VC LIST ----------------------------- */
  const renderDistrictVisionCenterTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1 text-left w-14">SL. NO</th>
              <th className="border px-2 py-1 text-left">Institution</th>
              <th className="border px-2 py-1 text-left">Name of Vision Centre</th>
              {VC_SUFFIXES
                .slice()
                .sort((a, b) => metricRank(a[0]) - metricRank(b[0]))
                .map(([suf]) => (
                  <th key={suf} className="border px-2 py-1 text-center">
                    {prettyMetric(suf)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {vcRows.map((row, idx) => {
              const data = row.__data || {};
              return (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{row.__institution || ""}</td>
                  <td className="border px-2 py-1">{String(data.name || "")}</td>
                  {VC_SUFFIXES
                    .slice()
                    .sort((a, b) => metricRank(a[0]) - metricRank(b[0]))
                    .map(([suf, legacy]) => (
                      <td key={suf} className="border px-2 py-1 text-right">
                        {getMetric(data, suf, legacy)}
                      </td>
                    ))}
                </tr>
              );
            })}
            {!vcRows.length && (
              <tr>
                <td
                  className="border px-2 py-3 text-center text-gray-500"
                  colSpan={3 + VC_SUFFIXES.length}
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
        <div className="text-center text-sm text-gray-600">Loading district tables…</div>
      )}
      {errText && <div className="text-center text-sm text-red-600">{errText}</div>}

      {/* Eye Bank: district total */}
      <section>
        <h3 className="text-base font-semibold mb-2">III. EYE BANK — District Total</h3>
        <EyeBankTable data={ebTotals} disabled cumulative />
      </section>

      {/* Vision Center: each real centre row */}
      <section>
        <h3 className="text-base font-semibold mb-2">V. VISION CENTER — District Total</h3>
        {renderDistrictVisionCenterTable()}
      </section>
    </div>
  );
}
