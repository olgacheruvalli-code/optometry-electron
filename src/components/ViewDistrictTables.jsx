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
function parseAnyNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  const m = s.match(/-?\d+/);
  return m ? Number(m[0]) : 0;
}

function addRowInto(targetRow, sourceRow, numericOnlyKeys = null) {
  if (!sourceRow || typeof sourceRow !== "object") return;
  for (const [k, v] of Object.entries(sourceRow)) {
    if (Array.isArray(numericOnlyKeys) && numericOnlyKeys.length && !numericOnlyKeys.includes(k))
      continue;
    const n = parseAnyNum(v);
    if (Number.isFinite(n)) targetRow[k] = parseAnyNum(targetRow[k]) + n;
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

/* value pickers */
const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const pickStr = (...vals) => {
  for (const v of vals) if (isNonEmpty(v)) return String(v).trim();
  return "";
};
const pickNumLoose = (...vals) => {
  for (const v of vals) {
    const n = parseAnyNum(v);
    if (n !== 0 || (typeof v !== "undefined" && v !== null && String(v).trim() !== ""))
      return n;
  }
  return 0;
};

const normKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const isNameKeyNK = (nk) =>
  (/vision/.test(nk) && /(centre|center)/.test(nk) && /(name|title)/.test(nk)) ||
  /^vc \d+ (name|vc ?name|vision ?centre|vision ?center|centre name|center name)$/.test(nk);

const isExaminedNK = (nk) =>
  /(patient|people|person|persons|cases|\bpt\b)/.test(nk) &&
  /(examined|seen|checked|screened|opd|visited|attended)/.test(nk);
const isRefractiveNK = (nk) =>
  /(refract|refraction|refractive error|rx|rx error|retinoscopy|ref error|refraction done|refraction cases)/.test(
    nk
  );
const isOtherEyeNK = (nk) =>
  /(other)/.test(nk) && /(eye|eyes|ocular)?/.test(nk) && /(dise|disease|diseases|cases)/.test(nk);
const isSpectaclesNK = (nk) => /spectacle/.test(nk);

function scanLoose(obj = {}, predNK, wantString = false) {
  let best = wantString ? "" : 0;
  for (const [k, v] of Object.entries(obj)) {
    const nk = normKey(k);
    if (!nk) continue;
    if (predNK(nk)) {
      if (wantString) {
        if (!best && isNonEmpty(v)) best = String(v).trim();
      } else {
        const n = parseAnyNum(v);
        if (!best && n) best = n;
        else if (!best) best = n;
      }
    }
  }
  return best;
}

/* ---------- array-like VC rows detection & conversion ---------- */
const isArrayLikeRow = (row) =>
  Array.isArray(row) ||
  (row && typeof row === "object" && Object.keys(row).length > 0 && Object.keys(row).every((k) => /^\d+$/.test(k)));

const toArrayFromArrayLike = (row) => {
  if (Array.isArray(row)) return row.slice();
  const entries = Object.entries(row)
    .filter(([k]) => /^\d+$/.test(k))
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  return entries.map(([, v]) => v);
};

/* ----------------- render-time resolvers ------------------------------- */

// Strong name resolver (covers many aliases)
const getNameFromRow = (rowObj) => {
  const raw = rowObj?.__raw || {};
  const data = rowObj?.__data || {};
  const idx = rowObj?.__idx;

  if (isNonEmpty(data.name)) return String(data.name).trim();

  const direct = pickStr(
    raw[`vc_${idx}_name`],
    raw[`vc${idx}_name`],
    raw[`VC_${idx}_name`],
    raw[`VC${idx}_name`],
    raw[`vc_${idx}_vcName`],
    raw[`vc${idx}_vcName`],
    raw[`vc_${idx}_centerName`],
    raw[`vc${idx}_centerName`],
    raw[`vc_${idx}_centreName`],
    raw[`vc${idx}_centreName`],
    raw[`vc_${idx}_visionCenter`],
    raw[`vc${idx}_visionCenter`],
    raw[`vc_${idx}_visionCentre`],
    raw[`vc${idx}_visionCentre`],
    raw[`vc_${idx}_vision_center_name`],
    raw[`vc${idx}_vision_center_name`],
    raw[`vc_${idx}_nameOfVisionCentre`],
    raw[`vc_${idx}_nameOfVisionCenter`]
  );
  if (direct) return direct;

  const any = pickStr(
    raw["Name of Vision Centre"],
    raw["Name of Vision Center"],
    raw["Vision Centre Name"],
    raw["Vision Center Name"],
    raw["visionCenter"],
    raw["vision_centre"]
  );
  if (any) return any;

  const loose = scanLoose(raw, isNameKeyNK, true);
  if (loose) return loose;

  // ultra-safe fallback: first short string field
  for (const v of Object.values(raw)) {
    if (typeof v === "string" && v.trim() && v.trim().length <= 40) return v.trim();
  }
  return "";
};

const getMetricFromRow = (rowObj, which /* "refractive" | "spectacles" */) => {
  const raw = rowObj?.__raw || {};
  const data = rowObj?.__data || {};
  const idx = rowObj?.__idx;

  const tryKeys = (obj, keys) => {
    for (const k of keys) {
      const n = parseAnyNum(obj[k]);
      if (n) return n;
    }
    return 0;
  };

  if (which === "refractive") {
    const v =
      tryKeys(raw, [
        `vc_${idx}_refractive_errors`,
        `vc${idx}_refractive_errors`,
        `vc_${idx}_refractive_error`,
        `vc${idx}_refractive_error`,
        `vc_${idx}_refraction`,
        `vc${idx}_refraction`,
        `vc_${idx}_refraction_done`,
        `vc${idx}_refraction_done`,
        `vc_${idx}_refraction_cases`,
        `vc${idx}_refraction_cases`,
      ]) ||
      tryKeys(raw, [
        "refractive_errors",
        "refractive_error",
        "refraction",
        "refraction_done",
        "refraction_cases",
        "No of Refractive errors",
        "no of refractive errors",
        "Refraction done",
        "Refraction cases",
      ]) ||
      scanLoose(raw, isRefractiveNK) ||
      parseAnyNum(data.refractive_errors);
    return v || 0;
  }

  if (which === "spectacles") {
    const v =
      tryKeys(raw, [
        `vc_${idx}_spectacles_prescribed`,
        `vc${idx}_spectacles_prescribed`,
        `vc_${idx}_spectacles`,
        `vc${idx}_spectacles`,
      ]) ||
      tryKeys(raw, [
        "spectacles_prescribed",
        "spectacle_prescribed",
        "spectacles",
        "No of Spectacles Prescribed",
        "no of spectacles prescribed",
      ]) ||
      scanLoose(raw, isSpectaclesNK) ||
      parseAnyNum(data.spectacles_prescribed);
    return v || 0;
  }

  return 0;
};

/* ----------------------- Strict zero defaults ----------------------- */

const ZERO_EYE_BANK = [
  {
    status: "Eye Bank",
    eyesCollected: 0,
    utilizedForKeratoplasty: 0,
    usedForResearch: 0,
    distributedToOtherInst: 0,
    pledgeForms: 0,
  },
  {
    status: "Eye Collection Centre",
    eyesCollected: 0,
    utilizedForKeratoplasty: 0,
    usedForResearch: 0,
    distributedToOtherInst: 0,
    pledgeForms: 0,
  },
];

const ZERO_VC_ROWS = [
  {
    __institution: "",
    __raw: { vc_1_name: "" },
    __idx: 1,
    __data: {
      name: "",
      examined: 0,
      cataract: 0,
      other_diseases: 0,
      refractive_errors: 0,
      spectacles_prescribed: 0,
    },
  },
];

/* -------------------------- Excel Exporter -------------------------- */
/** Export the first <table> inside container as .xlsx with a heading row */
async function exportDivTableWithHeading(containerId, filename, sheetName, headingText) {
  const el = document.getElementById(containerId);
  if (!el) return alert("Table container not found: " + containerId);
  const table = el.querySelector("table") || el;

  // Clone and inject a heading row that spans the full width
  const clone = table.cloneNode(true);
  const colCount = clone.tHead
    ? clone.tHead.rows[0].cells.length
    : clone.rows[0]
    ? clone.rows[0].cells.length
    : 8;

  const th = document.createElement("th");
  th.colSpan = colCount;
  th.textContent = headingText;
  th.style.textAlign = "left";
  th.style.fontWeight = "bold";
  th.style.padding = "6px";

  let thead = clone.tHead;
  if (!thead) {
    thead = document.createElement("thead");
    clone.insertBefore(thead, clone.firstChild);
  }
  const headingRow = document.createElement("tr");
  headingRow.appendChild(th);
  thead.insertBefore(headingRow, thead.firstChild || null);

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.table_to_book(clone, { sheet: sheetName });
  const ws = wb.Sheets[sheetName];
  if (ws) ws["!freeze"] = { xSplit: 1, ySplit: 2 }; // keep heading + header visible
  XLSX.writeFile(wb, filename);
}

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

    // choose the more plausible interpretation: normal [other,refractive] vs swapped
    const chooseBestOtherRefrac = (o, r, altO, altR) => {
      const scoreA = (o ? 1 : 0) + (r ? 1 : 0);
      const scoreB = (altO ? 1 : 0) + (altR ? 1 : 0);
      return scoreB > scoreA ? { other: altO, refractive: altR } : { other: o, refractive: r };
    };

    // map a VC row to canonical fields (handles objects, array-like, or rebuilt)
    const mapRowToCanonical = (row, i) => {
      const idx = i + 1;

      // ---------- ARRAY-LIKE branch ----------
      if (isArrayLikeRow(row)) {
        const arr = toArrayFromArrayLike(row).map(parseAnyNum);

        // Normal order: [examined, cataract, other, refractive, spectacles]
        // Some months might swap [other,refractive]; decide automatically.
        const examined = arr[0] ?? 0;
        const cataract = arr[1] ?? 0;

        const normalOther = arr[2] ?? 0;
        const normalRefr  = arr[3] ?? 0;
        const swappedOther = arr[3] ?? 0;
        const swappedRefr  = arr[2] ?? 0;

        const chosen = chooseBestOtherRefrac(normalOther, normalRefr, swappedOther, swappedRefr);
        const spectacles = arr[4] ?? 0;

        return {
          name: "",
          examined,
          cataract,
          other_diseases: chosen.other,
          refractive_errors: chosen.refractive,
          spectacles_prescribed: spectacles,
          __raw: row,
          __idx: idx,
        };
      }

      // ---------- OBJECT branch ----------
      const r = row || {};
      const ks = vcKeyset(i);

      const name = pickStr(
        r[ks.nameKey],
        r[`vc_${idx}_name`],
        r[`vc${idx}_name`],
        r[`VC_${idx}_name`],
        r[`VC${idx}_name`],
        r[`vc_${idx}_vcName`],
        r[`vc${idx}_vcName`],
        r[`vc_${idx}_centerName`],
        r[`vc${idx}_centerName`],
        r[`vc_${idx}_centreName`],
        r[`vc${idx}_centreName`],
        r[`vc_${idx}_visionCenter`],
        r[`vc${idx}_visionCenter`],
        r[`vc_${idx}_visionCentre`],
        r[`vc${idx}_visionCentre`],
        r[`vc_${idx}_vision_center_name`],
        r[`vc${idx}_vision_center_name`],
        r[`vc_${idx}_nameOfVisionCentre`],
        r[`vc_${idx}_nameOfVisionCenter`],
        r["Name of Vision Centre"],
        r["Name of Vision Center"],
        r["Vision Centre Name"],
        r["Vision Center Name"],
        r["visionCenter"],
        r["vision_centre"]
      );

      const examined = pickNumLoose(
        r[ks.examinedKey],
        r[`vc_${idx}_examined`],
        r[`vc${idx}_examined`],
        r[`vc_${idx}_patients_examined`],
        r[`vc${idx}_patients_examined`],
        r[`vc_${idx}_patientsExamined`],
        r[`vc${idx}_patientsExamined`],
        r[`vc${idx}_examinedCases`],
        r[`vc${idx}_examined_today`],
        r.examined,
        r.patients_examined,
        r.patientsExamined,
        r["No of patients examined"],
        r["no of patients examined"],
        r["patients examined"],
        r["people examined"],
        r["persons examined"],
        r["OPD seen"],
        r["OPD attended"],
        scanLoose(r, isExaminedNK)
      );

      const cataract = pickNumLoose(
        r[ks.cataractKey],
        r[`vc_${idx}_cataract`],
        r[`vc${idx}_cataract`],
        r.cataract,
        r.cataractDetected,
        r.cataract_cases,
        r["No of Cataract cases detected"],
        r["no of cataract cases detected"]
      );

      const other_diseases_candidate = pickNumLoose(
        r[ks.otherDiseasesKey],
        r[`vc_${idx}_other_diseases`],
        r[`vc${idx}_other_diseases`],
        r.other_diseases,
        r.otherDiseases,
        r.otherEyeDiseases,
        r.otherEye,
        r.other_eye,
        r.other_eyes,
        r.other_disease_cases,
        r["No of other eye diseases"],
        r["no of other eye diseases"],
        r["Other Eye Diseases"],
        scanLoose(r, isOtherEyeNK)
      );

      const refractive_errors_candidate = pickNumLoose(
        r[ks.refractiveErrorsKey],
        r[`vc_${idx}_refractive_errors`],
        r[`vc${idx}_refractive_errors`],
        r[`vc_${idx}_refractive_error`],
        r[`vc${idx}_refractive_error`],
        r[`vc_${idx}_refraction`],
        r[`vc${idx}_refraction`],
        r[`vc_${idx}_refraction_done`],
        r[`vc${idx}_refraction_done`],
        r[`vc_${idx}_refraction_cases`],
        r[`vc${idx}_refraction_cases`],
        r.refractive_errors,
        r.refractive_error,
        r.refraction,
        r.refraction_done,
        r.refraction_cases,
        r["No of Refractive errors"],
        r["no of refractive errors"],
        r["Refraction done"],
        r["Refraction cases"],
        scanLoose(r, isRefractiveNK)
      );

      // safeguard: if one of them is suspiciously always zero while the other has value,
      // try swapping and pick the variant with more non-zero fields.
      const picked = ((o, rf) => {
        const altO = rf, altR = o;
        const scoreA = (o ? 1 : 0) + (rf ? 1 : 0);
        const scoreB = (altO ? 1 : 0) + (altR ? 1 : 0);
        return scoreB > scoreA ? { o: altO, r: altR } : { o, r: rf };
      })(other_diseases_candidate, refractive_errors_candidate);

      const spectacles_prescribed = pickNumLoose(
        r[ks.spectaclesPrescribedKey],
        r[`vc_${idx}_spectacles_prescribed`],
        r[`vc${idx}_spectacles_prescribed`],
        r.spectacles_prescribed,
        r.spectacle_prescribed,
        r.spectacles,
        r["No of Spectacles Prescribed"],
        r["no of spectacles prescribed"]
      );

      return {
        name,
        examined,
        cataract,
        other_diseases: picked.o,
        refractive_errors: picked.r,
        spectacles_prescribed,
        __raw: row,
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

        const list = await fetchList(`${API_BASE}/api/reports?${q}`);

        if (!Array.isArray(list) || !list.length) {
          setEbTotals(ZERO_EYE_BANK);
          setVcRows(ZERO_VC_ROWS);
          return;
        }

        const source = list.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(district).trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() ===
              String(month).trim().toLowerCase() &&
            String(d?.year || "") === String(year)
        );

        if (!source.length) {
          setEbTotals(ZERO_EYE_BANK);
          setVcRows(ZERO_VC_ROWS);
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

          const rowsAreArrayLike =
            Array.isArray(vc) && vc.length && (Array.isArray(vc[0]) || isArrayLikeRow(vc[0]));
          if (!Array.isArray(vc) || !vc.length || rowsAreArrayLike) {
            const a = rep?.answers || {};
            const rebuilt = [];
            for (let j = 1; j <= 25; j++) {
              const name =
                a[`vc_${j}_name`] ??
                a[`vc${j}_name`] ??
                a[`VC_${j}_name`] ??
                a[`VC${j}_name`] ??
                a[`vc_${j}_vcName`] ??
                a[`vc${j}_vcName`] ??
                a[`vc_${j}_centerName`] ??
                a[`vc${j}_centerName`] ??
                a[`vc_${j}_centreName`] ??
                a[`vc${j}_centreName`] ??
                a[`vc_${j}_visionCenter`] ??
                a[`vc${j}_visionCenter`] ??
                a[`vc_${j}_visionCentre`] ??
                a[`vc${j}_visionCentre`] ??
                a[`vc_${j}_vision_center_name`] ??
                a[`vc${j}_vision_center_name`] ??
                a[`vc_${j}_nameOfVisionCentre`] ??
                a[`vc_${j}_nameOfVisionCenter`] ??
                "";

              const examined =
                a[`vc_${j}_examined`] ??
                a[`vc${j}_examined`] ??
                a[`vc_${j}_patients_examined`] ??
                a[`vc${j}_patients_examined`] ??
                a[`vc_${j}_patientsExamined`] ??
                a[`vc${j}_patientsExamined`] ??
                a[`vc${j}_examinedCases`] ??
                a[`vc${j}_examined_today`] ??
                0;

              const cataract = a[`vc_${j}_cataract`] ?? a[`vc${j}_cataract`] ?? 0;

              const other =
                a[`vc_${j}_other_diseases`] ??
                a[`vc${j}_other_diseases`] ??
                a[`vc_${j}_otherEyeDiseases`] ??
                a[`vc${j}_otherEyeDiseases`] ??
                a[`vc_${j}_otherEye`] ??
                a[`vc${j}_otherEye`] ??
                0;

              const refractive =
                a[`vc_${j}_refractive_errors`] ??
                a[`vc${j}_refractive_errors`] ??
                a[`vc_${j}_refractive_error`] ??
                a[`vc${j}_refractive_error`] ??
                a[`vc_${j}_refraction`] ??
                a[`vc${j}_refraction`] ??
                a[`vc_${j}_refraction_done`] ??
                a[`vc${j}_refraction_done`] ??
                a[`vc_${j}_refraction_cases`] ??
                a[`vc${j}_refraction_cases`] ??
                0;

              const spectacles =
                a[`vc_${j}_spectacles_prescribed`] ??
                a[`vc${j}_spectacles_prescribed`] ??
                a[`vc_${j}_spectacles`] ??
                a[`vc${j}_spectacles`] ??
                0;

              const rowObj = {
                [`vc_${j}_name`]: name,
                [`vc_${j}_examined`]: parseAnyNum(examined),
                [`vc_${j}_cataract`]: parseAnyNum(cataract),
                [`vc_${j}_other_diseases`]: parseAnyNum(other),
                [`vc_${j}_refractive_errors`]: parseAnyNum(refractive),
                [`vc_${j}_spectacles_prescribed`]: parseAnyNum(spectacles),
              };

              const anyNum = Object.values(rowObj).some(
                (v) => typeof v === "number" && v !== 0
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
              VC_METRIC_KEYS.some((k) => parseAnyNum(canon[k]) !== 0);
            if (hasAny) {
              vcOut.push({
                __institution: instName || "Unknown Institution",
                __data: canon,
                __raw: row,
                __idx: canon.__idx,
              });
            }
          });
        });

        if (!vcOut.length) {
          setVcRows(ZERO_VC_ROWS);
        } else {
          vcOut.sort((a, b) => {
            const ai = (a.__institution || "").toLowerCase();
            const bi = (b.__institution || "").toLowerCase();
            if (ai < bi) return -1;
            if (ai > bi) return 1;
            const an = String(getNameFromRow(a) || "").toLowerCase();
            const bn = String(getNameFromRow(b) || "").toLowerCase();
            return an.localeCompare(bn, undefined, { numeric: true });
          });
          setVcRows(vcOut);
        }

        setEbTotals(ebOut.some((r) => Object.keys(r).length) ? ebOut : ZERO_EYE_BANK);
      } catch (e) {
        console.error("District tables fetch failed:", e);
        setErrText("Failed to load district tables. See console for details.");
        setEbTotals(ZERO_EYE_BANK);
        setVcRows(ZERO_VC_ROWS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [district, month, year, eyeBankSection, visionCenterSection]);

  /* ------------------------------ renderers ------------------------------ */
  const renderDistrictVisionCenterTable = () => {
    return (
      <div id="vcDistrictWrap" className="overflow-x-auto">
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
              const name = getNameFromRow(row);
              const examined = parseAnyNum(d.examined) || 0;
              const cataract = parseAnyNum(d.cataract) || 0;
              const other = parseAnyNum(d.other_diseases) || 0;
              const refractive = parseAnyNum(d.refractive_errors) || 0;
              const spectacles = parseAnyNum(d.spectacles_prescribed) || 0;

              return (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{row.__institution || ""}</td>
                  <td className="border px-2 py-1">{name}</td>
                  <td className="border px-2 py-1 text-right">{examined}</td>
                  <td className="border px-2 py-1 text-right">{cataract}</td>
                  <td className="border px-2 py-1 text-right">{other}</td>
                  <td className="border px-2 py-1 text-right">{refractive}</td>
                  <td className="border px-2 py-1 text-right">{spectacles}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const heading = `District Tables — ${district} (${month} ${year})`;

  return (
    <div className="space-y-10">
      <div className="text-center text-lg font-bold">{heading}</div>

      {loading && <div className="text-center text-sm text-gray-600">Loading district tables…</div>}
      {errText && <div className="text-center text-sm text-red-600">{errText}</div>}

      {/* Eye Bank */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">III. EYE BANK — District Total</h3>
          <button
            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() =>
              exportDivTableWithHeading(
                "ebDistrictWrap",
                `EyeBank_${district}_${month || ""}-${year || ""}.xlsx`,
                "Eye Bank",
                heading
              )
            }
          >
            Download as Excel
          </button>
        </div>
        <div id="ebDistrictWrap">
          <EyeBankTable data={ebTotals} disabled cumulative />
        </div>
      </section>

      {/* Vision Center */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">V. VISION CENTER — District Total</h3>
          <button
            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() =>
              exportDivTableWithHeading(
                "vcDistrictWrap",
                `VisionCenter_${district}_${month || ""}-${year || ""}.xlsx`,
                "Vision Center",
                heading
              )
            }
          >
            Download as Excel
          </button>
        </div>
        {renderDistrictVisionCenterTable()}
      </section>
    </div>
  );
}
