// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "./apiBase";
import sections from "./data/questions";
import { districtInstitutions } from "./data/districtInstitutions";
import "./index.css";

import MonthYearSelector from "./components/MonthYearSelector";
import EyeBankTable from "./components/EyeBankTable";
import VisionCenterTable from "./components/VisionCenterTable.jsx";
import QuestionInput from "./components/QuestionInput";
import Login from "./components/Login";
import MenuBar from "./components/MenuBar";
import ReportsList from "./components/ReportsList";
import ViewInstitutionWiseReport from "./components/ViewInstitutionWiseReport";
import ViewDistrictTables from "./components/ViewDistrictTables";
import EditReport from "./components/EditReport";
import ConnectedLinks from "./components/ConnectedLinks";
import Register from "./components/Register";
import EditGate from "./components/EditGate";

/* ----------------------------- Month constants ---------------------------- */
const MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// Return section questions whether the data uses `questions` or `rows`
const getQs = (s) => Array.isArray(s?.questions) ? s.questions : (Array.isArray(s?.rows) ? s.rows : []);

// Build flat rows in display order (headers, subheaders, q-rows, and table markers)
function buildFlatRows(secs) {
  const out = [];
  for (const sec of secs) {
    if (typeof sec.title === "string") out.push({ kind: "header", label: sec.title });

    // direct questions in this section (skip Vision Center table rows)
  const titleLower = String(sec.title || "").toLowerCase();
  const isVisionCenter = sec.table && titleLower.includes("vision center");
  if (!isVisionCenter) {
    for (const q of getQs(sec)) out.push({ kind: "q", row: q });
  }
  // subsections
    if (Array.isArray(sec.subsections)) {
      for (const sub of sec.subsections) {
        if (sub.title) out.push({ kind: "subheader", label: sub.title });
        for (const q of getQs(sub)) out.push({ kind: "q", row: q });
      }
    }

    // tables
    if (sec.table && sec.title?.toLowerCase().includes("eye bank")) out.push({ kind: "eyeBankTable" });
    if (sec.table && sec.title?.toLowerCase().includes("vision center")) out.push({ kind: "visionCenterTable" });
  }
  return out;
}

// Only the question rows (in the same display order)
function orderedQuestions(secs) {
  return buildFlatRows(secs).filter((r) => r.kind === "q").map((r) => r.row);
}

/** Build ONLY non-zero q# keys (by row order q1..qN). */
function buildAnswersPartial(answers, secs) {
  const qs = orderedQuestions(secs);
  const out = {};
  for (let i = 0; i < qs.length; i++) {
    const id = qs[i].id;
    const raw = answers[id];
    let v = 0;
    if (raw && typeof raw === "object") {
      v = Object.values(raw).reduce((s, x) => s + (Number(x) || 0), 0);
    } else {
      v = Number(raw || 0);
    }
    if (v > 0) out[`q${i + 1}`] = String(v);
  }
  return out;
}

// --- helpers for tables: keep names as strings; only numeric-looking values -> numbers
const sanitizeTableArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((row) => {
        const out = {};
        for (const [k, v] of Object.entries(row || {})) {
          if (v === null || v === undefined) { out[k] = ""; continue; }
          if (typeof v === "number") { out[k] = Number.isFinite(v) ? v : 0; continue; }
          const s = String(v).trim();
          out[k] = /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
        }
        return out;
      })
    : [];

// used before saving: do we have any numeric values in any row?
const someRowHasValues = (arr) =>
  Array.isArray(arr) &&
  arr.some((row) =>
    Object.values(row || {}).some((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    })
  );

// used when viewing old records that accidentally saved name fields as 0/"0"
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

