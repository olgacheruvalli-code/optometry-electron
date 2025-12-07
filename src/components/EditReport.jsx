// ./components/EditReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import sections from "../data/questions";
import EyeBankTable from "./EyeBankTable";
import VisionCenterTable from "./VisionCenterTable";

/* ------------------------------ Config ------------------------------ */
// Change this to your real admin password (kept on frontend by request).
const ADMIN_PASS = "451970";

/* --------------------------- Month constants ------------------------ */
const MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

/* --------------------------- Helpers -------------------------------- */
const norm = (s) => String(s || "").trim().toLowerCase();
const eq = (a, b) => norm(a) === norm(b);

/* normalize month labels like "sept" → "September" */
const normMonth = (m) => {
  if (!m) return m;
  const s = String(m).trim().toLowerCase();
  const map = {
    january: "January",
    jan: "January",
    february: "February",
    feb: "February",
    march: "March",
    mar: "March",
    april: "April",
    apr: "April",
    may: "May",
    june: "June",
    jun: "June",
    july: "July",
    jul: "July",
    august: "August",
    aug: "August",
    september: "September",
    sep: "September",
    sept: "September",
    october: "October",
    oct: "October",
    november: "November",
    nov: "November",
    december: "December",
    dec: "December",
  };
  return map[s] || m;
};

/* ---------------------- Question flattening ------------------------- */
const getQs = (blk) =>
  Array.isArray(blk?.questions)
    ? blk.questions
    : Array.isArray(blk?.rows)
    ? blk.rows
    : [];

function buildFlatRows(secs) {
  const out = [];
  for (const sec of secs || []) {
    for (const q of getQs(sec)) out.push({ kind: "q", row: q });
    if (Array.isArray(sec?.subsections)) {
      for (const sub of sec.subsections) {
        for (const q of getQs(sub)) out.push({ kind: "q", row: q });
      }
    }
  }
  return out;
}

const orderedQuestions = (secs) =>
  buildFlatRows(secs)
    .filter((r) => r.kind === "q")
    .map((r) => r.row);

/* ---------- generic table utils (safe for legacy shapes) ---------- */
const normalizeTextNameFields = (rows) =>
  Array.isArray(rows)
    ? rows.map((row) => {
        const out = { ...(row || {}) };
        for (const k of Object.keys(out)) {
          if (
            /name|centre|center|institution/i.test(k) &&
            (out[k] === 0 || out[k] === "0")
          ) {
            out[k] = "";
          }
        }
        return out;
      })
    : [];

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

const someRowHasValues = (arr) =>
  Array.isArray(arr) &&
  arr.some((row) =>
    Object.values(row || {}).some((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    })
  );

/* ---------- Vision Center normalize (in/out) ---------- */
const vcNormalizeIn = (rows = []) =>
  normalizeTextNameFields(rows).map((r) => {
    const out = { ...r };

    out.institution =
      r.institution ||
      r.institutionName ||
      r["Name of Institution"] ||
      r.nameOfInstitution ||
      "";

    out.visionCenter =
      r.visionCenter ||
      r.visionCentre ||
      r["Name of Vision Centre"] ||
      r.nameOfVisionCentre ||
      r.name ||
      "";

    out.examined =
      r.examined ??
      r.patientsExamined ??
      r.patients ??
      r["No of patients examined"] ??
      r.noPatientsExamined ??
      0;

    out.cataract =
      r.cataract ??
      r.cataractCases ??
      r.cataractDetected ??
      r["No of Cataract cases detected"] ??
      r.noCataract ??
      0;

    out.otherDiseases =
      r.otherDiseases ??
      r.otherEyeDiseases ??
      r.others ??
      r["No of other eye diseases"] ??
      r.noOtherDiseases ??
      0;

    out.refractiveErrors =
      r.refractiveErrors ??
      r.refErrors ??
      r.refractive ??
      r["No of Refractive errors"] ??
      r.noRefractiveErrors ??
      0;

    // NEW column supported everywhere
    out.spectacles =
      r.spectacles ??
      r.spectaclesPrescribed ??
      r["No of Spectacles prescribed"] ??
      r["No. of spectacles presribed"] ??
      r.noSpectacles ??
      r.no_of_spectacles ??
      0;

    return out;
  });

