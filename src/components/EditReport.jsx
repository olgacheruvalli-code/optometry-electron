// src/components/EditReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { districtInstitutions } from "../data/districtInstitutions";
import { sections } from "../data/questions";
import QuestionInput from "./QuestionInput";
import EyeBankTable from "./EyeBankTable";
import VisionCenterTable from "./VisionCenterTable";
import API_BASE from "../apiBase";

const MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March"
];
const YEARS = Array.from({ length: 10 }, (_, i) => `${2020 + i}`);

// Build a full q1..q84 object, falling back to backup and then "0"
function build84(current, backup) {
  const out = {};
  for (let i = 1; i <= 84; i++) {
    const k = `q${i}`;
    const v =
      (current && current[k] != null ? current[k] : null) ??
      (backup && backup[k] != null ? backup[k] : null) ??
      "0";
    out[k] = String(v);
  }
  return out;
}

// Try to pull array of reports from any server shape
function coerceArray(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.docs)) return json.docs;
  if (json.doc) return [json.doc];
  if (json.docs && typeof json.docs === "object") return Object.values(json.docs);
  return [];
}

// Pick latest by updatedAt/createdAt
function pickLatest(arr) {
  return arr
    .slice()
    .sort(
      (a, b) =>
        new Date(b?.updatedAt || b?.createdAt || 0) -
        new Date(a?.updatedAt || a?.createdAt || 0)
    )[0];
}

