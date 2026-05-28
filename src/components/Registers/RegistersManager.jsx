// src/components/Registers/RegistersManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import API_BASE from "../../apiBase";
import { Plus, Table, Download, Search, X, Check } from "lucide-react";

const buildRange = (start, end, step, precision = 2) => {
  const arr = [];
  for (let v = start; v <= end + 0.0001; v += step) {
    arr.push(v.toFixed(precision));
  }
  return arr;
};

const SPH_PLUS = ["", "PL",
  ...buildRange(0.25, 10, 0.25),   // 0.25 steps up to 10
  ...buildRange(11, 25, 1)         // 11 → 25 step 1
];

const SPH_MINUS = ["", "PL",
  ...buildRange(0.25, 10, 0.25),   // 0.25 steps up to 10
  ...buildRange(11, 25, 1)         // 11 → 25 step 1
];
const CYL_PLUS = ["", "PL", ...buildRange(0.25, 6, 0.25)];
const CYL_MINUS = ["", "PL", ...buildRange(0.25, 6, 0.25)];
const AXIS_OPTIONS = ["", ...Array.from({ length: 36 }, (_, i) => String(180 - i * 5))];
const VISION_OPTIONS = [
  "", "6/6","6/6P","6/9","6/9P","6/12","6/12P",
  "6/18","6/18P","6/24","6/24P",
  "6/36","6/36P","6/60",
  "CF","CFCF","HM+","PL+","PL-"
];
const NV_ADD_OPTIONS = [
  "", "+0.50","+0.75","+1.00","+1.25","+1.50",
  "+1.75","+2.00","+2.25","+2.50",
  "+2.75","+3.00","+3.25","+3.50",
  "+3.75","+4.00","+4.25","+4.50"
];

const NEAR_VISION_OPTIONS = ["", "N6","N8","N10","N12","N18","N24","N36"];

const splitSigned = (value) => {
  if (!value) return { plus: "", minus: "" };
  const v = value.toString().trim();
  if (!v) return { plus: "", minus: "" };
  if (v.toUpperCase() === "PL" || v.toUpperCase() === "PLANO") return { plus: "PL", minus: "" };
  if (v.startsWith("-")) return { plus: "", minus: v.slice(1) };
  if (v.startsWith("+")) return { plus: v.slice(1), minus: "" };
  return { plus: v, minus: "" };
};

const formatPower = (sph, cyl, axis, add) => {
  const parts = [];
  if (sph) {
    parts.push((sph === "PL" || sph === "Plano" || sph.toUpperCase() === "PL") ? "Plano" : sph);
  }
  if (cyl) {
    parts.push(cyl);
  }
  if (axis) {
    parts.push(`x ${axis}`);
  }
  if (add) {
    parts.push(`[Add: ${add}]`);
  }
  return parts.join(" ") || "—";
};

