

// src/App.jsx
import React, {
  useEffect,
  useLayoutEffect, // ok even if unused in this file
  useMemo,
  useRef,          // ok even if unused in this file
  useState,
} from "react";
import API_BASE from "./apiBase";
import sections from "./data/questions";
import { districtInstitutions } from "./data/districtInstitutions";
import "./index.css";
import MonthYearSelector from "./components/MonthYearSelector";
import EyeBankTable from "./components/EyeBankTable";
import VisionCenterTable from "./components/VisionCenterTable";
import QuestionInput from "./components/QuestionInput";
import Login from "./components/Login";
import MenuBar from "./components/MenuBar";
import ReportsList from "./components/ReportsList";
import ViewInstitutionWiseReport from "./components/ViewInstitutionWiseReport";
import ViewDistrictTables from "./components/ViewDistrictTables";
import EditReport from "./components/EditReport";
import Register from "./components/Register";
import { startFlute, stopFlute } from "./utils/sound";
import EditGate from "./components/EditGate";
import SearchReports from "./components/SearchReports";
import TestVisionCenter from "./components/TestVisionCenter";

/* ----------------------------- Month constants ---------------------------- */
const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Return an array of question defs from a block that might use `questions` or `rows`. */
const getQs = (blk) =>
  Array.isArray(blk?.questions)
    ? blk.questions
    : Array.isArray(blk?.rows)
    ? blk.rows
    : [];

/** Build flat rows in display order (headers, subheaders, q-rows, and table markers). */
function buildFlatRows(secs) {
  const out = [];
  for (const sec of secs || []) {
    const titleStr = String(sec?.title ?? "");
    if (titleStr) out.push({ kind: "header", label: titleStr });

    // top-level questions (support both `questions` and `rows`)
    for (const q of getQs(sec)) out.push({ kind: "q", row: q });

    // subsections (each with its own questions/rows)
    if (Array.isArray(sec?.subsections)) {
      for (const sub of sec.subsections) {
        const subTitle = String(sub?.title ?? "");
        if (subTitle) out.push({ kind: "subheader", label: subTitle });
        for (const q of getQs(sub)) out.push({ kind: "q", row: q });
      }
    }

    // special tables (match both "center" and "centre")
    if (sec?.table) {
      if (/eye\s*bank/i.test(titleStr)) out.push({ kind: "eyeBankTable" });
      if (/vision\s*cent(e|)r(e|)/i.test(titleStr)) out.push({ kind: "visionCenterTable" });
    }
  }
  return out;
}

/** Only the question rows (in the same display order). */
function orderedQuestions(secs) {
  return buildFlatRows(secs).filter((r) => r.kind === "q").map((r) => r.row);
}

const KEYS = Array.from({ length: 84 }, (_, i) => `q${i + 1}`);
const Q_ROWS = orderedQuestions(sections);

/** Create an object with q1..q84 = 0 */
const makeEmptyAnswers = () => KEYS.reduce((a, k) => ((a[k] = 0), a), {});

/** Ensure an object has numeric q1..q84 entries (missing -> 0, non-numeric -> 0). */
const fill84 = (obj) => {
  const base = { ...(obj || {}) };
  for (const k of KEYS) {
    const v = base[k];
    base[k] = typeof v === "number" ? (Number.isFinite(v) ? v : 0) : Number(v ?? 0) || 0;
  }
  return base;
};

/** Normalize month names (case/abbr tolerant). */
const normMonth = (m) => {
  if (!m) return m;
  const s = String(m).trim().toLowerCase();
  const map = {
    january: "January", jan: "January",
    february: "February", feb: "February",
    march: "March", mar: "March",
    april: "April", apr: "April",
    may: "May",
    june: "June", jun: "June",
    july: "July", jul: "July",
    august: "August", aug: "August",
    september: "September", sep: "September", sept: "September",
    october: "October", oct: "October",
    november: "November", nov: "November",
    december: "December", dec: "December",
  };
  return map[s] || m;
};

/** Build ONLY non-zero q# keys (q1..qN), respecting the *display order* in `secs`. */
function buildAnswersPartial(answers, secs) {
  const qs = orderedQuestions(secs);
  const out = {};
  for (let i = 0; i < qs.length; i++) {
    const id = qs[i]?.id;
    if (!id) continue;
    const raw = answers[id];
    let v = 0;
    if (raw && typeof raw === "object") {
      v = Object.values(raw).reduce((s, x) => s + (Number(x) || 0), 0);
    } else {
      v = Number(raw || 0);
    }
    if (v > 0) out[`q${i + 1}`] = String(v); // keep as string to match earlier cURL behavior
  }
  return out;
}

/** Convert table rows: keep names as strings; numeric-looking cells -> numbers; null/undefined -> "" */
const sanitizeTableArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((row) => {
        const out = {};
        for (const [k, v] of Object.entries(row || {})) {
          if (v === null || v === undefined) {
            out[k] = "";
            continue;
          }
          if (typeof v === "number") {
            out[k] = Number.isFinite(v) ? v : 0;
            continue;
          }
          const s = String(v).trim();
          out[k] = /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
        }
        return out;
      })
    : [];

/** Do we have any numeric (>0) value in any row? */
const someRowHasValues = (arr) =>
  Array.isArray(arr) &&
  arr.some((row) =>
    Object.values(row || {}).some((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    })
  );

/** Replace accidental numeric zeros in text fields like "Name" with empty strings (for old records). */
const normalizeTextNameFields = (rows) =>
  Array.isArray(rows)
    ? rows.map((row) => {
        const out = { ...(row || {}) };
        for (const k of Object.keys(out)) {
          if (/name|centre|center/i.test(k) && (out[k] === 0 || out[k] === "0")) {
            out[k] = "";
          }
        }
        return out;
      })
    : [];

