// src/components/Registers/RegistersManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import API_BASE from "../../apiBase";
import { Plus, Table, Download, Search, Edit, Trash2, X, Check } from "lucide-react";

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

  // Form State
  const initialFormState = {
    name: "",
    age: "",
    sex: "Male",
    address: "",
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
    }
  }, [activeRegister]);

  // Fetch records
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        setFormData(initialFormState);
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
        "Optometrist": r.optometrist,
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
          "Manual Sl No": r.slNo,
          "Patient Name": r.name,
          "Date of Prescription": r.dateOfPrescription,
          "Age": r.age,
          "Sex": r.sex,
          "Diagnosis": r.diagnosis,
          "Vision DV RE": r.visionRE_DV,
          "Vision NV RE": r.visionRE_NV,
          "Vision DV LE": r.visionLE_DV,
          "Vision NV LE": r.visionLE_NV,
          "Power RE Sph": r.powerRE_Sph,
          "Power RE Cyl": r.powerRE_Cyl,
          "Power RE Axis": r.powerRE_Axis,
          "Power RE Add": r.powerRE_Add,
          "Power LE Sph": r.powerLE_Sph,
          "Power LE Cyl": r.powerLE_Cyl,
          "Power LE Axis": r.powerLE_Axis,
          "Power LE Add": r.powerLE_Add,
          "Corrected DV RE": r.correctedRE_DV,
          "Corrected NV RE": r.correctedRE_NV,
          "Corrected DV LE": r.correctedLE_DV,
          "Corrected NV LE": r.correctedLE_NV,
          "IPD/Frame Size": r.ipdFrameSize,
          "Reference": r.reference,
          "Address": r.address,
          "District": r.district,
          "Institution": r.institution,
          "Optometrist": r.optometrist,
        });
      } else if (activeTab === "school-spectacles") {
        dataToExport.push({
          "Patient Name": r.name,
          "Date of Prescription": r.dateOfPrescription,
          "Age": r.age,
          "Sex": r.sex,
          "School Name": r.schoolName,
          "Class/Standard": r.classStandard,
          "Teacher Name": r.teacherName,
          "Diagnosis": r.diagnosis,
          "Vision DV RE": r.visionRE_DV,
          "Vision NV RE": r.visionRE_NV,
          "Vision DV LE": r.visionLE_DV,
          "Vision NV LE": r.visionLE_NV,
          "Power RE Sph": r.powerRE_Sph,
          "Power RE Cyl": r.powerRE_Cyl,
          "Power RE Axis": r.powerRE_Axis,
          "Power RE Add": r.powerRE_Add,
          "Power LE Sph": r.powerLE_Sph,
          "Power LE Cyl": r.powerLE_Cyl,
          "Power LE Axis": r.powerLE_Axis,
          "Power LE Add": r.powerLE_Add,
          "Corrected DV RE": r.correctedRE_DV,
          "Corrected NV RE": r.correctedRE_NV,
          "Corrected DV LE": r.correctedLE_DV,
          "Corrected NV LE": r.correctedLE_NV,
          "IPD/Frame Size": r.ipdFrameSize,
          "Reference": r.reference,
          "Address": r.address,
          "District": r.district,
          "Institution": r.institution,
          "Optometrist": r.optometrist,
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="p-3">Sl No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Age/Sex</th>
                    {activeTab === "school-spectacles" && <th className="p-3">School (Class)</th>}
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
                        <th className="p-3">Diagnosis</th>
                        <th className="p-3">Prescription (RE/LE)</th>
                      </>
                    )}
                    <th className="p-3">Address/Contact</th>
                    <th className="p-3">Optometrist</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRecords.map((r, index) => (
                    <tr key={r._id || r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                      <td className="p-3">{r.age} Y / {r.sex}</td>
                      {activeTab === "school-spectacles" && (
                        <td className="p-3 text-indigo-600 font-semibold">
                          {r.schoolName} {r.classStandard ? `(${r.classStandard})` : ""}
                        </td>
                      )}
                      {activeTab === "blind-register" && (
                        <>
                          <td className="p-3">RE: {r.vaRE || "-"} | LE: {r.vaLE || "-"}</td>
                          <td className="p-3 text-amber-700 font-semibold">{r.cause}</td>
                        </>
                      )}
                      {activeTab === "cataract-backlog" && (
                        <>
                          <td className="p-3 font-bold text-slate-600">{r.eyeOperated}</td>
                          <td className="p-3">
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
                          <td className="p-3 text-indigo-700">{r.diagnosis || "Refractive Error"}</td>
                          <td className="p-3 font-mono text-slate-600">
                            RE: {r.powerRE_Sph || "PL"}{r.powerRE_Cyl ? ` / ${r.powerRE_Cyl} x ${r.powerRE_Axis || "0"}` : ""}{r.powerRE_Add ? ` [Add: ${r.powerRE_Add}]` : ""}
                            <br />
                            LE: {r.powerLE_Sph || "PL"}{r.powerLE_Cyl ? ` / ${r.powerLE_Cyl} x ${r.powerLE_Axis || "0"}` : ""}{r.powerLE_Add ? ` [Add: ${r.powerLE_Add}]` : ""}
                          </td>
                        </>
                      )}
                      <td className="p-3 max-w-[200px] truncate text-slate-500" title={r.address}>{r.address || "—"}</td>
                      <td className="p-3 text-slate-500 font-normal">{r.optometrist}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r._id || r.id)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
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
                  <input
                    type="text"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#396b84]"
                    placeholder="e.g. Presbyopia, Simple Myopia"
                  />
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
                      <input type="text" name="visionRE_DV" value={formData.visionRE_DV} onChange={handleChange} placeholder="e.g. 6/18" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision NV</label>
                      <input type="text" name="visionRE_NV" value={formData.visionRE_NV} onChange={handleChange} placeholder="e.g. N9" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                  </div>

                  {/* RE Prescribed Power */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Sph</label>
                      <input type="text" name="powerRE_Sph" value={formData.powerRE_Sph} onChange={handleChange} placeholder="+1.00" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Cyl</label>
                      <input type="text" name="powerRE_Cyl" value={formData.powerRE_Cyl} onChange={handleChange} placeholder="-0.50" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Axis</label>
                      <input type="text" name="powerRE_Axis" value={formData.powerRE_Axis} onChange={handleChange} placeholder="90" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">NV Add</label>
                      <input type="text" name="powerRE_Add" value={formData.powerRE_Add} onChange={handleChange} placeholder="+2.00" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                  </div>

                  {/* RE Corrected Vision */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected DV</label>
                      <input type="text" name="correctedRE_DV" value={formData.correctedRE_DV} onChange={handleChange} placeholder="6/6" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected NV</label>
                      <input type="text" name="correctedRE_NV" value={formData.correctedRE_NV} onChange={handleChange} placeholder="N6" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
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
                      <input type="text" name="visionLE_DV" value={formData.visionLE_DV} onChange={handleChange} placeholder="e.g. 6/18" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Vision NV</label>
                      <input type="text" name="visionLE_NV" value={formData.visionLE_NV} onChange={handleChange} placeholder="e.g. N9" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                  </div>

                  {/* LE Prescribed Power */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Sph</label>
                      <input type="text" name="powerLE_Sph" value={formData.powerLE_Sph} onChange={handleChange} placeholder="+1.00" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Cyl</label>
                      <input type="text" name="powerLE_Cyl" value={formData.powerLE_Cyl} onChange={handleChange} placeholder="-0.50" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Axis</label>
                      <input type="text" name="powerLE_Axis" value={formData.powerLE_Axis} onChange={handleChange} placeholder="90" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">NV Add</label>
                      <input type="text" name="powerLE_Add" value={formData.powerLE_Add} onChange={handleChange} placeholder="+2.00" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                  </div>

                  {/* LE Corrected Vision */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected DV</label>
                      <input type="text" name="correctedLE_DV" value={formData.correctedLE_DV} onChange={handleChange} placeholder="6/6" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Corrected NV</label>
                      <input type="text" name="correctedLE_NV" value={formData.correctedLE_NV} onChange={handleChange} placeholder="N6" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#396b84]" />
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

          {/* Prefilled Fields (Read Only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-500 font-medium">
            <div>District: <span className="font-bold text-slate-700">{user?.district}</span></div>
            <div>Institution: <span className="font-bold text-slate-700">{user?.institution}</span></div>
            <div>Logged by Optometrist: <span className="font-bold text-slate-700">{user?.username}</span></div>
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