const renderSelect = (name, value, options, onChange, placeholder, hideArrow = false) => {
  const optionsWithCurrent = [...options];
  if (value && !options.includes(value)) {
    optionsWithCurrent.push(value);
  }
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84] bg-white text-slate-800 ${
        hideArrow ? "appearance-none text-center cursor-pointer px-1.5" : "px-2"
      }`}
    >
      {optionsWithCurrent.map((opt, i) => (
        <option key={`${opt}-${i}`} value={opt}>
          {opt === "" ? placeholder || "Select" : opt}
        </option>
      ))}
    </select>
  );
};

const renderPowerSelect = (name, value, sign, onChange, hideArrow = false) => {
  const { plus, minus } = splitSigned(value);
  const isSph = name.toLowerCase().includes("sph");
  
  const handlePlus = (val) => {
    let newVal = "";
    if (val === "PL") newVal = "PL";
    else if (val) newVal = "+" + val;
    onChange({ target: { name, value: newVal } });
  };

  const handleMinus = (val) => {
    let newVal = "";
    if (val === "PL") newVal = "PL";
    else if (val) newVal = "-" + val;
    onChange({ target: { name, value: newVal } });
  };

  if (sign === "plus") {
    const options = [...(isSph ? SPH_PLUS : CYL_PLUS)];
    if (plus && !options.includes(plus)) {
      options.push(plus);
    }
    return (
      <select
        value={plus}
        onChange={(e) => handlePlus(e.target.value)}
        className={`w-full py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#396b84] ${
          hideArrow ? "appearance-none text-center cursor-pointer px-1.5" : "px-2"
        }`}
      >
        {options.map((opt, i) => (
          <option key={`plus-${opt}-${i}`} value={opt}>
            {opt === "" ? "+" : opt === "PL" ? "PL" : "+" + opt}
          </option>
        ))}
      </select>
    );
  } else {
    const options = [...(isSph ? SPH_MINUS : CYL_MINUS)];
    if (minus && !options.includes(minus)) {
      options.push(minus);
    }
    return (
      <select
        value={minus}
        onChange={(e) => handleMinus(e.target.value)}
        className={`w-full py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#396b84] ${
          hideArrow ? "appearance-none text-center cursor-pointer px-1.5" : "px-2"
        }`}
      >
        {options.map((opt, i) => (
          <option key={`minus-${opt}-${i}`} value={opt}>
            {opt === "" ? "-" : opt === "PL" ? "PL" : "-" + opt}
          </option>
        ))}
      </select>
    );
  }
};

export default function RegistersManager({ user, activeRegister }) {
  // Map activeRegister menu key to register sub-tab key
  const getTabKey = (key) => {
    if (key === "register-blind") return "blind-register";
    if (key === "register-cataract") return "cataract-backlog";
    if (key === "register-old-aged") return "old-aged-spectacles";
    if (key === "register-school") return "school-spectacles";
    return "old-aged-spectacles"; // default fallback
  };

  const [activeTab, setActiveTab] = useState(getTabKey(activeRegister));
  const [viewMode, setViewMode] = useState("table"); // "table" or "form"
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [showCustomDiagnosis, setShowCustomDiagnosis] = useState(false);

  // Form State
  const initialFormState = {
    name: "",
    age: "",
    sex: "Male",
    address: "",
    optometristName: localStorage.getItem("optometristName") || user?.name || user?.username || "",
    optometristPhone: localStorage.getItem("optometristPhone") || "",
    // Blind Register specific
    vaRE: "",
    vaLE: "",
    cause: "",
    treatment: "",
    date: new Date().toISOString().split("T")[0],
    // Cataract Backlog specific
    eyeOperated: "RE",
    detectionDate: new Date().toISOString().split("T")[0],
    referral: "",
    status: "Pending",
    surgeryDate: "",
    // Old Aged / School Spectacles specific
    slNo: "",
    dateOfPrescription: new Date().toISOString().split("T")[0],
    diagnosis: "",
    visionRE_DV: "",
    visionRE_NV: "",
    visionLE_DV: "",
    visionLE_NV: "",
    powerRE_Sph: "",
    powerRE_Cyl: "",
    powerRE_Axis: "",
    powerRE_Add: "",
    powerLE_Sph: "",
    powerLE_Cyl: "",
    powerLE_Axis: "",
    powerLE_Add: "",
    correctedRE_DV: "",
    correctedRE_NV: "",
    correctedLE_DV: "",
    correctedLE_NV: "",
    ipdFrameSize: "",
    reference: "",
    // School specific
    schoolName: "",
    classStandard: "",
    teacherName: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  // Sync state with activeRegister prop from menu selection
  useEffect(() => {
    if (activeRegister) {
      const target = getTabKey(activeRegister);
      setActiveTab(target);
      setViewMode("table");
      setSearchQuery("");
      setEditingId(null);
      setFormData(initialFormState);
      setShowCustomDiagnosis(false);
    }
  }, [activeRegister]);
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = `district=${encodeURIComponent(user?.district || "")}&institution=${encodeURIComponent(user?.institution || "")}`;
      const res = await fetch(`${API_BASE}/api/${activeTab}?${q}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setRecords(data.docs || []);
      } else {
        setRecords([]);
      }
    } catch (e) {
      console.error("Fetch records error:", e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.district) {
      fetchRecords();
    }
  }, [activeTab, user]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "name") {
      finalValue = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  // Show status toast
  const triggerStatus = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      triggerStatus("error", "Patient Name is required!");
      return;
    }

    const payload = {
      ...formData,
      district: user?.district || "",
      institution: user?.institution || "",
      optometrist: user?.username || "",
    };

    setLoading(true);
    try {
      let url = `${API_BASE}/api/${activeTab}`;
      let method = "POST";

      if (editingId) {
        url = `${API_BASE}/api/${activeTab}/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        triggerStatus("success", editingId ? "Record updated successfully!" : "Record added successfully!");
        if (formData.optometristName) {
          localStorage.setItem("optometristName", formData.optometristName);
        }
        if (formData.optometristPhone) {
          localStorage.setItem("optometristPhone", formData.optometristPhone);
        }
        setFormData({
          ...initialFormState,
          optometristName: formData.optometristName || "",
          optometristPhone: formData.optometristPhone || "",
        });
        setShowCustomDiagnosis(false);
        setEditingId(null);
        setViewMode("table");
        fetchRecords();
      } else {
        triggerStatus("error", data.error || "Failed to save record.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      triggerStatus("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Edit
  const handleEdit = (record) => {
    setEditingId(record._id || record.id);
    setFormData({
      ...initialFormState,
      ...record,
    });
    const isStandard = ["Presbiopia", "Hypermetropia", "Myopia", "Astigmatism", ""].includes(record.diagnosis || "");
    setShowCustomDiagnosis(!isStandard);
    setViewMode("form");
  };

  // Trigger Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/${activeTab}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        triggerStatus("success", "Record deleted successfully!");
        fetchRecords();
      } else {
        triggerStatus("error", "Failed to delete record.");
      }
    } catch (e) {
      console.error("Delete error:", e);
      triggerStatus("error", "Error connecting to server.");
    }
  };

  // Filtered records for search
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter((r) => {
      const name = String(r.name || "").toLowerCase();
      const address = String(r.address || "").toLowerCase();
      const school = String(r.schoolName || "").toLowerCase();
      const diagnosis = String(r.diagnosis || "").toLowerCase();
      return name.includes(query) || address.includes(query) || school.includes(query) || diagnosis.includes(query);
    });
  }, [records, searchQuery]);

  // Export Table to Excel
  const handleExportExcel = () => {
    let dataToExport = [];

    filteredRecords.forEach((r, idx) => {
      const common = {
        "Sl No": idx + 1,
        "Patient Name": r.name,
        "Age": r.age,
        "Sex": r.sex,
        "Address/Contact": r.address,
        "District": r.district,
        "Institution": r.institution,
        "Name of optometrist": r.optometristName || r.optometrist || "",
        "Contact Number of optometrist": r.optometristPhone || "",
      };

      if (activeTab === "blind-register") {
        dataToExport.push({
          ...common,
          "Date": r.date,
          "Visual Acuity RE": r.vaRE,
          "Visual Acuity LE": r.vaLE,
          "Cause of Blindness": r.cause,
          "Treatment/Referral": r.treatment,
        });
      } else if (activeTab === "cataract-backlog") {
        dataToExport.push({
          ...common,
          "Detection Date": r.detectionDate,
          "Visual Acuity RE": r.vaRE,
          "Visual Acuity LE": r.vaLE,
          "Eye to be Operated": r.eyeOperated,
          "Referral Location": r.referral,
          "Status": r.status,
          "Surgery Date": r.surgeryDate || "N/A",
        });
      } else if (activeTab === "old-aged-spectacles") {
        dataToExport.push({
          "Sl No": idx + 1,
          "Manual Sl No": r.slNo,
          "Name of Patient": r.name,
          "Date of Prescription": r.dateOfPrescription,
          "Sex": r.sex,
          "Age": r.age,
          "Diagnosis": r.diagnosis,
          "Vision RE DV": r.visionRE_DV,
          "Vision RE NV": r.visionRE_NV,
          "Vision LE DV": r.visionLE_DV,
          "Vision LE NV": r.visionLE_NV,
          "RE SPH": r.powerRE_Sph,
          "RE CYL": r.powerRE_Cyl,
          "RE Axis": r.powerRE_Axis,
          "RE NV Add": r.powerRE_Add,
          "LE SPH": r.powerLE_Sph,
          "LE CYL": r.powerLE_Cyl,
          "LE Axis": r.powerLE_Axis,
          "LE NV Add": r.powerLE_Add,
          "Corrected RE DV": r.correctedRE_DV,
          "Corrected RE NV": r.correctedRE_NV,
          "Corrected LE DV": r.correctedLE_DV,
          "Corrected LE NV": r.correctedLE_NV,
          "IPD/Frame size": r.ipdFrameSize,
          "Contact Details": r.address,
          "District": r.district,
          "Institution": r.institution,
          "Name of optometrist": r.optometristName || r.optometrist || "",
          "Contact Number of optometrist": r.optometristPhone || "",
        });
      } else if (activeTab === "school-spectacles") {
        dataToExport.push({
          "Sl No": idx + 1,
          "Name of Patient": r.name,
          "Date of Prescription": r.dateOfPrescription,
          "Sex": r.sex,
          "Age": r.age,
          "School Name": r.schoolName,
          "Class/Standard": r.classStandard,
          "Teacher Name": r.teacherName,
          "Diagnosis": r.diagnosis,
          "Vision RE DV": r.visionRE_DV,
          "Vision RE NV": r.visionRE_NV,
          "Vision LE DV": r.visionLE_DV,
          "Vision LE NV": r.visionLE_NV,
          "RE SPH": r.powerRE_Sph,
          "RE CYL": r.powerRE_Cyl,
          "RE Axis": r.powerRE_Axis,
          "RE NV Add": r.powerRE_Add,
          "LE SPH": r.powerLE_Sph,
          "LE CYL": r.powerLE_Cyl,
          "LE Axis": r.powerLE_Axis,
          "LE NV Add": r.powerLE_Add,
          "Corrected RE DV": r.correctedRE_DV,
          "Corrected RE NV": r.correctedRE_NV,
          "Corrected LE DV": r.correctedLE_DV,
          "Corrected LE NV": r.correctedLE_NV,
          "IPD/Frame size": r.ipdFrameSize,
          "Contact Details": r.address,
          "District": r.district,
          "Institution": r.institution,
          "Name of optometrist": r.optometristName || r.optometrist || "",
          "Contact Number of optometrist": r.optometristPhone || "",
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetName = activeTab.replace("-", " ").toUpperCase().slice(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${activeTab}_report.xlsx`);
  };

  const tabLabels = {
    "blind-register": "Blind Register",
    "cataract-backlog": "Cataract Backlog",
    "old-aged-spectacles": "Old Aged Spectacles",
    "school-spectacles": "School Children Spectacles",
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen rounded-xl shadow-lg border border-slate-200">
      
      {/* Top Banner Status Toast */}
      {statusMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-2 animate-bounce ${
          statusMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {statusMessage.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {statusMessage.text}
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-3 h-6 bg-[#396b84] rounded-full inline-block"></span>
            Optometry Registers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            District: <span className="font-semibold text-[#016eaa]">{user?.district}</span> &nbsp;|&nbsp; 
            Institution: <span className="font-semibold text-[#016eaa]">{user?.institution}</span>
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-slate-200 p-1 rounded-lg">
          {Object.entries(tabLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setViewMode("table");
                setEditingId(null);
                setFormData(initialFormState);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition ${
                activeTab === key ? "bg-[#396b84] text-white shadow-sm" : "text-slate-700 hover:bg-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle View Options */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode("table");
              setEditingId(null);
              setFormData(initialFormState);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Table className="w-4 h-4" />
            View Records ({filteredRecords.length})
          </button>
          <button
            onClick={() => {
              setViewMode("form");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === "form" ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingId ? "Edit Entry" : "Add New Entry"}
          </button>
        </div>

        {viewMode === "table" && records.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        )}
      </div>

      {/* RENDER TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
          {/* Search bar */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, address, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 italic animate-pulse">Loading records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">No records found. Click "Add New Entry" to log a record!</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className={`text-left text-xs border-collapse ${
                (activeTab === "old-aged-spectacles" || activeTab === "school-spectacles")
                  ? "min-w-[1600px]" 
                  : "w-full"
              }`}>
                <thead>
                  <tr className="bg-slate-800 text-white uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="p-3">Sl No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Age/Sex</th>
                    {activeTab === "school-spectacles" && (
                      <>
                        <th className="p-3">School (Class)</th>
                        <th className="p-3">Teacher</th>
                      </>
                    )}
                    {activeTab === "blind-register" && (
                      <>
                        <th className="p-3">VA (RE/LE)</th>
                        <th className="p-3">Cause</th>
                      </>
                    )}
                    {activeTab === "cataract-backlog" && (
                      <>
                        <th className="p-3">Eye</th>
                        <th className="p-3">Status</th>
                      </>
                    )}
                    {(activeTab === "old-aged-spectacles" || activeTab === "school-spectacles") && (
                      <>
                        <th className="p-3">Date</th>
                        <th className="p-3">Diagnosis</th>
                        <th className="p-3">Vision RE (DV/NV)</th>
                        <th className="p-3">Vision LE (DV/NV)</th>
                        <th className="p-3">RE SPH CYL AXIS NV ADD</th>
                        <th className="p-3">LE SPH CYL AXIS NV ADD</th>
                        <th className="p-3">Corrected RE (DV/NV)</th>
                        <th className="p-3">Corrected LE (DV/NV)</th>
                        <th className="p-3">IPD/Frame size</th>
                      </>
                    )}
                    <th className="p-3">Address/Contact</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Institution</th>
                    <th className="p-3">Optometrist Name</th>
                    <th className="p-3">Optometrist Phone</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRecords.map((r, index) => (
                    <tr key={r._id || r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                      <td className="p-3 whitespace-nowrap">{r.age} Y / {r.sex}</td>
                      {activeTab === "school-spectacles" && (
                        <>
                          <td className="p-3 text-indigo-600 font-semibold whitespace-nowrap">
                            {r.schoolName} {r.classStandard ? `(${r.classStandard})` : ""}
                          </td>
                          <td className="p-3 whitespace-nowrap">{r.teacherName || "—"}</td>
                        </>
                      )}
                      {activeTab === "blind-register" && (
                        <>
                          <td className="p-3 whitespace-nowrap">RE: {r.vaRE || "-"} | LE: {r.vaLE || "-"}</td>
                          <td className="p-3 text-amber-700 font-semibold whitespace-nowrap">{r.cause}</td>
                        </>
                      )}
                      {activeTab === "cataract-backlog" && (
                        <>
                          <td className="p-3 font-bold text-slate-600 whitespace-nowrap">{r.eyeOperated}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              r.status === "Operated" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </>
                      )}
                      {(activeTab === "old-aged-spectacles" || activeTab === "school-spectacles") && (
                        <>
                          <td className="p-3 whitespace-nowrap">{r.dateOfPrescription || "—"}</td>
                          <td className="p-3 text-indigo-700 whitespace-nowrap">{r.diagnosis || "Refractive Error"}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{r.visionRE_DV || "—"} / {r.visionRE_NV || "—"}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{r.visionLE_DV || "—"} / {r.visionLE_NV || "—"}</td>
                          <td className="p-3 font-mono whitespace-nowrap text-[#016eaa]">
                            {formatPower(r.powerRE_Sph, r.powerRE_Cyl, r.powerRE_Axis, r.powerRE_Add)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap text-[#016eaa]">
                            {formatPower(r.powerLE_Sph, r.powerLE_Cyl, r.powerLE_Axis, r.powerLE_Add)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">{r.correctedRE_DV || "—"} / {r.correctedRE_NV || "—"}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{r.correctedLE_DV || "—"} / {r.correctedLE_NV || "—"}</td>
                          <td className="p-3 whitespace-nowrap">{r.ipdFrameSize || "—"}</td>
                        </>
                      )}
                      <td className="p-3 max-w-[200px] truncate text-slate-500" title={r.address}>{r.address || "—"}</td>
                      <td className="p-3 whitespace-nowrap">{r.district || "—"}</td>
                      <td className="p-3 whitespace-nowrap">{r.institution || "—"}</td>
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{r.optometristName || r.optometrist || "—"}</td>
                      <td className="p-3 whitespace-nowrap">{r.optometristPhone || "—"}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(r)}
                            className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r._id || r.id)}
                            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center"
                            title="Delete"
                          >
                            X
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENDER FORM VIEW */}
      {viewMode === "form" && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-bold text-[#134074] border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            {editingId ? "Modify Existing Entry" : `New ${tabLabels[activeTab]} Entry`}
          </h3>

          {/* Form Fields Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            {/* Common Fields */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Patient Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] uppercase"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                placeholder="Enter age"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sex</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* School Children Specific Details */}
            {activeTab === "school-spectacles" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">School Name</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Class / Standard</label>
                  <input
                    type="text"
                    name="classStandard"
                    value={formData.classStandard}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. 5-A, HS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Class Teacher Name</label>
                  <input
                    type="text"
                    name="teacherName"
                    value={formData.teacherName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="Enter teacher's name"
                  />
                </div>
              </>
            )}

            {/* Blind Register Specific */}
            {activeTab === "blind-register" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">VA Right Eye (RE)</label>
                  <input
                    type="text"
                    name="vaRE"
                    value={formData.vaRE}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. 3/60, HM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">VA Left Eye (LE)</label>
                  <input
                    type="text"
                    name="vaLE"
                    value={formData.vaLE}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. 1/60, PL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cause of Blindness</label>
                  <input
                    type="text"
                    name="cause"
                    value={formData.cause}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. Cataract, Glaucoma"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Treatment / Referral Details</label>
                  <input
                    type="text"
                    name="treatment"
                    value={formData.treatment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. Referred to MCH for surgery"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date of Entry</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                  />
                </div>
              </>
            )}

            {/* Cataract Backlog Specific */}
            {activeTab === "cataract-backlog" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">VA Right Eye (RE)</label>
                  <input
                    type="text"
                    name="vaRE"
                    value={formData.vaRE}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="RE vision"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">VA Left Eye (LE)</label>
                  <input
                    type="text"
                    name="vaLE"
                    value={formData.vaLE}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="LE vision"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Eye to be Operated</label>
                  <select
                    name="eyeOperated"
                    value={formData.eyeOperated}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white"
                  >
                    <option value="RE">RE (Right Eye)</option>
                    <option value="LE">LE (Left Eye)</option>
                    <option value="BE">BE (Both Eyes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Detection Date</label>
                  <input
                    type="date"
                    name="detectionDate"
                    value={formData.detectionDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Referral Location</label>
                  <input
                    type="text"
                    name="referral"
                    value={formData.referral}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. DH Vadakara"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Surgical Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Operated">Operated</option>
                  </select>
                </div>
                {formData.status === "Operated" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Surgery Date</label>
                    <input
                      type="date"
                      name="surgeryDate"
                      value={formData.surgeryDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    />
                  </div>
                )}
              </>
            )}

            {/* Spectacles Common Fields (Old Aged / School) */}
            {(activeTab === "old-aged-spectacles" || activeTab === "school-spectacles") && (
              <>
                {activeTab === "old-aged-spectacles" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sl No (Manual Entry)</label>
                    <input
                      type="text"
                      name="slNo"
                      value={formData.slNo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                      placeholder="e.g. 05/Kozh"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date of Prescription</label>
                  <input
                    type="date"
                    name="dateOfPrescription"
                    value={formData.dateOfPrescription}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                  />
                </div>
                <div className={activeTab === "school-spectacles" ? "md:col-span-2" : ""}>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Diagnosis</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      name="diagnosis_select"
                      value={showCustomDiagnosis ? "Other" : formData.diagnosis}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Other") {
                          setShowCustomDiagnosis(true);
                          setFormData(prev => ({ ...prev, diagnosis: "" }));
                        } else {
                          setShowCustomDiagnosis(false);
                          setFormData(prev => ({ ...prev, diagnosis: val }));
                        }
                      }}
                      className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white text-slate-800"
                    >
                      <option value="">Select Diagnosis</option>
                      <option value="Presbiopia">Presbiopia</option>
                      <option value="Hypermetropia">Hypermetropia</option>
                      <option value="Myopia">Myopia</option>
                      <option value="Astigmatism">Astigmatism</option>
                      <option value="Other">Other</option>
                    </select>

                    {/* Custom Diagnosis Text Input (if Other selected) */}
                    {showCustomDiagnosis && (
                      <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, diagnosis: val }));
                        }}
                        className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white text-slate-800"
                        placeholder="Type custom diagnosis"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SPECTACLE POWER AND VISION GRID - FOR OLD AGED & SCHOOL */}
          {(activeTab === "old-aged-spectacles" || activeTab === "school-spectacles") && (
            <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                Spectacle Power & Refraction Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Right Eye (RE) Block */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="text-xs font-bold text-sky-700 border-b border-slate-100 pb-1.5 mb-3 uppercase tracking-wider">
                    Right Eye (RE / OD)
                  </h5>
                                   {/* RE Vision */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision DV</label>
                      {renderSelect("visionRE_DV", formData.visionRE_DV, VISION_OPTIONS, handleChange, "DV", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision NV</label>
                      {renderSelect("visionRE_NV", formData.visionRE_NV, NEAR_VISION_OPTIONS, handleChange, "NV", true)}
                    </div>
                  </div>

                  {/* RE Prescribed Power */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sph (+)</label>
                      {renderPowerSelect("powerRE_Sph", formData.powerRE_Sph, "plus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sph (-)</label>
                      {renderPowerSelect("powerRE_Sph", formData.powerRE_Sph, "minus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cyl (+)</label>
                      {renderPowerSelect("powerRE_Cyl", formData.powerRE_Cyl, "plus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cyl (-)</label>
                      {renderPowerSelect("powerRE_Cyl", formData.powerRE_Cyl, "minus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Axis</label>
                      {renderSelect("powerRE_Axis", formData.powerRE_Axis, AXIS_OPTIONS, handleChange, "AXIS", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">NV Add</label>
                      {renderSelect("powerRE_Add", formData.powerRE_Add, NV_ADD_OPTIONS, handleChange, "ADD", true)}
                    </div>
                  </div>

                  {/* RE Corrected Vision */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected DV</label>
                      {renderSelect("correctedRE_DV", formData.correctedRE_DV, VISION_OPTIONS, handleChange, "DV", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected NV</label>
                      {renderSelect("correctedRE_NV", formData.correctedRE_NV, NEAR_VISION_OPTIONS, handleChange, "NV", true)}
                    </div>
                  </div>
                </div>

                {/* Left Eye (LE) Block */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="text-xs font-bold text-emerald-700 border-b border-slate-100 pb-1.5 mb-3 uppercase tracking-wider">
                    Left Eye (LE / OS)
                  </h5>
                                   {/* LE Vision */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision DV</label>
                      {renderSelect("visionLE_DV", formData.visionLE_DV, VISION_OPTIONS, handleChange, "DV", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision NV</label>
                      {renderSelect("visionLE_NV", formData.visionLE_NV, NEAR_VISION_OPTIONS, handleChange, "NV", true)}
                    </div>
                  </div>

                  {/* LE Prescribed Power */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sph (+)</label>
                      {renderPowerSelect("powerLE_Sph", formData.powerLE_Sph, "plus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sph (-)</label>
                      {renderPowerSelect("powerLE_Sph", formData.powerLE_Sph, "minus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cyl (+)</label>
                      {renderPowerSelect("powerLE_Cyl", formData.powerLE_Cyl, "plus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cyl (-)</label>
                      {renderPowerSelect("powerLE_Cyl", formData.powerLE_Cyl, "minus", handleChange, true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Axis</label>
                      {renderSelect("powerLE_Axis", formData.powerLE_Axis, AXIS_OPTIONS, handleChange, "AXIS", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">NV Add</label>
                      {renderSelect("powerLE_Add", formData.powerLE_Add, NV_ADD_OPTIONS, handleChange, "ADD", true)}
                    </div>
                  </div>

                  {/* LE Corrected Vision */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected DV</label>
                      {renderSelect("correctedLE_DV", formData.correctedLE_DV, VISION_OPTIONS, handleChange, "DV", true)}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected NV</label>
                      {renderSelect("correctedLE_NV", formData.correctedLE_NV, NEAR_VISION_OPTIONS, handleChange, "NV", true)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Spectacle Fields */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">IPD / Frame Size</label>
                  <input type="text" name="ipdFrameSize" value={formData.ipdFrameSize} onChange={handleChange} placeholder="e.g. 62/20" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#396b84]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Reference Details (If any)</label>
                  <input type="text" name="reference" value={formData.reference} onChange={handleChange} placeholder="e.g. Referred to Ophthalmologist for Glaucoma check" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#396b84]" />
                </div>
              </div>
            </div>
          )}

          {/* Address Block */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Details & Address</label>
            <textarea
              name="address"
              rows="3"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
              placeholder="Enter patient address and phone number"
            ></textarea>
          </div>

          {/* Optometrist Details block */}
          <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-[#f4f7f6]">
            <h4 className="text-xs font-extrabold text-[#134074] uppercase tracking-wider mb-3 border-b border-slate-200 pb-1.5">
              Optometrist Details (Editable)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Name of Optometrist</label>
                <input
                  type="text"
                  name="optometristName"
                  value={formData.optometristName}
                  onChange={handleChange}
                  placeholder="Enter optometrist name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Number of Optometrist</label>
                <input
                  type="text"
                  name="optometristPhone"
                  value={formData.optometristPhone}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84] bg-white text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Prefilled Fields (Read Only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-500 font-medium">
            <div>District: <span className="font-bold text-slate-700">{user?.district}</span></div>
            <div>Institution: <span className="font-bold text-slate-700">{user?.institution}</span></div>
            <div>Logged by Optometrist ID: <span className="font-bold text-slate-700">{user?.username}</span></div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                setEditingId(null);
                setFormData(initialFormState);
              }}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-xs font-bold bg-[#396b84] hover:bg-[#2f5a70] text-white shadow-md shadow-sky-800/10 transition"
            >
              {loading ? "Saving..." : editingId ? "Update Record" : "Save Record"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
