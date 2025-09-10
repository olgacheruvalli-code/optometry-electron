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
    if (n || n === 0) targetRow[k] = (num(targetRow[k]) + n);
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

/* Find the actual VC name field present in data rows */
function findNameKeyInData(rows) {
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) {
      if (/(name|centre|center)/i.test(k)) return k;
    }
  }
  return "name";
}

/* -------- NEW: suffix-based metric lookup that works for vc_1_, vc_2_, … --- */

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

// get numeric metric by trying legacy names first, then suffix
function getMetric(row, suffix, legacy = []) {
  for (const key of legacy) {
    if (row[key] !== undefined) return num(row[key]);
  }
  const v = findBySuffix(row, suffix);
  return num(v);
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
    () => sections.find((s) => s?.title?.toLowerCase().includes("vision center")),
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
        return Array.isArray(j?.docs) ? j.docs : Array.isArray(j) ? j : [];
      } catch {
        return [];
      }
    };
    const hydrate = async (doc) => {
      const id = doc?._id || doc?.id;
      if (!id) return doc;
      try {
        const r = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
        if (!r.ok) return doc;
        const j = await r.json().catch(() => ({}));
        return j?.doc || j || doc;
      } catch {
        return doc;
      }
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

        const hydrated = await Promise.all(filtered.map(hydrate));
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

        /* --------------- Vision Center: LIST ONLY FILLED ROWS ------------------- */
        const vcOut = [];
        hydrated.forEach((rep) => {
          const instName = String(rep?.institution || "").trim();
          const vc = rep?.visionCenter || rep?.visioncentre || rep?.vision_centre || [];
          if (!Array.isArray(vc) || !vc.length) return;

          const nameKey = findNameKeyInData(vc);

          vc.forEach((row) => {
            const r = row || {};
            const vcName = String(r[nameKey] || "").trim();

            // detect if any metric is present (>0) using suffix/legacy mapping
            const hasAnyMetric = VC_SUFFIXES.some(([suf, legacy]) => getMetric(r, suf, legacy) > 0);

            // Include only real rows (has a name OR any metric > 0)
            if (!vcName && !hasAnyMetric) return;

            vcOut.push({
              __institution: instName || "Unknown Institution",
              __vcNameKey: nameKey,
              __data: r,
            });
          });
        });

        // sort by Institution then VC name
        vcOut.sort((a, b) => {
          const ai = (a.__institution || "").toLowerCase();
          const bi = (b.__institution || "").toLowerCase();
          if (ai < bi) return -1;
          if (ai > bi) return 1;
          const ak = a.__vcNameKey || "name";
          const bk = b.__vcNameKey || "name";
          const an = String(a.__data?.[ak] || "").toLowerCase();
          const bn = String(b.__data?.[bk] || "").toLowerCase();
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
                .slice() // keep preferred order
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
              const nameKey = row.__vcNameKey || "name";
              const data = row.__data || {};
              return (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{row.__institution || ""}</td>
                  <td className="border px-2 py-1">{String(data[nameKey] || "")}</td>
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
                <td className="border px-2 py-3 text-center text-gray-500" colSpan={3 + VC_SUFFIXES.length}>
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

      {/* Eye Bank: district total (unchanged) */}
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