/* ========================================================================== */
/* ViewReports — Individual view (fixed fiscal YTD Apr→selected, no reset)    */
/* ========================================================================== */
function ViewReports({ reportData, month, year }) {
  const { useState, useEffect, useMemo } = React;

  const [doc, setDoc] = useState(reportData);
  const [hydrating, setHydrating] = useState(false);
  const [cumTotals, setCumTotals] = useState({});
  const flatRows = useMemo(() => buildFlatRows(sections), []);

  // ---------- helpers ----------
  const norm = (s) => String(s || "").trim().toLowerCase();
  const eq = (a, b) => norm(a) === norm(b);

  const CAL_MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const calIndex = useMemo(
    () => Object.fromEntries(CAL_MONTHS.map((m, i) => [m.toLowerCase(), i])),
    []
  );
  const normMonth = (m) => {
    if (m == null) return "";
    const s = String(m).trim();
    if (!s) return "";
    if (/^\d{1,2}$/.test(s)) {
      const n = Math.max(1, Math.min(12, parseInt(s, 10)));
      return CAL_MONTHS[n - 1];
    }
    const lower = s.toLowerCase();
    for (const name of CAL_MONTHS) {
      if (name.toLowerCase().startsWith(lower)) return name;
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const baseDistrict = reportData?.district || "";
  const baseInstitution = reportData?.institution || "";

  /* 1) Fetch the selected month’s document strictly by (D,I,M,Y) */
  useEffect(() => {
    if (!baseDistrict || !baseInstitution || !month || !year) return;

    let cancelled = false;
    const pickLatest = (arr) =>
      arr
        .slice()
        .sort(
          (a, b) =>
            new Date(b?.updatedAt || b?.createdAt || 0) -
            new Date(a?.updatedAt || a?.createdAt || 0)
        )[0];

    (async () => {
      try {
        setHydrating(true);
        const q =
          `district=${encodeURIComponent(baseDistrict)}` +
          `&institution=${encodeURIComponent(baseInstitution)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;
        const r = await fetch(`${API_BASE}/api/reports?${q}`);
        const j = await r.json().catch(() => ({}));
        const items = Array.isArray(j?.docs) ? j.docs : Array.isArray(j) ? j : [];

        let filtered = items.filter(
          (d) =>
            eq(d?.district, baseDistrict) &&
            eq(d?.institution, baseInstitution) &&
            eq(d?.month, month) &&
            String(d?.year || "") === String(year)
        );

        if (!filtered.length) {
          // defensive fallback: list-all for D+I and then filter
          const rAll = await fetch(
            `${API_BASE}/api/reports?district=${encodeURIComponent(
              baseDistrict
            )}&institution=${encodeURIComponent(baseInstitution)}`
          );
          const jAll = await rAll.json().catch(() => ({}));
          const allItems = Array.isArray(jAll?.docs)
            ? jAll.docs
            : Array.isArray(jAll)
            ? jAll
            : [];
          filtered = allItems.filter(
            (d) =>
              eq(d?.district, baseDistrict) &&
              eq(d?.institution, baseInstitution) &&
              eq(d?.month, month) &&
              String(d?.year || "") === String(year)
          );
        }

        const chosen = pickLatest(filtered);
        if (!cancelled && chosen) setDoc(chosen || {});
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseDistrict, baseInstitution, month, year]);

  /* 2) Cumulative: fiscal Apr→selected (calendar order aware) */
  useEffect(() => {
    setCumTotals({});
    if (!baseDistrict || !baseInstitution || !month || !year) return;

    let cancelled = false;

    const fiscalWindowPairs = (selMonth, selYearStr) => {
      const mName = normMonth(selMonth);
      const idx = calIndex[String(mName).toLowerCase()]; // 0..11
      if (idx == null) return [];

      const selYear = Number(selYearStr);
      const pairs = [];

      if (idx <= 2) {
        // Jan/Feb/Mar of selYear → Apr..Dec of (selYear-1) + Jan..selected of selYear
        for (let i = calIndex["april"]; i <= calIndex["december"]; i++) {
          pairs.push({ month: CAL_MONTHS[i], year: String(selYear - 1) });
        }
        for (let i = 0; i <= idx; i++) {
          pairs.push({ month: CAL_MONTHS[i], year: String(selYear) });
        }
      } else {
        // Apr..Dec of selYear → Apr..selected of selYear
        for (let i = calIndex["april"]; i <= idx; i++) {
          pairs.push({ month: CAL_MONTHS[i], year: String(selYear) });
        }
      }
      return pairs;
    };

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

    (async () => {
      try {
        // Get all docs for this District + Institution (single call preferred)
        let list = await fetchList(
          `${API_BASE}/api/reports?district=${encodeURIComponent(
            baseDistrict
          )}&institution=${encodeURIComponent(baseInstitution)}`
        );

        // Fallback: /api/reports (unfiltered) if needed
        if (!Array.isArray(list) || list.length < 2) {
          const all = await fetchList(`${API_BASE}/api/reports`);
          list = Array.isArray(all)
            ? all.filter(
                (d) => eq(d?.district, baseDistrict) && eq(d?.institution, baseInstitution)
              )
            : [];
        }

        // Latest per (month,year) for this D+I
        const latestByMY = new Map();
        for (const d of list) {
          if (!eq(d?.district, baseDistrict) || !eq(d?.institution, baseInstitution)) continue;
          const m = normMonth(d?.month);
          const y = String(d?.year || "");
          const key = `${norm(m)}|${y}`;
          const ts = new Date(d?.updatedAt || d?.createdAt || 0).getTime();
          const prev = latestByMY.get(key);
          const prevTs = prev
            ? new Date(prev.updatedAt || prev.createdAt || 0).getTime()
            : -Infinity;
          if (!prev || ts >= prevTs) latestByMY.set(key, d);
        }

        // Keep only months in the fiscal window Apr→selected
        const windowKeys = new Set(
          fiscalWindowPairs(month, String(year)).map(
            (p) => `${norm(normMonth(p.month))}|${String(p.year)}`
          )
        );

        // Sum q1..qN across that window
        const sums = {};
        for (const [key, d] of latestByMY.entries()) {
          if (!windowKeys.has(key)) continue;
          const a = d?.answers || {};
          for (const [k, v] of Object.entries(a)) {
            if (/^q\d+$/.test(k)) {
              const n = Number(v) || 0;
              if (n !== 0) sums[k] = (sums[k] || 0) + n;
            }
          }
        }

        if (!cancelled) setCumTotals(sums);
      } catch (e) {
        console.error("Cumulative compute failed:", e);
        if (!cancelled) setCumTotals({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseDistrict, baseInstitution, month, year, calIndex]);

  /* 3) Render */
  const {
    answers: answersRaw = {},
    cumulative: cumulativeFromServer = {},
    eyeBank,
    visionCenter,
    institution,
    district,
    updatedAt,
  } = doc || {};

  const normalizeTextNameFields = (rows) =>
    Array.isArray(rows)
      ? rows.map((row) => {
          const out = { ...(row || {}) };
          for (const k of Object.keys(out)) {
            if (/name|centre|center/i.test(k) && (out[k] === 0 || out[k] === "0")) out[k] = "";
          }
          return out;
        })
      : [];

  // ✅ Eye Bank — include legacy keys so older data appears
  const eyeBankData = normalizeTextNameFields(
    doc?.eyeBank ||
      doc?.eyebank ||
      doc?.eye_bank ||
      doc?.eyeBankData || // legacy
      doc?.bank ||        // legacy
      doc?.eb ||          // legacy
      []
  );

  // ✅ Vision Centre — include legacy keys so older data appears
  const vcRaw =
    doc?.visionCenter ||     // current
    doc?.visioncentre ||     // alt spelling
    doc?.vision_centre ||    // snake
    doc?.visionCenterData || // legacy
    doc?.vcenter ||          // legacy
    doc?.vc ||               // legacy
    doc?.vcData ||           // legacy
    [];

  const visionCenterData = normalizeTextNameFields(
    Array.isArray(vcRaw)
      ? vcRaw.filter(
          (r) => !Object.values(r || {}).some((v) => typeof v === "string" && /total/i.test(v))
        )
      : []
  );

  // server cumulative (fallback only)
  const cumSrc =
    cumulativeFromServer && Object.keys(cumulativeFromServer).length
      ? cumulativeFromServer
      : answersRaw;

  if (!reportData) return null;

  return (
    <div className="a4-wrapper text-[12pt] font-serif">
      <div className="text-center font-bold text-[16pt] mb-1">
        NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
      </div>
      <div className="text-center font-semibold text-[14pt] mb-4">
        INDIVIDUAL REPORTING FORMAT
      </div>

      <div className="mb-4">
        <p><strong>District:</strong> {district}</p>
        <p><strong>Institution:</strong> {institution}</p>
        <p>
          <strong>Month:</strong> {month} {year}
          {updatedAt ? (
            <span className="ml-2 text-gray-500 no-print">
              (updated {new Date(updatedAt).toLocaleString()})
            </span>
          ) : null}
        </p>
      </div>

      {hydrating && (
        <div className="no-print mb-3 px-3 py-2 rounded bg-yellow-100 text-yellow-900">
          Loading full data…
        </div>
      )}

      <table className="table-auto w-full text-sm border border-black">
        <thead>
          <tr>
            <th className="border p-1 text-left">Description</th>
            <th className="border p-1 text-right">During the Month</th>
            <th className="border p-1 text-right">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            let qNumber = 0;
            return flatRows.map((item, idx) => {
              if (item.kind === "header") {
                const label = String(item.label ?? "").trim();
                if (!label) return null; // hide blank header rows
                return (
                  <tr key={`h-${idx}`}>
                    <td colSpan={3} className="border p-1 font-bold bg-gray-100">
                      {label}
                    </td>
                  </tr>
                );
              }
              if (item.kind === "subheader") {
                const label = String(item.label ?? "").trim();
                if (!label) return null; // hide blank subheaders
                return (
                  <tr key={`sh-${idx}`}>
                    <td colSpan={3} className="border p-1 font-semibold bg-gray-50">
                      {label}
                    </td>
                  </tr>
                );
              }
              if (item.kind === "eyeBankTable") {
                return (
                  <tr key={`eb-${idx}`}>
                    <td colSpan={3} className="border p-1">
                      <EyeBankTable data={eyeBankData} disabled cumulative />
                    </td>
                  </tr>
                );
              }
              if (item.kind === "visionCenterTable") {
                return (
                  <tr key={`vc-${idx}`}>
                    <td colSpan={3} className="border p-1">
                      {/* Unified VisionCenterTable includes "No. of Spectacles Prescribed" */}
                      <VisionCenterTable
                        data={visionCenterData}
                        disabled
                        showInstitution={false}
                      />
                    </td>
                  </tr>
                );
              }
              if (item.kind === "q") {
                // Keep numbering in sync with saved data even if label is blank
                qNumber += 1;
                const label = String(item.row?.label ?? "").trim();
                const key = `q${qNumber}`;

                // If label is empty, hide the row visually but DO NOT skip the index
                if (!label) return null;

                const monthVal = Number(answersRaw[key] ?? 0);
                const cumVal =
                  cumTotals[key] !== undefined
                    ? Number(cumTotals[key] || 0)
                    : Number(cumSrc[key] || 0);

                return (
                  <tr key={`r-${idx}`}>
                    <td className="border p-1">{label}</td>
                    <td className="border p-1 text-right">{monthVal}</td>
                    <td className="border p-1 text-right">{cumVal}</td>
                  </tr>
                );
              }
              return null;
            });
          })()}
        </tbody>
      </table>

      <div className="flex justify-between mt-8">
        <div>
          Signature of Senior Optometrist / Optometrist
          <br />.........................................
        </div>
        <div>
          Signature of Superintendent / Medical Officer
          <br />.........................................
        </div>
      </div>
    </div>
  );
}



// App.jsx (inside the file) — replace your existing ReportEntry with this one.
// App.jsx — replace ONLY the ReportEntry component with this version
function ReportEntry({
  user,
  initialAnswers = {},
  initialEyeBank = [],
  initialVisionCenter = [],
  initialMonth = "",
  initialYear = "",
  disabled = false,
}) {
  // helper: normalize a block's questions/rows to {id,label}
  const getQs = (blk) =>
    (Array.isArray(blk?.questions)
      ? blk.questions
      : Array.isArray(blk?.rows)
      ? blk.rows
      : []
    ).map((q, i) => ({
      ...q,
      id:
        q?.id ??
        q?.key ??
        q?.code ??
        q?.name ??
        q?.labelKey ??
        `q_auto_${(blk?.title || "blk").toString().replace(/\s+/g, "_")}_${i + 1}`,
      label: q?.label ?? q?.title ?? q?.text ?? q?.name ?? `Row ${i + 1}`,
    }));

  const [answers, setAnswers] = React.useState(initialAnswers);

  // Eye Bank table state (fallback to 2 empty rows if structure missing)
  const eyeBankSection = sections.find((s) =>
    (s.title || "").toUpperCase().includes("EYE BANK")
  );
  const eyeBankRowsDef = getQs(eyeBankSection);
  const [eyeBank, setEyeBank] = React.useState(
    initialEyeBank.length
      ? initialEyeBank
      : eyeBankRowsDef.length
      ? eyeBankRowsDef.map(() => ({}))
      : [{}, {}]
  );

  // Vision Center table state (fallback rows)
  const visionSection = sections.find((s) =>
    (s.title || "").toUpperCase().includes("VISION CENTER")
  );
  const visionRowsDef = Array.isArray(visionSection?.rows) ? visionSection.rows : [];
  const [visionCenter, setVisionCenter] = React.useState(
    initialVisionCenter.length
      ? initialVisionCenter
      : visionRowsDef.length
      ? visionRowsDef.map((row) =>
          Object.fromEntries(
            Object.keys(row)
              .filter((k) => k.endsWith("Key"))
              .map((k) => [row[k], ""])
          )
        )
      : [{ centerName: "", patientsExamined: "" }, { centerName: "", patientsExamined: "" }]
  );

  const [month, setMonth] = React.useState(initialMonth);
  const [year, setYear] = React.useState(initialYear);
  const [mode, setMode] = React.useState("edit");

  // detect existing submission; warn & block save (does not lock UI)
  const [alreadySubmitted, setAlreadySubmitted] = React.useState(false);

  const isDoc = user?.institution?.startsWith("DOC ");
  const canSave = month && year;
  const canSaveThisCombo = canSave && !alreadySubmitted;

  /* ----------------------- 🔊 Flute: start/stop here ----------------------- */
  React.useEffect(() => {
    startFlute();             // tries to play; if blocked, it fails silently
    return () => stopFlute(); // always stop when leaving entry page
  }, []);
  /* ------------------------------------------------------------------------ */

  // ✅ Check if a report already exists for this Institution + Month + Year.
  React.useEffect(() => {
    let cancelled = false;
    setAlreadySubmitted(false);

    const go = async () => {
      if (!user?.district || !user?.institution || !month || !year) return;
      try {
        const url =
          `${API_BASE}/api/reports?` +
          `district=${encodeURIComponent(user.district)}` +
          `&institution=${encodeURIComponent(user.institution)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        const items = Array.isArray(json?.docs) ? json.docs : Array.isArray(json) ? json : [];
        if (!cancelled) setAlreadySubmitted(items.length > 0);
      } catch {
        // ignore transient errors; allow user to try saving
      }
    };
    go();

    return () => {
      cancelled = true;
    };
  }, [user?.district, user?.institution, month, year]);

  const confirm = async () => {
    if (!month || !year) {
      alert("Please select both Month and Year before saving.");
      return;
    }
    if (alreadySubmitted) {
      alert(
        "A report for this Month & Year already exists for your institution. Please pick another Month/Year."
      );
      return;
    }

    const answersPartial = buildAnswersPartial(answers, sections);
    const cleanEyeBank = sanitizeTableArray(eyeBank);
    const cleanVisionCenter = sanitizeTableArray(visionCenter);

    if (
      Object.keys(answersPartial).length === 0 &&
      !someRowHasValues(cleanEyeBank) &&
      !someRowHasValues(cleanVisionCenter)
    ) {
      alert("Please enter at least one value in questions or tables.");
      return;
    }

    const payload = {
      district: user.district,
      institution: user.institution,
      month,
      year,
      answers: answersPartial,
    };
    if (someRowHasValues(cleanEyeBank)) payload.eyeBank = cleanEyeBank;
    if (someRowHasValues(cleanVisionCenter)) payload.visionCenter = cleanVisionCenter;

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        console.error("Save failed:", data);
        alert(`❌ Save failed: ${data?.error || res.status}`);
        return;
      }
      alert(`✅ Saved for ${user.institution}, ${user.district}`);
      // stop flute only after successful save
      stopFlute();
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Unexpected error during save. See console.");
      // keep flute playing so user can try again
    }
  };

  const handleTableChange =
    (setFn) =>
    (rowIdx, key, value) => {
      setFn((prev) => {
        const updated = [...prev];
        updated[rowIdx] = { ...updated[rowIdx], [key]: value };
        return updated;
      });
    };

  // Prevent mouse-wheel changing numeric values; hide spinners on this page only
  const handleWheelBlock = (e) => {
    const t = e.target;
    if (t && t.tagName === "INPUT" && t.type === "number") {
      t.blur();
      e.preventDefault();
    }
  };

  return (
    <div className="a4-wrapper font-serif" onWheel={handleWheelBlock}>
      {/* (Removed hidden <audio> tag — sound.js manages audio globally) */}
      <style>{`
        .a4-wrapper input[type="number"]::-webkit-outer-spin-button,
        .a4-wrapper input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .a4-wrapper input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      <div className="p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold text-center text-[#134074] uppercase mb-4">
          REPORT DATA ENTRY
        </h2>
        <div className="text-center text-[#016eaa] mb-2">
          District: <b>{user.district}</b> | Institution: <b>{user.institution}</b>
        </div>

        <div className="flex justify-end mb-2">
          <MonthYearSelector
            month={month}
            year={year}
            setMonth={setMonth}
            setYear={setYear}
            disabled={disabled}
          />
        </div>

        {alreadySubmitted && (
          <div className="mb-4 px-3 py-2 rounded bg-yellow-100 text-yellow-900 border border-yellow-300">
            ⚠️ A report for <b>{month}</b> <b>{year}</b> already exists for your institution.
            Please choose a different Month/Year to make a new entry.
          </div>
        )}

        {/* Question Sections */}
        {sections
          .filter((s) => !s.table)
          .map((s) => (
            <div key={s.title || Math.random()} className="mb-12">
              {s.title && (
                <h4 className="text-lg font-bold text-[#017d8a] mb-4">{s.title}</h4>
              )}

              {/* top-level questions/rows */}
              {getQs(s).length > 0 && (
                <div className="flex flex-col gap-6">
                  {getQs(s).map((q) => (
                    <div className="mb-2" key={q.id || q.label}>
                      <QuestionInput
                        q={q}
                        value={answers[q.id] || ""}
                        onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* subsections */}
              {Array.isArray(s.subsections) &&
                s.subsections.map((sub) => (
                  <div key={sub.title || Math.random()} className="mt-10">
                    {sub.title && (
                      <h5 className="font-bold text-[#017d8a] mb-4">{sub.title}</h5>
                    )}
                    <div className="flex flex-col space-y-8">
                      {getQs(sub).map((q) => (
                        <QuestionInput
                          key={q.id || q.label}
                          q={q}
                          value={answers[q.id] || ""}
                          onChange={(val) =>
                            setAnswers((a) => ({ ...a, [q.id]: val }))
                          }
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ))}

        {/* Eye Bank */}
        <div className="mb-12">
          <h4 className="text-lg font-bold text-[#017d8a] mb-4">III. EYE BANK PERFORMANCE</h4>
          <EyeBankTable
            data={eyeBank}
            onChange={handleTableChange(setEyeBank)}
            disabled={disabled}
          />
        </div>

        {/* Vision Center — unified component with “Spectacles Prescribed” */}
        <div className="mb-12">
          <h4 className="text-lg font-bold text-[#017d8a] mb-4">V. VISION CENTER</h4>
          <VisionCenterTable
            data={visionCenter}
            onChange={handleTableChange(setVisionCenter)}
            disabled={disabled}
            showInstitution={false}
          />
        </div>

        {!disabled && !isDoc && (
          <div className="text-center mt-8">
            {!canSave && (
              <div className="text-red-600 font-medium mb-4">
                Please select both <b>Month</b> and <b>Year</b> before saving.
              </div>
            )}
            <button
              onClick={() =>
                canSaveThisCombo
                  ? setMode("confirm")
                  : alert(
                      alreadySubmitted
                        ? "A report already exists for this Month & Year. Please pick another Month/Year."
                        : "❌ Please select both Month and Year before saving."
                    )
              }
              disabled={!canSaveThisCombo}
              className={`px-8 py-3 rounded-lg text-white transition ${
                canSaveThisCombo
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Save All
            </button>
          </div>
        )}

        {mode === "confirm" && (
          <div className="text-center mt-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={confirm}
            >
              ✅ Confirm and Submit
            </button>
            <button
              className="ml-4 px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              onClick={() => setMode("edit")}
            >
              ✏️ Edit Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}




/* ========================================================================== */
/* App                                                                         */
/* ========================================================================== */

function App() {
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const [currentReport, setCurrent] = useState(null);

  const [answers, setAnswers] = useState({});
  const [eyeBank, setEyeBank] = useState([]);
  const [visionCenter, setVisionCenter] = useState([]);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [institutionData, setInstitutionData] = useState([]);
  const [districtPerformance, setDistrictPerformance] = useState({
    monthData: [],
    cumulativeData: [],
  });

  // DOC/DC detection
  const instStr = String(user?.institution || "").trim().toLowerCase();
  const userRole =
    (user?.isDoc || /^doc\s/.test(instStr) || /^dc\s/.test(instStr))
      ? "DOC"
      : (user?.role || "USER");

  const qDefs = useMemo(() => orderedQuestions(sections), []);
  const selectedDistrict = user?.district || "Kozhikode";

  const institutionNamesMemo = useMemo(
    () =>
      Array.isArray(districtInstitutions[selectedDistrict])
        ? districtInstitutions[selectedDistrict]
        : [],
    [selectedDistrict]
  );

  const printWithPageSize = (size = "A4 portrait", margin = "10mm") => {
    const id = "__print_page_size";
    const prev = document.getElementById(id);
    if (prev) prev.remove();
    const style = document.createElement("style");
    style.id = id;
    style.media = "print";
    style.innerHTML = `@media print { @page { size: ${size}; margin: ${margin}; } }`;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => style.remove(), 400);
    }, 40);
  };
  const handlePrintA4 = () => printWithPageSize("A4 portrait", "10mm");

  /* ------------------------ Build district institution-wise ------------------------ */
  useEffect(() => {
    if ((menu !== "district-institutions" && menu !== "print" && menu !== "district-dl-inst") || !month || !year || !selectedDistrict) return;

    let cancelled = false;

    const monthIdx = Object.fromEntries(MONTHS.map((m, i) => [m.toLowerCase(), i]));
    const selIdx = monthIdx[String(month).toLowerCase()];
  if (selIdx == null || selIdx < 0) return;
    const fiscalStartYear = selIdx >= 9 ? Number(year) - 1 : Number(year);

    const fiscalPairs = [];
    for (let i = 0; i <= selIdx; i++) {
      const m = MONTHS[i];
      const y = i <= 8 ? fiscalStartYear : fiscalStartYear + 1;
      fiscalPairs.push({ month: m, year: String(y) });
    }

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

    const hydrateDoc = async (doc) => {
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

    const ts = (d) => {
      const t = Date.parse(d?.updatedAt || d?.createdAt || 0);
      return Number.isFinite(t) ? t : 0;
    };

    (async () => {
      try {
        const all = await fetchList(`${API_BASE}/api/reports`);

        const districtDocs = all.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
            String(selectedDistrict).trim().toLowerCase()
        );

        const inFiscalWindow = districtDocs.filter((d) =>
          fiscalPairs.some(
            (p) =>
              String(d?.month || "").trim().toLowerCase() === p.month.toLowerCase() &&
              String(d?.year || "") === p.year
          )
        );

        const hydrated = await Promise.all(inFiscalWindow.map(hydrateDoc));
        if (cancelled) return;

        const latestByInstMonth = new Map();
        hydrated.forEach((d) => {
          const inst = String(d?.institution || "").trim();
          if (!inst || /^doc\s/i.test(inst) || /^dc\s/i.test(inst)) return;
          const instLower = inst.toLowerCase();
          const mLower = String(d?.month || "").trim().toLowerCase();
          const y = String(d?.year || "").trim();
          const key = `${instLower}|${mLower}|${y}`;
          const prev = latestByInstMonth.get(key);
          if (!prev || ts(d) >= ts(prev)) latestByInstMonth.set(key, d);
        });

        const displayByLower = new Map();
        (Array.isArray(institutionNamesMemo) ? institutionNamesMemo : [])
          .filter((s) => s && !/^doc\s/i.test(String(s)) && !/^dc\s/i.test(String(s)))
          .forEach((s) => {
            const disp = String(s).trim();
            const lower = disp.toLowerCase();
            if (!displayByLower.has(lower)) displayByLower.set(lower, disp);
          });

        Array.from(latestByInstMonth.keys()).forEach((k) => {
          const lower = k.split("|")[0];
          if (!displayByLower.has(lower)) displayByLower.set(lower, lower);
        });

        const namesUnion = Array.from(displayByLower.values()).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        );

        const mkZeros = () => Array(qDefs.length).fill(0);

        const byInstAgg = new Map(
          namesUnion.map((name) => [
            name,
            { institution: name, monthData: mkZeros(), cumulativeData: mkZeros() },
          ])
        );

        const monthLowerSel = String(month).toLowerCase();
        const yearStrSel = String(year);

        displayByLower.forEach((displayName, lowerName) => {
          const rec =
            byInstAgg.get(displayName) ||
            { institution: displayName, monthData: mkZeros(), cumulativeData: mkZeros() };

          const md = latestByInstMonth.get(`${lowerName}|${monthLowerSel}|${yearStrSel}`);
          const monthAns = md?.answers || {};
          for (let i = 0; i < qDefs.length; i++) {
            const k = `q${i + 1}`;
            rec.monthData[i] = Number(monthAns[k] ?? 0) || 0;
          }

          for (const p of fiscalPairs) {
            const k2 = `${lowerName}|${p.month.toLowerCase()}|${p.year}`;
            const d = latestByInstMonth.get(k2);
            const a = d?.answers || {};
            for (let i = 0; i < qDefs.length; i++) {
              const k = `q${i + 1}`;
              rec.cumulativeData[i] += Number(a[k] ?? 0) || 0;
            }
          }
          byInstAgg.set(displayName, rec);
        });

        const list = Array.from(byInstAgg.values());
        const distMonth = mkZeros();
        const distCum = mkZeros();
        for (const r of list) {
          for (let i = 0; i < qDefs.length; i++) {
            distMonth[i] += r.monthData[i];
            distCum[i] += r.cumulativeData[i];
          }
        }
        setInstitutionData(list);
        setDistrictPerformance({ monthData: distMonth, cumulativeData: distCum });
      } catch (e) {
        console.error("Institution-wise fiscal aggregate failed:", e);
        setInstitutionData([]);
        setDistrictPerformance({
          monthData: Array(qDefs.length).fill(0),
          cumulativeData: Array(qDefs.length).fill(0),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [menu, month, year, selectedDistrict, qDefs.length, institutionNamesMemo]);

  useEffect(() => {
    if (window.__FORCE_VIEW__) {
      window.__FORCE_VIEW__ = false;
      setMenu("view");
    }
  }, []);

  useEffect(() => {
    if (!(menu === "view" || menu === "print")) return;
    if (!month || !year) {
      setCurrent(null);
      return;
    }
    if (userRole === "DOC") return;

    let cancelled = false;

    const pickLatest = (arr) =>
      arr.slice().sort(
        (a, b) =>
          new Date(b?.updatedAt || b?.createdAt || 0) -
          new Date(a?.updatedAt || a?.createdAt || 0)
      )[0];

    (async () => {
      try {
        const url =
          `${API_BASE}/api/reports?` +
          `district=${encodeURIComponent(user?.district || "")}` +
          `&institution=${encodeURIComponent(user?.institution || "")}` +
          `&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;

        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        const items = Array.isArray(json?.docs) ? json.docs : Array.isArray(json) ? json : [];

        const mine = items.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(user?.district || "").trim().toLowerCase() &&
            String(d?.institution || "").trim().toLowerCase() ===
              String(user?.institution || "").trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() === String(month).toLowerCase() &&
            String(d?.year || "") === String(year)
        );

        const chosen = pickLatest(mine);
        if (!cancelled) setCurrent(chosen || null);
      } catch (e) {
        console.error("Auto-select report failed:", e);
        if (!cancelled) setCurrent(null);
      }
    })();

    return () => { cancelled = true; };
  }, [menu, month, year, userRole, user?.district, user?.institution]);

  /* =======================  EXCEL DOWNLOADS  ======================= */

  const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toCSV = (rows) =>
    rows.map((r) =>
      r.map((v) => {
        const s = v == null ? "" : String(v);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");

  const downloadInstitutionWiseXLSX = async () => {
    if (!month || !year || !institutionData.length || !Q_ROWS.length) {
      alert("Nothing to export. Pick Month & Year and wait for data.");
      return;
    }

    const instNames = institutionData.map((d) => d.institution);
    const header = ["Description"];
    instNames.forEach((n) => header.push(`${n} (Month)`, `${n} (Cumulative)`));
    header.push("District (Month)", "District (Cumulative)");

    const rows = [header];
    for (let i = 0; i < Q_ROWS.length; i++) {
      const label = Q_ROWS[i].label;
      const row = [label];
      instNames.forEach((n) => {
        const rec = institutionData.find((r) => r.institution === n);
        row.push(rec?.monthData?.[i] ?? 0, rec?.cumulativeData?.[i] ?? 0);
      });
      row.push(districtPerformance.monthData?.[i] ?? 0, districtPerformance.cumulativeData?.[i] ?? 0);
      rows.push(row);
    }

    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Institution-wise");
      XLSX.writeFile(wb, `Institution-wise_${selectedDistrict}_${month}_${year}.xlsx`);
    } catch (e) {
      console.warn("xlsx not available, fallback CSV:", e);
      saveBlob(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }),
        `Institution-wise_${selectedDistrict}_${month}_${year}.csv`);
    }
  };

  const fetchDistrictDocsForMonth = async () => {
    const url =
      `${API_BASE}/api/reports?` +
      `district=${encodeURIComponent(selectedDistrict)}` +
      `&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;

    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json?.docs) ? json.docs : Array.isArray(json) ? json : [];

    const hydrated = await Promise.all(
      list.map(async (d) => {
        try {
          const id = d?._id || d?.id;
          if (!id) return d;
          const r2 = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
          const j2 = await r2.json().catch(() => ({}));
          return j2?.doc || j2 || d;
        } catch {
          return d;
        }
      })
    );
    return hydrated;
  };

  const normalizeArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => {
      const out = {};
      Object.entries(o || {}).forEach(([k, v]) => {
        const key = String(k).trim();
        out[key] = typeof v === "string" ? v.trim() : v;
      });
      return out;
    });
  };
  const unionKeys = (rows) => {
    const set = new Set();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  };

  const downloadEyeBankVisionCenterXLSX = async () => {
    if (!month || !year) {
      alert("Pick Month & Year first.");
      return;
    }
    try {
      const docs = await fetchDistrictDocsForMonth();

      const ebRows = [];
      const vcRows = [];
      docs.forEach((d) => {
        const inst = String(d?.institution || "").trim();
        if (!inst || /^doc\s/i.test(inst) || /^dc\s/i.test(inst)) return;

        const eb = normalizeArray(d?.eyeBank || d?.eyebank || d?.eye_bank || []);
        eb.forEach((row) => ebRows.push({ Institution: inst, ...row }));

        const vc = normalizeArray(d?.visionCenter || d?.visioncentre || d?.vision_centre || []);
        vc.forEach((row) => vcRows.push({ Institution: inst, ...row }));
      });

      const ebKeys = ["Institution", ...unionKeys(ebRows).filter((k) => k !== "Institution")];
      const vcKeys = ["Institution", ...unionKeys(vcRows).filter((k) => k !== "Institution")];

      const ebAOA = [ebKeys, ...ebRows.map((r) => ebKeys.map((k) => r?.[k] ?? ""))];
      const vcAOA = [vcKeys, ...vcRows.map((r) => vcKeys.map((k) => r?.[k] ?? ""))];

      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        if (ebRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ebAOA), "EyeBank");
        if (vcRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vcAOA), "VisionCenter");
        if (!ebRows.length && !vcRows.length) {
          alert("No Eye Bank / Vision Center data for this month.");
          return;
        }
        XLSX.writeFile(wb, `EB_VC_${selectedDistrict}_${month}_${year}.xlsx`);
      } catch (e) {
        console.warn("xlsx not available, fallback CSV:", e);
        if (ebRows.length) {
          saveBlob(new Blob([toCSV(ebAOA)], { type: "text/csv;charset=utf-8" }),
            `EyeBank_${selectedDistrict}_${month}_${year}.csv`);
        }
        if (vcRows.length) {
          saveBlob(new Blob([toCSV(vcAOA)], { type: "text/csv;charset=utf-8" }),
            `VisionCenter_${selectedDistrict}_${month}_${year}.csv`);
        }
        if (!ebRows.length && !vcRows.length) {
          alert("No Eye Bank / Vision Center data for this month.");
        }
      }
    } catch (e) {
      console.error("EB/VC export failed:", e);
      alert("Could not build Eye Bank & Vision Center export.");
    }
  };

  /* ------------------------- Auth & shells ------------------------- */
  if (!user) {
    return showRegister ? (
      <Register onRegister={() => setShowRegister(false)} />
    ) : (
      <Login
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          setShowVideo(true);
        }}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  if (showVideo) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <video
          src="/intro.mp4"
          autoPlay
          onEnded={() => setShowVideo(false)}
          className="w-full max-w-4xl"
          controls
        />
        <button
          className="mt-4 px-6 py-2 bg-gray-200 rounded hover:bg-gray-300 font-medium"
          onClick={() => setShowVideo(false)}
        >
          Skip Video
        </button>
      </div>
    );
  }

  const viewerInstitution = userRole === "DOC" ? undefined : user?.institution || "";

  return (
    <div className="min-h-screen bg-gray-100 pt-[80px]">
      <div className="no-print">
        <MenuBar
          user={user}
          userRole={userRole}
          active={menu}
          onMenu={(key) => {
            setMenu(key);
            if (!key.startsWith("view")) setCurrent(null);
          }}
          onLogout={() => {
            setUser(null);
            setMenu("");
            setCurrent(null);
          }}
        />
      </div>

      {user?.isGuest && (
        <div className="bg-yellow-100 text-yellow-800 text-center py-2 font-semibold shadow-md">
          🕶️ Guest Mode — Preview Only (No data will be saved)
        </div>
      )}

      <div className="p-4 font-serif text-[12pt]">
        {/* Report Entry */}
        {menu === "entry" && (
          <ReportEntry
            user={user}
            initialAnswers={answers}
            initialEyeBank={eyeBank}
            initialVisionCenter={visionCenter}
            initialMonth={month}
            initialYear={year}
            disabled={user?.isGuest}
          />
        )}

        {/* View / Edit */}
        {menu === "view" && (
          <div className="p-4 font-serif text-[12pt]">
            <div className="flex justify-center gap-4 mb-4">
              <select className="border p-2 rounded" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select className="border p-2 rounded" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <ReportsList
              filterMonth={month}
              filterYear={year}
              filterDistrict={user?.district}
              filterInstitution={viewerInstitution}
              onSelect={(report) => setCurrent(report || null)}
            />

            <div className="text-center mt-4 text-sm text-black no-print">
              {currentReport
                ? `✅ Selected: ${currentReport.institution}, ${currentReport.month} ${currentReport.year}`
                : "❌ No report selected"}
            </div>

            {currentReport && (
              <ViewReports reportData={currentReport} month={currentReport.month} year={currentReport.year} />
            )}
          </div>
        )}

        {/* District → Institution-wise (table) */}
        {menu === "district-institutions" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            {/* ⛔️ Removed the two old download buttons here */}
            {month && year ? (
              <ViewInstitutionWiseReport
                questions={Q_ROWS.map((q) => q.label)}
                institutionNames={institutionNamesMemo}
                data={institutionData}
                districtPerformance={districtPerformance}
                month={month}
                year={year}
              />
            ) : (
              <div className="text-center text-gray-600 mt-6 no-print">
                Please select both <b>Month</b> and <b>Year</b> to view institution-wise report.
              </div>
            )}
          </>
        )}

        {/* Submenu: Download Institution-wise */}
        {menu === "district-dl-inst" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            <div className="no-print flex justify-center mt-3">
              <button
                className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                onClick={downloadInstitutionWiseXLSX}
                disabled={!month || !year || institutionData.length === 0}
              >
                ⬇️ Download Institution-wise (.xlsx)
              </button>
            </div>
            <div className="text-center mt-3 text-sm text-gray-600">
              Select month & year, then click download.
            </div>
          </>
        )}

        {/* Submenu: Download Eye Bank & VC */}
        {menu === "district-dl-ebvc" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            <div className="no-print flex justify-center mt-3">
              <button
                className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                onClick={downloadEyeBankVisionCenterXLSX}
                disabled={!month || !year}
              >
                ⬇️ Download Eye Bank & Vision Center (.xlsx)
              </button>
            </div>
            <div className="text-center mt-3 text-sm text-gray-600">
              Select month & year, then click download.
            </div>
          </>
        )}

        {/* District Summary Tables */}
        {menu === "district-tables" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            {month && year ? (
              <ViewDistrictTables
                user={user}
                month={month}
                year={year}
                district={selectedDistrict}
                showDownloadEB={true}
                showDownloadVC={true}
              />
            ) : (
              <div className="text-center text-gray-600 mt-6 no-print">
                Please select both <b>Month</b> and <b>Year</b> to view district tables.
              </div>
            )}
          </>
        )}

        {/* PRINT */}
        {menu === "print" && (
          <>
            <div className="flex justify-center gap-4 mb-4 no-print">
              <select className="border p-2 rounded" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select className="border p-2 rounded" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {userRole !== "DOC" && currentReport && (
              <>
                <button
                  className="no-print mb-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handlePrintA4}
                >
                  🖨️ Print (A4 portrait)
                </button>
                <ViewReports reportData={currentReport} month={currentReport.month} year={currentReport.year} />
              </>
            )}

            {userRole !== "DOC" && !currentReport && (
              <div className="text-center text-gray-600 mt-6 no-print">
                Pick Month & Year to load your report, then print.
              </div>
            )}

            {userRole === "DOC" && (
              <>
                {month && year ? (
                  <ViewInstitutionWiseReport
                    questions={Q_ROWS.map((q) => q.label)}
                    institutionNames={institutionNamesMemo}
                    data={institutionData}
                    districtPerformance={districtPerformance}
                    month={month}
                    year={year}
                  />
                ) : (
                  <div className="text-center text-gray-600 mt-6 no-print">
                    Please select both <b>Month</b> and <b>Year</b>.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {menu === "edit" && (
          <EditGate user={user}>
            <EditReport user={user} />
          </EditGate>
        )}
        {menu === "search" && (
  <SearchReports
    user={user}
    onOpen={(report) => {
      setCurrent(report || null);
      setMenu("view");   // re-use the existing viewer
    }}
  />
)}


        {menu === "test-vc" && <TestVisionCenter />}

        {menu === "" && (
          <div className="text-center text-gray-500 mt-10 text-lg italic">
            🔹 Please select a menu option to begin.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
