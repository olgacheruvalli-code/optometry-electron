// src/components/ReportEntryForm.jsx
import React, { useState } from "react";
import sections from "../data/questions";
import { EyeBankTable } from "./EyeBankTable";
import VisionCenterTable from "./VisionCenterTable";

const questionSections = sections.filter(s => !s.table);

export default function ReportEntryForm({ user }) {
  const [month, setMonth] = useState("");
  const [answers, setAnswers] = useState({});

  const eyeBankTemplate = sections.find(s => s.title.includes("EYE BANK")).rows.map(() => ({}));
  const visionCenterTemplate = sections.find(s => s.title.includes("VISION CENTER")).rows.map(() => ({}));

  const [eyeBank, setEyeBank] = useState(eyeBankTemplate);
  const [visionCenter, setVisionCenter] = useState(visionCenterTemplate);

  const handleChange = (id, value) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value === "" ? "" : Number(value),
    }));
  };

  const handleEyeBankChange = (rowIdx, key, value) => {
    const updated = [...eyeBank];
    updated[rowIdx][key] = value;
    setEyeBank(updated);
  };

  const handleVisionChange = (rowIdx, key, value) => {
    const updated = [...visionCenter];
    updated[rowIdx][key] = value;
    setVisionCenter(updated);
  };

  const questions = [];
  questionSections.forEach(sec => {
    (sec.questions || []).forEach(q => {
      questions.push({ id: q.id, label: q.label });
    });
    (sec.subsections || []).forEach(sub => {
      sub.questions.forEach(q => {
        questions.push({ id: q.id, label: q.label });
      });
    });
  });

  const handleSave = () => {
    console.log("Saving report:", {
      user,
      month,
      answers,
      eyeBank,
      visionCenter
    });
    alert("Saved to console (replace with API call as needed)");
  };

  return (
    <div className="p-6 bg-white rounded shadow font-serif">
      <h2 className="text-xl font-bold mb-4 text-[#134074]">
        Report Entry for {user.institution}, {user.district}
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <table className="w-full table-auto mb-6 border-collapse">
        <thead>
          <tr className="bg-gray-200 text-[#134074]">
            <th className="border px-2 py-1">SL No</th>
            <th className="border px-2 py-1">Description</th>
            <th className="border px-2 py-1">This Month</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(({ id, label }, index) => {
            let value = answers[id];
            if (typeof value === "object") value = "";
            if (typeof value !== "number" && value !== "") value = "";

            return (
              <tr key={id} className={label.startsWith("↳") ? "bg-gray-50" : ""}>
                <td className="border px-2 py-1 text-center">{index + 1}</td>
                <td className="border px-2 py-1 pl-2">{label}</td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => handleChange(id, e.target.value)}
                    className="w-24 border p-1 text-right"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h4 className="text-lg font-bold text-[#017d8a] mt-6 mb-2">III. EYE BANK PERFORMANCE</h4>
      <EyeBankTable
        data={eyeBank}
        onChange={handleEyeBankChange}
      />

      <h4 className="text-lg font-bold text-[#017d8a] mt-6 mb-2">V. VISION CENTER</h4>
      <VisionCenterTable
        data={visionCenter}
        onChange={handleVisionChange}
      />

      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-4 py-2 rounded mt-6"
      >
        Save
      </button>
    </div>
  );
} // End of ReportEntryForm.jsx