/* ========================================================================== */
/* ViewReports                                                                 */
/* ========================================================================== */
function ViewReports({ reportData, month, year }) {
  const [doc, setDoc] = useState(reportData || null);
  const [hydrating, setHydrating] = useState(false);
  const [errText, setErrText] = useState("");

  const flatRows = useMemo(() => buildFlatRows(sections), []);

  // helpers
  const norm = (s) => String(s || "").trim().toLowerCase();
  const eq = (a, b) => norm(a) === norm(b);

  // identity we filter by: always from the selected card/report
  const baseDistrict = reportData?.district || "";
  const baseInstitution = reportData?.institution || "";

  /* -------- EXACT selection whenever month/year (or identity) change -------- */
  useEffect(() => {
    const hasSel =
      !!norm(baseDistrict) && !!norm(baseInstitution) && !!norm(month) && String(year);

    // If there's no selection (e.g., initial cards view), keep whatever came in
    if (!hasSel) {
      setErrText("");
      setDoc(reportData || null);
      return;
    }

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

    (async () => {
      setHydrating(true);
      setErrText("");
      setDoc(null); // IMPORTANT: clear stale doc so UI can't show June under July header

      try {
        // Ask backend for the narrowest set first
        const q =
          `district=${encodeURIComponent(baseDistrict)}` +
          `&institution=${encodeURIComponent(baseInstitution)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;

        let list = await fetchList(`${API_BASE}/api/reports?${q}`);
        if (!list.length) {
          // broader fallback (institution only), then filter locally
          const q2 =
            `district=${encodeURIComponent(baseDistrict)}` +
            `&institution=${encodeURIComponent(baseInstitution)}`;
          list = await fetchList(`${API_BASE}/api/reports?${q2}`);
          if (!list.length) list = await fetchList(`${API_BASE}/api/reports`);
        }

        // strict match – NEVER silently fall back to a different month
        const exact = list.find(
          (d) =>
            eq(d?.district, baseDistrict) &&
            eq(d?.institution, baseInstitution) &&
            eq(d?.month, month) &&
            String(d?.year) === String(year)
        );

        if (cancelled) return;

        if (!exact) {
          setDoc(null);
          setErrText(`No report found for ${baseInstitution} — ${month} ${year}.`);
        } else {
          setDoc(exact);
          setErrText("");
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseDistrict, baseInstitution, month, year, reportData]);

  /* ---- optional hydration by id; keep only if identity & month/year still match ---- */
  useEffect(() => {
    const id = doc?._id || doc?.id;
    if (!id) return;

    let cancelled = false;
    (async () => {
      try {
        setHydrating(true);
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
        if (!res.ok) return; // backend may 404; it's fine to skip
        const data = await res.json().catch(() => ({}));
        const hydrated = data?.doc || data;

        if (!cancelled && hydrated && typeof hydrated === "object") {
          if (
            eq(hydrated?.district, doc?.district) &&
            eq(hydrated?.institution, doc?.institution) &&
            eq(hydrated?.month, doc?.month) &&
            String(hydrated?.year) === String(doc?.year)
          ) {
            setDoc(hydrated);
          }
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc?._id, doc?.id]);

  // Pull fields **from the selected doc** so header always matches table content
  const {
    answers: answersRaw = {},
    cumulative: cumulativeFromServer = {},
    eyeBank,
    visionCenter,
    institution,
    district,
    updatedAt,
  } = doc || {};

  const eyeBankData = normalizeTextNameFields(eyeBank || doc?.eyebank || doc?.eye_bank || []);
  const visionCenterData = normalizeTextNameFields(
    visionCenter || doc?.visioncentre || doc?.vision_centre || []
  );

  const cumSrc =
    cumulativeFromServer && Object.keys(cumulativeFromServer).length
      ? cumulativeFromServer
      : answersRaw;

  // Header uses the DOC's month/year; falls back to props only if doc missing
  const headerMonth = doc?.month ?? month;
  const headerYear = doc?.year ?? year;

  if (!reportData && !doc) return null;

  return (
    <div className="a4-wrapper text-[12pt] font-serif">
      <div className="text-center font-bold text-[16pt] mb-1">
        NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
      </div>
      <div className="text-center font-semibold text-[14pt] mb-4">
        INDIVIDUAL REPORTING FORMAT
      </div>

      <div className="mb-4">
        <p><strong>District:</strong> {district || reportData?.district || ""}</p>
        <p><strong>Institution:</strong> {institution || reportData?.institution || ""}</p>
        <p>
          <strong>Month:</strong> {headerMonth} {headerYear}
          {updatedAt ? (
            <span className="ml-2 text-gray-500 no-print">
              (updated {new Date(updatedAt).toLocaleString()})
            </span>
          ) : null}
        </p>
        {errText && <p className="text-red-600 text-sm mt-1">{errText}</p>}
      </div>

      {hydrating && (
        <div className="no-print mb-3 px-3 py-2 rounded bg-yellow-100 text-yellow-900">
          Loading full data…
        </div>
      )}

      {!doc ? null : (
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
                  return (
                    <tr key={`h-${idx}`}>
                      <td colSpan={3} className="border p-1 font-bold bg-gray-100">{item.label}</td>
                    </tr>
                  );
                }
                if (item.kind === "subheader") {
                  return (
                    <tr key={`sh-${idx}`}>
                      <td colSpan={3} className="border p-1 font-semibold bg-gray-50">{item.label}</td>
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
                        <VisionCenterTable data={visionCenterData} disabled cumulative />
                      </td>
                    </tr>
                  );
                }
                if (item.kind === "q") {
                  qNumber += 1;
                  const key = `q${qNumber}`;
                  const monthVal = Number(answersRaw[key] ?? 0);
                  const cumVal  = Number(cumSrc[key] ?? 0);
                  return (
                    <tr key={`r-${idx}`}>
                      <td className="border p-1">{item.row.label}</td>
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
      )}

      {doc && (
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
      )}
    </div>
  );
}




//* -------------------------------------------------------------------------- */
/* ReportEntry                                                                 */
/* -------------------------------------------------------------------------- */
function ReportEntry({
  user,
  initialAnswers = {},
  initialEyeBank = [],
  initialVisionCenter = [],
  initialMonth = "",
  initialYear = "",
  disabled = false,
  onOpenExisting, // optional: navigate to existing doc
}) {
  const [answers, setAnswers] = useState(initialAnswers);

  // Eye Bank table state (fallback to 2 empty rows if structure missing)
  const eyeBankSection = sections.find((s) => (s.title || "").toUpperCase().includes("EYE BANK"));
  const eyeBankRowsDef = getQs(eyeBankSection);
  const [eyeBank, setEyeBank] = useState(
    initialEyeBank.length ? initialEyeBank : (eyeBankRowsDef.length ? eyeBankRowsDef.map(() => ({})) : [{}, {}])
  );

  // Vision Center table state (fallback rows)
  const visionSection = sections.find((s) => (s.title || "").toUpperCase().includes("VISION CENTER"));
  const visionRowsDef = Array.isArray(visionSection?.rows) ? visionSection.rows : [];
  const [visionCenter, setVisionCenter] = useState(
    initialVisionCenter.length
      ? initialVisionCenter
      : (visionRowsDef.length
          ? visionRowsDef.map((row) =>
              Object.fromEntries(
                Object.keys(row)
                  .filter((k) => k.endsWith("Key"))
                  .map((k) => [row[k], ""])
              )
            )
          : [{ name: "", examined: "" }, { name: "", examined: "" }])
  );

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [mode, setMode] = useState("edit");
  const [locked, setLocked] = useState(false);

  // ---------- Prevent duplicate report for same Institution+District+Month+Year ----------
  const [existingForPeriod, setExistingForPeriod] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const eq = (a, b) => norm(a) === norm(b);

  const district = String(user?.district || "").trim();
  const institution = String(user?.institution || "").trim();

  // Your original DOC detection:
  const isDoc = user?.institution?.startsWith("DOC ");

  useEffect(() => {
    // Only check for optometrists (non-DOC) and when month/year are selected
    if (isDoc) { setExistingForPeriod(null); return; }
    if (!district || !institution || !month || !year) {
      setExistingForPeriod(null);
      return;
    }

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

    (async () => {
      setCheckingExisting(true);
      try {
        const q =
          `district=${encodeURIComponent(district)}` +
          `&institution=${encodeURIComponent(institution)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;

        let list = await fetchList(`${API_BASE}/api/reports?${q}`);
        if (!list.length) {
          // broader fallback (institution only) then filter locally
          const q2 =
            `district=${encodeURIComponent(district)}` +
            `&institution=${encodeURIComponent(institution)}`;
          list = await fetchList(`${API_BASE}/api/reports?${q2}`);
          if (!list.length) list = await fetchList(`${API_BASE}/api/reports`);
        }

        const exact = list.find(
          (d) =>
            eq(d?.district, district) &&
            eq(d?.institution, institution) &&
            eq(d?.month, month) &&
            String(d?.year) === String(year)
        );

        if (!cancelled) setExistingForPeriod(exact || null);
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [district, institution, month, year, isDoc]);

  const canSave = !!month && !!year && !existingForPeriod; // block when duplicate exists

  // renamed to avoid shadowing window.confirm
  const handleSubmitSave = async () => {
    if (!month || !year) {
      alert("Please select both Month and Year before saving.");
      return;
    }
    if (!isDoc && existingForPeriod) {
      // block duplicate for optometrist
      if (onOpenExisting) {
        if (window.confirm(`A report for ${institution} — ${month} ${year} already exists.\nOpen it now?`)) {
          onOpenExisting(existingForPeriod);
        }
      } else {
        alert(`A report for ${institution} — ${month} ${year} already exists. Please open and edit that report.`);
      }
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
        // If backend returns 409 duplicate, surface a friendly message
        if (res.status === 409 || data?.code === "DUPLICATE_MONTH") {
          alert(`❌ A report for ${institution} — ${month} ${year} already exists.`);
          return;
        }
        alert(`❌ Save failed: ${data?.error || res.status}`);
        return;
      }
      setLocked(true);
      alert(`✅ Saved for ${user.institution}, ${user.district}`);
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Unexpected error during save. See console.");
    }
  };

  const handleTableChange = (setFn) => (rowIdx, key, value) => {
    setFn((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [key]: value };
      return updated;
    });
  };

  if (locked) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 rounded-xl shadow-lg bg-white text-center text-[#134074] font-serif">
        ✅ Report for <b>{user.institution}, {user.district}</b> is locked.<br />
        Contact admin to unlock.
      </div>
    );
  }

  // Render all sections/questions (accepts .questions or .rows)
  return (
    <div className="a4-wrapper font-serif">
      <div className="p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold text-center text-[#134074] uppercase mb-4">
          REPORT DATA ENTRY
        </h2>
        <div className="text-center text-[#016eaa] mb-2">
          District: <b>{user.district}</b> | Institution: <b>{user.institution}</b>
        </div>

        <div className="flex justify-end mb-6">
          <MonthYearSelector
            month={month}
            year={year}
            setMonth={setMonth}
            setYear={setYear}
            disabled={disabled}
          />
        </div>

        {/* Duplicate guard banner */}
        {!isDoc && existingForPeriod && !checkingExisting && (
          <div className="no-print mb-4 px-3 py-2 rounded bg-red-100 text-red-800">
            A report for <b>{institution}</b> — <b>{month} {year}</b> already exists.
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-indigo-600 text-white"
                onClick={() => {
                  if (onOpenExisting) onOpenExisting(existingForPeriod);
                  else alert("Please open the existing report from the View menu.");
                }}
              >
                Open Existing
              </button>
              <span className="text-xs text-red-700 self-center">
                (Saving another one is disabled.)
              </span>
            </div>
          </div>
        )}

        {/* Question Sections */}
        {sections.filter((s) => !s.table).map((s) => (
          <div key={s.title || Math.random()} className="mb-12">
            {s.title && <h4 className="text-lg font-bold text-[#017d8a] mb-4">{s.title}</h4>}

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
            {Array.isArray(s.subsections) && s.subsections.map((sub) => (
              <div key={sub.title || Math.random()} className="mt-10">
                {sub.title && <h5 className="font-bold text-[#017d8a] mb-4">{sub.title}</h5>}
                <div className="flex flex-col space-y-8">
                  {getQs(sub).map((q) => (
                    <QuestionInput
                      key={q.id || q.label}
                      q={q}
                      value={answers[q.id] || ""}
                      onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
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

        {/* Vision Center */}
        <div className="mb-12">
          <h4 className="text-lg font-bold text-[#017d8a] mb-4">V. VISION CENTER</h4>
          <VisionCenterTable
            data={visionCenter}
            onChange={handleTableChange(setVisionCenter)}
            disabled={disabled}
          />
        </div>

        {!disabled && !isDoc && (
          <div className="text-center mt-8">
            {!month || !year ? (
              <div className="text-red-600 font-medium mb-4">
                Please select both <b>Month</b> and <b>Year</b> before saving.
              </div>
            ) : null}
            <button
              onClick={() => {
                if (!month || !year) return alert("❌ Please select both Month and Year before saving.");
                if (existingForPeriod) {
                  if (onOpenExisting) onOpenExisting(existingForPeriod);
                  else alert(`A report for ${institution} — ${month} ${year} already exists.`);
                  return;
                }
                setMode("confirm");
              }}
              className={`px-8 py-3 rounded-lg text-white transition ${
                !month || !year || !!existingForPeriod
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={!month || !year || !!existingForPeriod}
            >
              Save All
            </button>
          </div>
        )}

        {mode === "confirm" && (
          <div className="text-center mt-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleSubmitSave}
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
  // persist login
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  useEffect(() => { localStorage.setItem("user", JSON.stringify(user)); }, [user]);

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
  const [districtPerformance, setDistrictPerformance] = useState({ monthData: [], cumulativeData: [] });

  // DOC/DC detection
  const instStr = String(user?.institution || "").trim().toLowerCase();
  const userRole = (user?.isDoc || /^doc\s/.test(instStr) || /^dc\s/.test(instStr)) ? "DOC" : (user?.role || "USER");

  const qDefs = useMemo(() => orderedQuestions(sections), []);
  const selectedDistrict = user?.district || "Kozhikode";

  const institutionNamesMemo = useMemo(
    () => (Array.isArray(districtInstitutions[selectedDistrict]) ? districtInstitutions[selectedDistrict] : []),
    [selectedDistrict]
  );

  const printWithPageSize = (size = "A4 portrait", margin = "10mm") => {
    const id = "__print_page_size";
    const prev = document.getElementById(id);
    if (prev) prev.remove();
    const style = document.createElement("style");
    style.id = id; style.media = "print";
    style.innerHTML = `@media print { @page { size: ${size}; margin: ${margin}; } }`;
    document.head.appendChild(style);
    setTimeout(() => { window.print(); setTimeout(() => style.remove(), 400); }, 40);
  };
  const handlePrintA4 = () => printWithPageSize("A4 portrait", "10mm");

  // District institution-wise (server-side aggregate)
  useEffect(() => {
    const needs =
      (menu === "district-institutions" || menu === "print" || menu === "district-dl-inst") &&
      month && year && selectedDistrict;
    if (!needs) return;

    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({ district: selectedDistrict, month, year }).toString();
        const res = await fetch(`${API_BASE}/api/district-institution-report?` + q);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          console.error("district-institution-report failed:", json);
          setInstitutionData([]);
          setDistrictPerformance({ monthData: Array(qDefs.length).fill(0), cumulativeData: Array(qDefs.length).fill(0) });
          return;
        }

        setInstitutionData(Array.isArray(json.institutionData) ? json.institutionData : []);
        setDistrictPerformance(json.districtPerformance || { monthData: Array(qDefs.length).fill(0), cumulativeData: Array(qDefs.length).fill(0) });
      } catch (e) {
        console.error("district-institution-report error:", e);
        if (!cancelled) {
          setInstitutionData([]);
          setDistrictPerformance({ monthData: Array(qDefs.length).fill(0), cumulativeData: Array(qDefs.length).fill(0) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [menu, month, year, selectedDistrict, qDefs.length]);

  // Force-open "view" if a flag was set externally
  useEffect(() => {
    if (window.__FORCE_VIEW__) { window.__FORCE_VIEW__ = false; setMenu("view"); }
  }, []);

  // Auto-select current user's report for chosen month/year (non-DOC)
  useEffect(() => {
    if (!(menu === "view" || menu === "print")) return;
    if (!month || !year) { setCurrent(null); return; }
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
            String(d?.district || "").trim().toLowerCase() === String(user?.district || "").trim().toLowerCase() &&
            String(d?.institution || "").trim().toLowerCase() === String(user?.institution || "").trim().toLowerCase() &&
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
        <video src="/intro.mp4" autoPlay onEnded={() => setShowVideo(false)} className="w-full max-w-4xl" controls />
        <button className="mt-4 px-6 py-2 bg-gray-200 rounded hover:bg-gray-300 font-medium" onClick={() => setShowVideo(false)}>
          Skip Video
        </button>
      </div>
    );
  }

  const viewerInstitution = userRole === "DOC" ? undefined : (user?.institution || "");

  return (
    <div className="min-h-screen bg-gray-100 pt-[80px]">
      <div className="no-print">
        <MenuBar
          user={user}
          userRole={userRole}
          active={menu}
          onMenu={(key) => { setMenu(key); if (!key.startsWith("view")) setCurrent(null); }}
          onLogout={() => { setUser(null); localStorage.removeItem("user"); setMenu(""); setCurrent(null); }}
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
    onOpenExisting={(rep) => { setCurrent(rep); setMenu("view"); }} // <-- add this
  />
)}
{menu === "connected-links" && (
  <ConnectedLinks user={user} />
)}


        {/* View / Edit */}
        {menu === "view" && (
          <div className="p-4 font-serif text-[12pt]">
            <div className="flex justify-center gap-4 mb-4">
              <select className="border p-2 rounded" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
              <select className="border p-2 rounded" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>

            {/* Reports list & selection */}
            <ReportsList
              filterMonth={month}
              filterYear={year}
              filterDistrict={user?.district}
              filterInstitution={viewerInstitution}
              onSelect={(report) => setCurrent(report || null)}
            />

            {/* Selection status */}
            <div className="text-center mt-4 text-sm text-black no-print">
              {currentReport
                ? `✅ Selected: ${currentReport.institution}, ${currentReport.month} ${currentReport.year}`
                : "❌ No report selected"}
            </div>

            {/* Single detail view — keyed so it remounts on selection change */}
            {currentReport && (
              <ViewReports
                key={`${currentReport.district}|${currentReport.institution}|${currentReport.month}|${currentReport.year}`}
                reportData={currentReport}
                month={currentReport.month}
                year={currentReport.year}
              />
            )}
          </div>
        )}

        {/* District → Institution-wise (table) */}
        {menu === "district-institutions" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            {userRole === "DOC" && (
              <div className="no-print flex flex-wrap items-center justify-center gap-3 mb-4">
                <button
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    if (!month || !year) return alert("Select Month & Year first.");
                    const q = new URLSearchParams({ district: selectedDistrict, month, year }).toString();
                    try {
                      const res = await fetch(`${API_BASE}/api/district-institution-report?` + q);
                      const json = await res.json().catch(() => ({}));
                      if (json?.institutionData) setInstitutionData(json.institutionData);
                      if (json?.districtPerformance) setDistrictPerformance(json.districtPerformance);
                    } catch {}
                  }}
                  disabled={!month || !year}
                >
                  ⬇️ Refresh Institution-wise
                </button>
                <button
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setMenu("district-dl-ebvc")}
                  disabled={!month || !year}
                >
                  ⬇️ Eye Bank & Vision Center
                </button>
              </div>
            )}
            {month && year ? (
              <ViewInstitutionWiseReport
                questions={qDefs.map((q) => q.label)}
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

        {/* Submenus */}
        {menu === "district-dl-inst" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
            <div className="text-center mt-3 text-sm text-gray-600">
              Select month & year, then click download from the District Institutions tab.
            </div>
          </>
        )}

        {menu === "district-dl-ebvc" && (
          <>
            <MonthYearSelector month={month} year={year} setMonth={setMonth} setYear={setYear} />
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
              <ViewDistrictTables user={user} month={month} year={year} />
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
                {MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
              <select className="border p-2 rounded" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>

            {userRole !== "DOC" && currentReport && (
              <>
                <button className="no-print mb-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handlePrintA4}>
                  🖨️ Print (A4 portrait)
                </button>
                <ViewReports
                  key={`${currentReport.district}|${currentReport.institution}|${currentReport.month}|${currentReport.year}`}
                  reportData={currentReport}
                  month={currentReport.month}
                  year={currentReport.year}
                />
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
                    questions={qDefs.map((q) => q.label)}
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
      </div>
    </div>
  );
}

export default App;