export default function EditReport({ user }) {
  const [district, setDistrict] = useState("");
  const [institution, setInstitution] = useState("");
  const [month, setMonth] = useState("April");
  const [year, setYear] = useState("2025");

  const [reportId, setReportId] = useState(null);

  // canonical originals from DB
  const [originalAnswers, setOriginalAnswers] = useState({});
  const [originalCumulative, setOriginalCumulative] = useState({});
  const [eyeBank, setEyeBank] = useState([]);
  const [visionCenter, setVisionCenter] = useState([]);

  // editable working copies (prefilled)
  const [answers, setAnswers] = useState({});
  const [cumulative, setCumulative] = useState({});

  // edit gate (simple local unlock)
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [status, setStatus] = useState("");

  // Institution options for selected district
  const instOptions = useMemo(
    () => (district ? districtInstitutions[district] || [] : []),
    [district]
  );

  // Load saved report whenever the selection changes
  useEffect(() => {
    let cancelled = false;
    if (!district || !institution || !month || !year) {
      // reset everything if selection incomplete
      setReportId(null);
      setOriginalAnswers({});
      setOriginalCumulative({});
      setAnswers({});
      setCumulative({});
      setEyeBank([]);
      setVisionCenter([]);
      setStatus("");
      return;
    }

    (async () => {
      try {
        const url =
          `${API_BASE}/api/reports?` +
          `district=${encodeURIComponent(district)}` +
          `&institution=${encodeURIComponent(institution)}` +
          `&month=${encodeURIComponent(month)}` +
          `&year=${encodeURIComponent(year)}`;

        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        const items = coerceArray(json);

        // strict match again in case server returned broader set
        const strict = items.filter(
          (d) =>
            String(d?.district || "").trim().toLowerCase() ===
              String(district).trim().toLowerCase() &&
            String(d?.institution || "").trim().toLowerCase() ===
              String(institution).trim().toLowerCase() &&
            String(d?.month || "").trim().toLowerCase() ===
              String(month).trim().toLowerCase() &&
            String(d?.year || "") === String(year)
        );

        const found = pickLatest(strict.length ? strict : items);

        if (cancelled) return;

        if (found) {
          const id = found._id || found.id || null;

          const oa = found.answers || {};
          const oc = found.cumulative || {};

          // Prefill edit buffers with saved values (so inputs show values immediately)
          const filledAns = build84(oa, {});
          const filledCum = build84(oc, {});

          setReportId(id);
          setOriginalAnswers(oa);
          setOriginalCumulative(oc);
          setAnswers(filledAns);
          setCumulative(filledCum);
          setEyeBank(Array.isArray(found.eyeBank) ? found.eyeBank : []);
          setVisionCenter(Array.isArray(found.visionCenter) ? found.visionCenter : []);
          setStatus("✅ Report loaded.");
        } else {
          setReportId(null);
          setOriginalAnswers({});
          setOriginalCumulative({});
          setAnswers(build84({}, {}));
          setCumulative(build84({}, {}));
          setEyeBank([]);
          setVisionCenter([]);
          setStatus("❌ No report found for this selection.");
        }
      } catch (e) {
        console.error("Edit load failed:", e);
        if (!cancelled) setStatus("❌ Could not load report.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [district, institution, month, year]);

  const handleUnlock = () => {
    // simple fixed password; change if you later wire to server
    if (password === "1234") {
      setIsUnlocked(true);
      setStatus("🔓 Unlocked. You can edit now.");
    } else {
      setIsUnlocked(false);
      setStatus("🔒 Wrong password.");
    }
  };

  const handleClearPassword = () => {
    setPassword("");
    setIsUnlocked(false);
    setStatus("🔒 Locked. Enter password to edit.");
  };

  const handleSave = async () => {
    if (!reportId) {
      setStatus("❌ No report loaded to update.");
      return;
    }
    if (!isUnlocked) {
      setStatus("🔒 Locked. Unlock to save.");
      return;
    }

    const payload = {
      district,
      institution,
      month,
      year,
      answers: build84(answers, originalAnswers),
      cumulative: build84(cumulative, originalCumulative),
      eyeBank,
      visionCenter,
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("✅ Report updated.");
      } else {
        const t = await res.text().catch(() => "");
        setStatus(`❌ Failed to update report. ${t || ""}`);
      }
    } catch (e) {
      console.error("Save failed:", e);
      setStatus("❌ Network error while saving.");
    }
  };

  // Quick list q1..q84
  const qKeys = useMemo(() => Array.from({ length: 84 }, (_, i) => `q${i + 1}`), []);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Edit Saved Report</h2>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block font-medium">District</label>
          <select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setInstitution("");
            }}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Select District</option>
            {Object.keys(districtInstitutions).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Institution</label>
          <select
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            disabled={!district}
            className="border rounded px-3 py-2 w-full disabled:opacity-50"
          >
            <option value="">Select Institution</option>
            {instOptions.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unlock row */}
      <div className="flex items-end gap-2 mb-2">
        <div className="flex-1">
          <label className="block font-medium">Enter Edit Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <button
          onClick={handleUnlock}
          className="px-4 py-2 h-[40px] bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Unlock
        </button>
        <button
          onClick={handleClearPassword}
          className="px-4 py-2 h-[40px] bg-gray-100 rounded hover:bg-gray-200"
        >
          Clear / Change
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="mb-4 text-gray-700">
          {status}
        </div>
      )}

      {/* Quick Edit table */}
      <div className="border rounded mb-6 overflow-auto">
        <div className="px-4 py-2 font-semibold">Quick Edit — All Questions (q1..q84)</div>
        <table className="min-w-full border-t">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left w-24">Key</th>
              <th className="border px-2 py-1 text-center">Month</th>
              <th className="border px-2 py-1 text-center">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {qKeys.map((k) => (
              <tr key={k}>
                <td className="border px-2 py-1">{k}</td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={!isUnlocked}
                    value={answers[k] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [k]: e.target.value.replace(/[^0-9]/g, "") }))
                    }
                    className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={!isUnlocked}
                    value={cumulative[k] ?? ""}
                    onChange={(e) =>
                      setCumulative((prev) => ({ ...prev, [k]: e.target.value.replace(/[^0-9]/g, "") }))
                    }
                    className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full sectioned editor (optional, stays collapsed in your UI style) */}
      {sections.map((sec, i) => (
        <div key={i} className="border rounded p-4 mb-4">
          <h3 className="font-semibold text-lg mb-2">{sec.title}</h3>
          {sec.questions?.map((q) => (
            <div key={q.key} className="mb-2">
              <QuestionInput
                q={q}
                value={answers[q.key] || ""}
                onChange={(val) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: val }))
                }
                disabled={!isUnlocked}
              />
            </div>
          ))}

          {sec.table === "eyeBank" && (
            <EyeBankTable data={eyeBank} onChange={setEyeBank} disabled={!isUnlocked} />
          )}
          {sec.table === "visionCenter" && (
            <VisionCenterTable data={visionCenter} onChange={setVisionCenter} disabled={!isUnlocked} />
          )}
        </div>
      ))}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="bg-emerald-600 text-white px-5 py-2 rounded hover:bg-emerald-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