const vcNormalizeOut = sanitizeTableArray;

/* ---------- Eye Bank normalize (in/out) ---------- */
const ebNormalizeIn = (rows = []) =>
  normalizeTextNameFields(rows).map((r) => ({
    status:
      r.status || r.Status || r.type || r.Type || r.name || r.Name || "",
    eyesCollected:
      Number(
        r.eyesCollected ??
          r["No of Eyes collected during the month"] ??
          r.collected_eb ??
          r.ecc_collected ??
          0
      ) || 0,
    utilizedForKeratoplasty:
      Number(
        r.utilizedForKeratoplasty ??
          r["No of Eyes utilized for Keratoplasty"] ??
          r.kerato_eb ??
          r.ecc_kerato ??
          0
      ) || 0,
    usedForResearch:
      Number(
        r.usedForResearch ??
          r["No of Eyes used for Research purpose"] ??
          r.research_eb ??
          r.ecc_research ??
          0
      ) || 0,
    distributedToOtherInst:
      Number(
        r.distributedToOtherInst ??
          r["No of Eyes distributed to other Institutions"] ??
          r.distributed_eb ??
          r.ecc_distributed ??
          0
      ) || 0,
    pledgeForms:
      Number(
        r.pledgeForms ??
          r["No of Eye Donation Pledge forms received"] ??
          r.pledge_eb ??
          r.ecc_pledge ??
          0
      ) || 0,
  }));

const ebNormalizeOut = sanitizeTableArray;

/* ---------- Glaucoma / DR block normalization ---------- */
/**
 * Makes the glaucoma / DR block align with ViewReports:
 * - If q36 = 0 but q34 has a value → treat q34 as "Glaucoma screened" (q36).
 * - If glaucoma sub-rows 0 but DR in q38–q40 → move DR to q40–q42, clear q38.
 */
function normalizeGlaucomaDRBlock(src = {}) {
  const out = { ...src };

  const q34Val = Number(out.q34 ?? 0) || 0; // old place for “Screened”
  let gScr = Number(out.q36 ?? 0) || 0; // Glaucoma screened
  const gDet = Number(out.q37 ?? 0) || 0; // Glaucoma detected
  let drScr = Number(out.q38 ?? 0) || 0; // DR screened  (new pattern)
  let drDet = Number(out.q39 ?? 0) || 0; // DR detected  (new pattern)
  let drTrt = Number(out.q40 ?? 0) || 0; // DR treated   (new pattern)

  // 1️⃣ OLD PATTERN: some reports stored “Glaucoma screened” in q34
  if (!gScr && q34Val) {
    out.q36 = q34Val; // show 93 under “↳ Screened”
    gScr = q34Val;
  }

  // 2️⃣ NEW PATTERN: DR values in q38–q40 with glaucoma rows 0
  const isNewPattern =
    gScr === 0 &&
    gDet === 0 &&
    (drScr !== 0 || drDet !== 0 || drTrt !== 0);

  if (isNewPattern) {
    // Glaucoma treated (q38) should not show DR screened
    out.q38 = 0;

    // Move DR to q40–q42
    out.q40 = drScr;
    out.q41 = drDet;
    out.q42 = drTrt;
  }

  return out;
}

/* ==================================================================== */

