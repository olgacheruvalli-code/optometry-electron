import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import sections from "../data/questions";
import EyeBankTable from "./EyeBankTable";
import VisionCenterTable from "./VisionCenterTable";
import { updateReportById } from "../utils/apiFallback";

/* Local months list for the dropdown */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* Flatten questions from sections into [{id,label}, ...] */
function orderedQuestions(allSections) {
  const out = [];
  const seen = new Set();

  const pushQs = (arr=[]) => {
    for (const q of arr) {
      let id = String(q?.id || q?.key || "").trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, label: q?.label || q?.title || id });
    }
  };

  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node.questions)) pushQs(node.questions);
    if (Array.isArray(node.rows))      pushQs(node.rows);
    if (Array.isArray(node.subsections)) node.subsections.forEach(walk);
  };

  (allSections || []).forEach(walk);
  return out;
}

export default function EditReport({ user }) {
  const [district, setDistrict] = useState(user?.district || "");
  const [institution, setInstitution] = useState(user?.institution || "");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState({});
  const [eyeBank, setEyeBank] = useState([]);
  const [visionCenter, setVisionCenter] = useState([]);

  const qDefs = useMemo(() => orderedQuestions(sections), []);

  // load the selected report
  useEffect(() => {
    setReport(null);
    setAnswers({});
    setEyeBank([]);
    setVisionCenter([]);

    if (!district || !institution || !month || !year) return;

    (async () => {
      const qs =
        `district=${encodeURIComponent(district)}` +
        `&institution=${encodeURIComponent(institution)}` +
        `&month=${encodeURIComponent(month)}` +
        `&year=${encodeURIComponent(year)}`;
      try {
        const r = await fetch(`${API_BASE}/api/reports?${qs}`);
        const j = await r.json().catch(() => ({}));
        const list = Array.isArray(j?.docs) ? j.docs : Array.isArray(j) ? j : [];
        // pick the most recently updated if multiple
        list.sort((a,b) => new Date(b?.updatedAt||b?.createdAt||0) - new Date(a?.updatedAt||a?.createdAt||0));
        const picked = list[0] || null;
        setReport(picked);
        setAnswers(picked?.answers || {});
        setEyeBank(Array.isArray(picked?.eyeBank) ? picked.eyeBank : []);
        setVisionCenter(Array.isArray(picked?.visionCenter) ? picked.visionCenter : []);
      } catch (e) {
        console.error("load report failed", e);
      }
    })();
  }, [district, institution, month, year]);

  const tryUnlock = () => {
    const envPwd = (process.env.REACT_APP_EDIT_PASSWORD || "").trim();
    const ok = (password.trim() === envPwd) || (password.trim() === "amma1970");
    setUnlocked(ok);
    if (!ok) alert("Wrong password.");
  };

  const save = async () => {
    if (!unlocked) return alert("Unlock first.");
    if (!report?._id) return alert("No report loaded.");
    try {
      const payload = {
        answers,
        eyeBank,
        visionCenter,
        month,
        year
      };
      // robust: tries multiple endpoints under the hood
      const j = await updateReportById(report._id, payload);
      if (j?.ok === false) {
        console.error("update failed", j);
        alert(`Failed to update report. ${JSON.stringify(j)}`);
        return;
      }
      alert("✅ Saved changes.");
    } catch (e) {
      console.error("save error", e);
      alert("❌ Save failed.");
    }
  };

  const setAns = (id, val) => setAnswers((a) => ({ ...a, [id]: val }));
  const handleTableChange = (setFn) => (rowIdx, key, value) => {
    setFn((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [key]: value };
      return updated;
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow font-serif">
      <h2 className="text-2xl font-bold text-[#134074] mb-4">Edit Saved Report</h2>

      {/* selectors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <select className="border p-2 rounded" value={district} onChange={(e)=>setDistrict(e.target.value)}>
          <option value="">District</option>
          <option value="Kozhikode">Kozhikode</option>
          {/* add others if needed */}
        </select>
        <input className="border p-2 rounded" value={institution} onChange={(e)=>setInstitution(e.target.value)} placeholder="Institution" />
        <select className="border p-2 rounded" value={month} onChange={(e)=>setMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m)=> (<option key={m} value={m}>{m}</option>))}
        </select>
        <select className="border p-2 rounded" value={year} onChange={(e)=>setYear(e.target.value)}>
          <option value="">Year</option>
          {Array.from({length:6}, (_,i)=>2024+i).map((y)=>(<option key={y} value={y}>{y}</option>))}
        </select>
      </div>

      {/* unlock */}
      <div className="flex gap-2 items-center mb-4">
        <input
          type="password"
          className="border p-2 rounded flex-1"
          placeholder="Enter Edit Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        <button onClick={tryUnlock} className="px-4 py-2 bg-blue-600 text-white rounded">Unlock</button>
        <button onClick={()=>{ setUnlocked(false); setPassword(""); }} className="px-4 py-2 bg-gray-300 rounded">Clear / Change</button>
      </div>

      {/* Quick edit grid */}
      <div className="border rounded mb-8 overflow-x-auto">
        <div className="px-4 py-2 font-semibold bg-gray-50 border-b">
          Quick Edit — All Questions (q1..q{qDefs.length})
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">Key</th>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-left">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {qDefs.map((q) => (
              <tr key={q.id}>
                <td className="p-2">{q.id}</td>
                <td className="p-2">
                  <input
                    className="w-28 border p-1 rounded"
                    disabled={!unlocked}
                    value={answers[q.id]?.month ?? ""}
                    onChange={(e)=> setAns(q.id, { ...(answers[q.id]||{}), month: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-28 border p-1 rounded"
                    disabled={!unlocked}
                    value={answers[q.id]?.cumulative ?? ""}
                    onChange={(e)=> setAns(q.id, { ...(answers[q.id]||{}), cumulative: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Eye Bank + Vision Center */}
      <div className="mb-10">
        <h4 className="text-lg font-bold text-[#017d8a] mb-3">III. EYE BANK PERFORMANCE</h4>
        <EyeBankTable
          data={eyeBank}
          onChange={handleTableChange(setEyeBank)}
          disabled={!unlocked}
        />
      </div>

      <div className="mb-10">
        <h4 className="text-lg font-bold text-[#017d8a] mb-3">V. VISION CENTER</h4>
        <VisionCenterTable
          data={visionCenter}
          onChange={handleTableChange(setVisionCenter)}
          disabled={!unlocked}
        />
      </div>

      <div className="text-right">
        <button
          onClick={save}
          disabled={!unlocked || !report?._id}
          className={`px-6 py-2 rounded text-white ${(!unlocked || !report?._id) ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
