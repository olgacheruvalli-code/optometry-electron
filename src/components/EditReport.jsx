// ./components/EditReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import sections from "../data/questions";

/* ------------------------------ Config ------------------------------ */
// Change this to your real admin password (kept on frontend by request).
const ADMIN_PASS = "451970";

/* --------------------------- Month constants ------------------------ */
const MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];

/* --------------------------- Helpers -------------------------------- */
const norm = (s) => String(s || "").trim().toLowerCase();
const eq   = (a, b) => norm(a) === norm(b);

const getQs = (blk) =>
  Array.isArray(blk?.questions) ? blk.questions
  : Array.isArray(blk?.rows) ? blk.rows
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
  buildFlatRows(secs).filter((r) => r.kind === "q").map((r) => r.row);

/* ==================================================================== */

export default function EditReport({ user }) {
  const [district, setDistrict] = useState(user?.district || "");
  const [institution, setInstitution] = useState(user?.institution || "");
  const [month, setMonth] = useState("April");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const Q_ROWS = useMemo(() => orderedQuestions(sections), []);
  const KEYS   = useMemo(() => Array.from({ length: Q_ROWS.length }, (_, i) => `q${i + 1}`), [Q_ROWS.length]);

  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState(null);

  // admin gate
  const [pwd, setPwd] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // editable fields: month answers + (optional) cumulative
  const [answers, setAnswers] = useState(() => KEYS.reduce((a, k) => ((a[k] = 0), a), {}));
  const [cumulative, setCumulative] = useState(() => KEYS.reduce((a, k) => ((a[k] = 0), a), {}));

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
          eq(d?.month, month) &&
          String(d?.year || "") === String(year)
      );
      mine.sort(
        (a, b) =>
          new Date(b?.updatedAt || b?.createdAt || 0) -
          new Date(a?.updatedAt || a?.createdAt || 0)
      );
      const chosen = mine[0] || null;
      setDoc(chosen);

      const a = chosen?.answers || {};
      const c = chosen?.cumulative || {};

      const ans = {};
      const cum = {};
      KEYS.forEach((k) => {
        ans[k] = Number(a[k] ?? 0) || 0;
        cum[k] = Number(c[k] ?? 0) || 0;
      });
      setAnswers(ans);
      setCumulative(cum);
    } catch (e) {
      console.error("fetchSelected failed:", e);
      alert("Could not fetch the selected report.");
      setDoc(null);
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
        answers,    // numbers are OK; backend also accepts strings
        cumulative, // optional; viewers have client fallback
      };

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
      <h2 className="text-2xl font-bold text-[#134074] mb-4">Edit Saved Report (Admin)</h2>

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
              <option key={m} value={m}>{m}</option>
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
              className={`px-3 py-2 rounded text-white ${unlocked ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}
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
          className={`px-4 py-2 rounded text-white ${unlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 cursor-not-allowed"}`}
          disabled={loading || !unlocked}
          title={unlocked ? "" : "Unlock with admin password to save"}
        >
          Save as Latest
        </button>
        {doc && (
          <span className="text-sm text-gray-600">
            Loaded: {doc.institution}, {doc.month} {doc.year}{" "}
            {doc.updatedAt ? `(updated ${new Date(doc.updatedAt).toLocaleString()})` : ""}
          </span>
        )}
      </div>

      {/* Quick edit grid with REAL question labels */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="px-4 py-2 border-b font-semibold">
          Quick Edit — All Questions ({KEYS.length} items)
        </div>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-7 border p-2 font-semibold bg-gray-50">Description</div>
          <div className="col-span-2 border p-2 font-semibold bg-gray-50 text-right">Month</div>
          <div className="col-span-3 border p-2 font-semibold bg-gray-50 text-right">Cumulative</div>

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

                <div className="col-span-2 border p-2">
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-right"
                    value={answers[k]}
                    onChange={(e) => handleChange(k, e.target.value, setAnswers)}
                    disabled={!unlocked}
                  />
                </div>

                <div className="col-span-3 border p-2">
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-right"
                    value={cumulative[k]}
                    onChange={(e) => handleChange(k, e.target.value, setCumulative)}
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
          🔒 Enter the admin password and click <b>Unlock</b> to enable editing and saving.
        </div>
      )}
    </div>
  );
}