export default function EditReport({ user }) {
  const [district, setDistrict] = useState(user?.district || "");
  const [institution, setInstitution] = useState(user?.institution || "");
  const [month, setMonth] = useState("April");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const Q_ROWS = useMemo(() => orderedQuestions(sections), []);
  const KEYS = useMemo(
    () => Array.from({ length: Q_ROWS.length }, (_, i) => `q${i + 1}`),
    [Q_ROWS.length]
  );

  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState(null);

  // admin gate
  const [pwd, setPwd] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // editable fields: month answers + (optional) cumulative
  const [answers, setAnswers] = useState(() =>
    KEYS.reduce((a, k) => {
      a[k] = 0;
      return a;
    }, {})
  );
  const [cumulative, setCumulative] = useState(() =>
    KEYS.reduce((a, k) => {
      a[k] = 0;
      return a;
    }, {})
  );

  // NEW: tables state (Eye Bank 2 rows, Vision Center 10 rows)
  const [eyeBank, setEyeBank] = useState([{}, {}]);
  const [visionCenter, setVisionCenter] = useState(
    Array.from({ length: 10 }, () => ({}))
  );

  // Fetch the latest report strictly by (district, institution, month, year)
  const fetchSelected = async () => {
    if (!district || !institution || !month || !year) return;
    setLoading(true);
    try {
      const q =
        `district=${encodeURIComponent(district)}` +
        `&institution=${encodeURIComponent(institution)}` +
        `&month=${encodeURIComponent(month)}` +
        `&year=${encodeURIComponent(year)}`;

      const r = await fetch(`${API_BASE}/api/reports?${q}`);
      const j = await r.json().catch(() => ({}));
      const items = Array.isArray(j?.docs) ? j.docs : Array.isArray(j) ? j : [];

      const mine = items.filter(
        (d) =>
          eq(d?.district, district) &&
          eq(d?.institution, institution) &&
          eq(normMonth(d?.month), normMonth(month)) &&
          String(d?.year || "") === String(year)
      );
      mine.sort(
        (a, b) =>
          new Date(b?.updatedAt || b?.createdAt || 0) -
          new Date(a?.updatedAt || a?.createdAt || 0)
      );
      const chosen = mine[0] || null;
      setDoc(chosen);

      // answers/cumulative with glaucoma/DR normalization
      const aRaw = chosen?.answers || {};
      const cRaw = chosen?.cumulative || {};
      const aNorm = normalizeGlaucomaDRBlock(aRaw);
      const cNorm = normalizeGlaucomaDRBlock(cRaw || {});
      const ans = {};
      const cum = {};
      KEYS.forEach((k) => {
        ans[k] = Number(aNorm[k] ?? 0) || 0;
        cum[k] = Number(cNorm[k] ?? 0) || 0;
      });
      setAnswers(ans);
      setCumulative(cum);

      // tables
      const ebIn = chosen?.eyeBank || chosen?.eyebank || chosen?.eye_bank || [];
      const vcIn =
        chosen?.visionCenter ||
        chosen?.visioncentre ||
        chosen?.vision_centre ||
        [];

      const ebNorm = ebNormalizeIn(ebIn);
      const vcNorm = vcNormalizeIn(vcIn);

      setEyeBank((ebNorm.length ? ebNorm : [{}, {}]).slice(0, 2));
      setVisionCenter(() => {
        const base = vcNorm.slice(0, 10);
        while (base.length < 10) base.push({});
        return base;
      });
    } catch (e) {
      console.error("fetchSelected failed:", e);
      alert("Could not fetch the selected report.");
      setDoc(null);
      setEyeBank([{}, {}]);
      setVisionCenter(Array.from({ length: 10 }, () => ({})));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, institution, month, year]);

  const handleChange = (key, val, setter) => {
    const n = Number(val);
    setter((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  // table change handlers
  const handleEBChange = (rowIdx, key, value) => {
    setEyeBank((prev) => {
      const arr = [...prev];
      arr[rowIdx] = { ...(arr[rowIdx] || {}), [key]: value };
      return arr;
    });
  };
  const handleVCChange = (rowIdx, key, value) => {
    setVisionCenter((prev) => {
      const arr = [...prev];
      arr[rowIdx] = { ...(arr[rowIdx] || {}), [key]: value };
      return arr;
    });
  };

  // ADMIN SAVE: create a new record for same D/I/M/Y so it becomes the latest.
  const saveAsLatest = async () => {
    if (!unlocked) return;
    if (!district || !institution || !month || !year) {
      alert("Pick District, Institution, Month and Year.");
      return;
    }

    try {
      const payload = {
        district,
        institution,
        month,
        year,
        answers, // numbers are OK; backend also accepts strings
        cumulative, // optional; viewers have client fallback
      };

      const ebOut = ebNormalizeOut(eyeBank);
      const vcOut = vcNormalizeOut(visionCenter);
      if (someRowHasValues(ebOut)) payload.eyeBank = ebOut;
      if (someRowHasValues(vcOut)) payload.visionCenter = vcOut;

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
      alert("✅ Saved a new latest version for this month.");
      fetchSelected();
    } catch (e) {
      console.error("Save error:", e);
      alert("❌ Unexpected error during save. See console.");
    }
  };

  const tryUnlock = () => {
    if (pwd === ADMIN_PASS) {
      setUnlocked(true);
      alert("🔓 Admin editing enabled.");
    } else {
      setUnlocked(false);
      alert("❌ Wrong password.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto font-serif p-4">
      <h2 className="text-2xl font-bold text-[#134074] mb-4">
        Edit Saved Report (Admin)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div>
          <label className="text-sm font-semibold">District</label>
          <input
            className="w-full border rounded p-2"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="District"
            disabled={loading || !unlocked}
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Institution</label>
          <input
            className="w-full border rounded p-2"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Institution"
            disabled={loading || !unlocked}
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Month</label>
          <select
            className="w-full border rounded p-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={loading || !unlocked}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold">Year</label>
          <input
            className="w-full border rounded p-2"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2025"
            disabled={loading || !unlocked}
          />
        </div>

        {/* Admin unlock */}
        <div>
          <label className="text-sm font-semibold">Admin Password</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="w-full border rounded p-2"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              disabled={unlocked}
            />
            <button
              onClick={tryUnlock}
              className={`px-3 py-2 rounded text-white ${
                unlocked ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={unlocked}
            >
              {unlocked ? "Unlocked" : "Unlock"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={fetchSelected}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          disabled={loading}
        >
          {loading ? "Loading…" : "Reload"}
        </button>
        <button
          onClick={saveAsLatest}
          className={`px-4 py-2 rounded text-white ${
            unlocked
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={loading || !unlocked}
          title={unlocked ? "" : "Unlock with admin password to save"}
        >
          Save as Latest
        </button>
        {doc && (
          <span className="text-sm text-gray-600">
            Loaded: {doc.institution}, {doc.month} {doc.year}{" "}
            {doc.updatedAt
              ? `(updated ${new Date(doc.updatedAt).toLocaleString()})`
              : ""}
          </span>
        )}
      </div>

      {/* --- Eye Bank table (editable) --- */}
      <div className="mb-10">
        <h4 className="text-lg font-bold text-[#017d8a] mb-3">
          III. EYE BANK — Edit
        </h4>
        <EyeBankTable
          data={eyeBank}
          onChange={handleEBChange}
          disabled={!unlocked}
        />
      </div>

      {/* --- Vision Center table (editable, with Spectacles column) --- */}
      <div className="mb-10">
        <h4 className="text-lg font-bold text-[#017d8a] mb-3">
          V. VISION CENTER — Edit
        </h4>
        <VisionCenterTable
          data={visionCenter}
          onChange={handleVCChange}
          disabled={!unlocked}
          showInstitution={true}
        />
      </div>

      {/* Quick edit grid with REAL question labels */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="px-4 py-2 border-b font-semibold">
          Quick Edit — All Questions ({KEYS.length} items)
        </div>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-7 border p-2 font-semibold bg-gray-50">
            Description
          </div>
          <div className="col-span-2 border p-2 font-semibold bg-gray-50 text-right">
            Month
          </div>
          <div className="col-span-3 border p-2 font-semibold bg-gray-50 text-right">
            Cumulative
          </div>

          {KEYS.map((k, i) => {
            const label =
              Q_ROWS[i]?.label ||
              Q_ROWS[i]?.title ||
              Q_ROWS[i]?.text ||
              Q_ROWS[i]?.name ||
              `Question ${i + 1}`;
            return (
              <React.Fragment key={k}>
                <div className="col-span-7 border p-2">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-gray-500">Key: {k}</div>
                </div>

                {/* Month column – no spinner */}
                <div className="col-span-2 border p-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded p-1 text-right"
                    value={answers[k]}
                    onChange={(e) =>
                      handleChange(k, e.target.value, setAnswers)
                    }
                    disabled={!unlocked}
                  />
                </div>

                {/* Cumulative column – no spinner */}
                <div className="col-span-3 border p-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full border rounded p-1 text-right"
                    value={cumulative[k]}
                    onChange={(e) =>
                      handleChange(k, e.target.value, setCumulative)
                    }
                    disabled={!unlocked}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {!unlocked && (
        <div className="mt-3 text-sm text-yellow-800 bg-yellow-100 border border-yellow-200 rounded px-3 py-2">
          🔒 Enter the admin password and click <b>Unlock</b> to enable editing
          and saving.
        </div>
      )}
    </div>
  );
}
