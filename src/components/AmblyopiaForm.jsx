// src/components/AmblyopiaForm.jsx
import React, { useState } from "react";

export default function AmblyopiaForm({ user }) {
  const [form, setForm] = useState({
    patientId: "",
    age: "",
    sex: "",
    unaidedRE: "",
    unaidedLE: "",
    bcvaRE: "",
    bcvaLE: "",
    type: "",
    degree: "",
    treatment: "",
    outcome: "",
    remarks: "",
  });

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/amblyopia-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          district: user?.district || "",
          institution: user?.institution || "",
          examiner: user?.username || "",
          date: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.ok) alert("✅ Record saved successfully");
      else alert("⚠️ Failed to save record");
    } catch (e) {
      console.error(e);
      alert("❌ Network or server error");
    }
  };

  return (
    <div className="a4-wrapper bg-white p-6 rounded-xl shadow-md font-serif">
      <h2 className="text-2xl font-bold text-center text-[#134074] mb-6 uppercase">
        Amblyopia – Research / Deep Study
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {[
          ["Patient ID", "patientId"],
          ["Age", "age"],
          ["Sex", "sex"],
          ["Unaided VA (RE)", "unaidedRE"],
          ["Unaided VA (LE)", "unaidedLE"],
          ["Best Corrected VA (RE)", "bcvaRE"],
          ["Best Corrected VA (LE)", "bcvaLE"],
          ["Type of Amblyopia", "type"],
          ["Degree of Amblyopia", "degree"],
          ["Treatment Given", "treatment"],
          ["Outcome", "outcome"],
        ].map(([label, key]) => (
          <React.Fragment key={key}>
            <label className="font-semibold">{label}</label>
            {["sex", "type", "degree", "outcome"].includes(key) ? (
              <select
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="border p-2 rounded"
              >
                <option value="">Select</option>
                {key === "sex" && ["Male", "Female", "Other"].map((v) => <option key={v}>{v}</option>)}
                {key === "type" &&
                  ["Refractive", "Strabismic", "Anisometropic", "Deprivation", "Mixed"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                {key === "degree" && ["Mild", "Moderate", "Severe"].map((v) => <option key={v}>{v}</option>)}
                {key === "outcome" && ["Improved", "Stable", "No improvement"].map((v) => <option key={v}>{v}</option>)}
              </select>
            ) : (
              <input
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="border p-2 rounded"
              />
            )}
          </React.Fragment>
        ))}

        <label className="font-semibold col-span-2">Remarks</label>
        <textarea
          value={form.remarks}
          onChange={(e) => handleChange("remarks", e.target.value)}
          className="border p-2 rounded col-span-2"
          rows={3}
        ></textarea>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={handleSubmit}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg"
        >
          Save Record
        </button>
      </div>
    </div>
  );
}
