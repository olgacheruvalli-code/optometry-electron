// src/components/SpecsSupplierOrders.jsx
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import API_BASE from "../apiBase";
import {
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
} from "lucide-react";
import { districts, districtInstitutions } from "../data/districtInstitutions";

const formatVal = (val) => {
  if (!val) return "";
  let s = val.toString().trim();
  if (s.toUpperCase() === "PL" || s.toUpperCase() === "PLANO") return "Plano";
  if (s.includes(".")) {
    while (s.endsWith("0")) s = s.slice(0, -1);
    if (s.endsWith(".")) s = s + "0";
  }
  return s;
};

const formatPowerSummary = (sph, cyl, axis, add) => {
  const parts = [];
  const s = formatVal(sph);
  const c = formatVal(cyl);
  const a = formatVal(add);

  if (s) parts.push(`${s} SPH`);
  if (c) parts.push(`${c} CYL${axis ? ` ${axis}°` : ""}`);
  else if (axis) parts.push(`Axis ${axis}°`);
  if (a) parts.push(`Add ${a.startsWith("+") || a.startsWith("-") ? a : `+${a}`}`);

  return parts.join(" / ") || "—";
};

export default function SpecsSupplierOrders({ user, initialTab = "old-aged-spectacles" }) {
  const isSuperAdmin = !!(
    user?.isAdmin ||
    user?.isSuperAdmin ||
    user?.role === "ADMIN" ||
    String(user?.role || "").toLowerCase() === "admin" ||
    String(user?.email || "").toLowerCase() === "cpc.amma@gmail.com"
  );

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDistrict, setSelectedDistrict] = useState(
    isSuperAdmin
      ? user?.district && user?.district !== "All"
        ? user?.district
        : "All"
      : user?.district || "Kozhikode"
  );
  const [selectedInstitution, setSelectedInstitution] = useState("All");
  const [exportStatusFilter, setExportStatusFilter] = useState("Pending"); // "Pending", "Exported", "All"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("All");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Sync when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Institutions list for the current district
  const availableInstitutions = useMemo(() => {
    if (selectedDistrict === "All") {
      const all = [];
      Object.keys(districtInstitutions).forEach((d) => {
        (districtInstitutions[d] || []).forEach((inst) => {
          if (inst && !/^doc/i.test(inst) && !all.includes(inst)) {
            all.push(inst);
          }
        });
      });
      return all.sort();
    }
    const list = districtInstitutions[selectedDistrict] || [];
    return list.filter((i) => i && !/^doc/i.test(i));
  }, [selectedDistrict]);

  // Fetch records from server
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Only send district filter if a specific district is chosen (NOT "All")
      if (
        selectedDistrict &&
        selectedDistrict !== "All" &&
        selectedDistrict !== "all" &&
        selectedDistrict !== "All Districts"
      ) {
        params.append("district", selectedDistrict);
      }

      // Only send institution filter if a specific institution is chosen (NOT "All")
      if (
        selectedInstitution &&
        selectedInstitution !== "All" &&
        selectedInstitution !== "all" &&
        selectedInstitution !== "All Institutions"
      ) {
        params.append("institution", selectedInstitution);
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/api/${activeTab}${queryString}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setRecords(data.docs || []);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Failed to fetch spectacles records:", err);
      showToast("error", "Error connecting to server. Please try again.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeTab, selectedDistrict, selectedInstitution]);

  // Extract distinct batches from loaded records
  const existingBatches = useMemo(() => {
    const batches = new Set();
    records.forEach((r) => {
      if (r.supplierBatchId) batches.add(r.supplierBatchId);
    });
    return Array.from(batches);
  }, [records]);

  // Filter records by export status, batch, and search query
  const filteredRecords = useMemo(() => {
    let list = records;

    // Filter by export status
    if (exportStatusFilter === "Pending") {
      list = list.filter(
        (r) =>
          !r.supplierExportStatus ||
          r.supplierExportStatus === "Pending" ||
          r.supplierExportStatus === ""
      );
    } else if (exportStatusFilter === "Exported") {
      list = list.filter((r) => r.supplierExportStatus === "Exported");
      if (selectedBatchId && selectedBatchId !== "All") {
        list = list.filter((r) => r.supplierBatchId === selectedBatchId);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const name = String(r.name || "").toLowerCase();
        const inst = String(r.institution || "").toLowerCase();
        const dist = String(r.district || "").toLowerCase();
        const school = String(r.schoolName || "").toLowerCase();
        const addr = String(r.address || "").toLowerCase();
        const batch = String(r.supplierBatchId || "").toLowerCase();
        return (
          name.includes(q) ||
          inst.includes(q) ||
          dist.includes(q) ||
          school.includes(q) ||
          addr.includes(q) ||
          batch.includes(q)
        );
      });
    }
    return list;
  }, [records, exportStatusFilter, selectedBatchId, searchQuery]);

  // Group records by institution
  const groupedByInstitution = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const instName = r.institution || "Unknown Institution";
      if (!map[instName]) map[instName] = [];
      map[instName].push(r);
    });
    return map;
  }, [filteredRecords]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter(
      (r) => !r.supplierExportStatus || r.supplierExportStatus === "Pending"
    ).length;
    const exported = records.filter((r) => r.supplierExportStatus === "Exported").length;
    const instCount = Object.keys(groupedByInstitution).length;
    return { total, pending, exported, instCount };
  }, [records, groupedByInstitution]);

  // Export to Excel with Institution Grouping, Summary Header, and Duplicate Prevention
  const handleExportSupplierExcel = async (isReExport = false) => {
    if (filteredRecords.length === 0) {
      showToast("error", "No spectacles orders available to export.");
      return;
    }

    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
      const isOldAged = activeTab === "old-aged-spectacles";
      const typeCode = isOldAged ? "OAS" : "SCH";
      const distCode =
        selectedDistrict !== "All"
          ? selectedDistrict.substring(0, 3).toUpperCase()
          : "ALL";

      // If re-exporting an existing batch, keep that batch ID; otherwise generate a new batch ID
      const batchId =
        isReExport && selectedBatchId !== "All"
          ? selectedBatchId
          : `ORD-${typeCode}-${distCode}-${dateStr.replace(/-/g, "")}-${timeStr.slice(0, 4)}`;

      // 1. Prepare Workbook
      const wb = XLSX.utils.book_new();

      // 2. Prepare Rows Array for a clean, professional supplier format
      const sheetData = [];

      // Title & Header Information
      sheetData.push(["GOVERNMENT OF KERALA — NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB)"]);
      sheetData.push([
        `DISTRICT SPECTACLES SUPPLIER PURCHASE & DISPATCH ORDER — ${
          isOldAged ? "OLD AGED CITIZENS" : "SCHOOL CHILDREN"
        }`,
      ]);
      sheetData.push([
        `District: ${selectedDistrict}`,
        `Batch ID: ${batchId}`,
        `Order Date: ${dateStr}`,
        `Total Spectacles: ${filteredRecords.length}`,
      ]);
      sheetData.push([
        `Export Status: ${
          exportStatusFilter === "Pending" ? "NEW DISPATCH TO SUPPLIER" : "BATCH RE-EXPORT"
        }`,
        `Generated By: ${user?.name || user?.username || "District Ophthalmic Coordinator"}`,
      ]);
      sheetData.push([]); // blank row

      // Executive Summary: Quantity Required Per Institution
      sheetData.push(["================================================================"]);
      sheetData.push(["EXECUTIVE SUMMARY: SPECTACLES REQUIRED PER INSTITUTION"]);
      sheetData.push(["================================================================"]);
      sheetData.push(["Sl No", "Institution / Hospital Name", "Required Quantity (Pairs)"]);

      let summaryIndex = 1;
      const sortedInstNames = Object.keys(groupedByInstitution).sort();
      sortedInstNames.forEach((instName) => {
        sheetData.push([
          summaryIndex++,
          instName,
          groupedByInstitution[instName].length,
        ]);
      });
      sheetData.push([
        "",
        "GRAND TOTAL SPECTACLES",
        filteredRecords.length,
      ]);
      sheetData.push([]); // blank row
      sheetData.push([]); // blank row

      // Detailed Prescription Orders Grouped by Institution
      sheetData.push(["================================================================"]);
      sheetData.push(["DETAILED PATIENT PRESCRIPTION SPECIFICATIONS (GROUPED BY INSTITUTION)"]);
      sheetData.push(["================================================================"]);
      sheetData.push([]);

      // Column Headers for Patient Details
      const headers = isOldAged
        ? [
            "Sl No",
            "Hospital / Institution",
            "Patient Name",
            "Age",
            "Sex",
            "Contact Number / Address",
            "RE SPH",
            "RE CYL",
            "RE Axis",
            "RE NV Add",
            "LE SPH",
            "LE CYL",
            "LE Axis",
            "LE NV Add",
            "IPD / Frame Size",
            "Optometrist Name",
            "Optometrist Contact",
            "Prescription Date",
            "Batch ID",
          ]
        : [
            "Sl No",
            "Hospital / Institution",
            "Student Name",
            "Age",
            "Sex",
            "School Name",
            "Class / Std",
            "Parent Name",
            "Parent Phone",
            "Address",
            "RE SPH",
            "RE CYL",
            "RE Axis",
            "RE NV Add",
            "LE SPH",
            "LE CYL",
            "LE Axis",
            "LE NV Add",
            "IPD / Frame Size",
            "Optometrist Name",
            "Optometrist Contact",
            "Consulting Date",
            "Batch ID",
          ];

      sheetData.push(headers);

      let overallSlNo = 1;

      sortedInstNames.forEach((instName) => {
        const instRecords = groupedByInstitution[instName];

        // Section Banner for Institution
        sheetData.push([
          `>>> INSTITUTION: ${instName.toUpperCase()} (${instRecords.length} SPECTACLES REQUIRED) <<<`,
        ]);

        instRecords.forEach((r) => {
          if (isOldAged) {
            sheetData.push([
              overallSlNo++,
              r.institution || "",
              r.name || "",
              r.age || "",
              r.sex || "",
              r.address || "",
              formatVal(r.powerRE_Sph),
              formatVal(r.powerRE_Cyl),
              r.powerRE_Axis || "",
              formatVal(r.powerRE_Add),
              formatVal(r.powerLE_Sph),
              formatVal(r.powerLE_Cyl),
              r.powerLE_Axis || "",
              formatVal(r.powerLE_Add),
              r.ipdFrameSize || "",
              r.optometristName || r.optometrist || "",
              r.optometristPhone || "",
              r.dateOfPrescription || "",
              r.supplierBatchId || batchId,
            ]);
          } else {
            sheetData.push([
              overallSlNo++,
              r.institution || "",
              r.name || "",
              r.age || "",
              r.sex || "",
              r.schoolName || "",
              r.classStandard || "",
              r.parentName || "",
              r.parentPhone || "",
              r.address || "",
              formatVal(r.powerRE_Sph),
              formatVal(r.powerRE_Cyl),
              r.powerRE_Axis || "",
              formatVal(r.powerRE_Add),
              formatVal(r.powerLE_Sph),
              formatVal(r.powerLE_Cyl),
              r.powerLE_Axis || "",
              formatVal(r.powerLE_Add),
              r.ipdFrameSize || "",
              r.optometristName || r.optometrist || "",
              r.optometristPhone || "",
              r.dateOfPrescription || "",
              r.supplierBatchId || batchId,
            ]);
          }
        });

        // Add blank row between institutions
        sheetData.push([]);
      });

      // 3. Create worksheet and set column widths
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto-fit column widths
      ws["!cols"] = [
        { wch: 8 }, // Sl No
        { wch: 32 }, // Institution
        { wch: 25 }, // Name
        { wch: 6 }, // Age
        { wch: 8 }, // Sex
        { wch: 28 }, // School or Address
        { wch: 12 }, // Class or SPH
        { wch: 20 }, // Parent or CYL
        { wch: 16 }, // Phone or Axis
        { wch: 12 }, // Add
        { wch: 10 }, // LE SPH
        { wch: 10 }, // LE CYL
        { wch: 10 }, // LE Axis
        { wch: 10 }, // LE Add
        { wch: 16 }, // IPD Frame Size
        { wch: 22 }, // Optometrist
        { wch: 16 }, // Optometrist Contact
        { wch: 14 }, // Date
        { wch: 26 }, // Batch ID
      ];

      const sheetName = isOldAged ? "Old Aged Spectacles" : "School Spectacles";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // 4. Trigger download
      const fileName = `Specs_Order_${typeCode}_${distCode}_${dateStr}_Batch_${batchId}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // 5. Mark records as Exported if this was a pending export
      if (exportStatusFilter === "Pending" || !isReExport) {
        const recordIds = filteredRecords.map((r) => r._id || r.id);
        const batchRes = await fetch(`${API_BASE}/api/${activeTab}/batch-export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: recordIds,
            batchId,
            exportDate: dateStr,
            status: "Exported",
          }),
        });
        const batchData = await batchRes.json();
        if (batchRes.ok && batchData.ok) {
          showToast(
            "success",
            `✅ Successfully exported ${recordIds.length} orders! Batch ID: ${batchId}. These orders are marked as Sent to Supplier.`
          );
          // Refresh list to remove exported orders from Pending view
          await fetchRecords();
        } else {
          showToast(
            "info",
            `File downloaded successfully! Note: Could not update batch status on server.`
          );
        }
      } else {
        showToast("success", `File downloaded successfully for Batch ${batchId}!`);
      }
    } catch (err) {
      console.error("Export error:", err);
      showToast("error", "Export failed. Please check network and try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset batch back to Pending (for developer or DOC if a batch was exported accidentally)
  const handleResetBatchToPending = async (batchIdToReset) => {
    if (!batchIdToReset) return;
    const ok = window.confirm(
      `Are you sure you want to reset Batch "${batchIdToReset}" back to Pending?\n\nThis will allow these orders to be downloaded again in new supplier orders.`
    );
    if (!ok) return;

    try {
      const recordsInBatch = records.filter((r) => r.supplierBatchId === batchIdToReset);
      const ids = recordsInBatch.map((r) => r._id || r.id);
      if (ids.length === 0) {
        showToast("error", "No records found in this batch.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/${activeTab}/batch-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          status: "Pending",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(
          "success",
          `Batch "${batchIdToReset}" (${ids.length} orders) reset to Pending status.`
        );
        setSelectedBatchId("All");
        await fetchRecords();
      } else {
        showToast("error", data.error || "Failed to reset batch.");
      }
    } catch (err) {
      console.error("Reset batch error:", err);
      showToast("error", "Failed to reset batch due to network error.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white font-medium flex items-center gap-3 transition-all ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "info"
              ? "bg-sky-600"
              : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 text-xs font-bold bg-[#396b84]/10 text-[#396b84] rounded-full uppercase tracking-wider">
                District Coordinator Portal
              </span>
              {isSuperAdmin && (
                <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> All Districts & Institutions Access
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-[#396b84]" />
              Spectacles Supplier Order Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Download consolidated orders grouped by institution for the spectacles supplier
              with automatic duplicate prevention and batch tracking.
            </p>
          </div>

          {/* Quick Action: Export Excel Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportSupplierExcel(exportStatusFilter === "Exported")}
              disabled={loading || isExporting || filteredRecords.length === 0}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-bold shadow-md transition-all ${
                filteredRecords.length === 0 || loading || isExporting
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-98 hover:shadow-lg"
              }`}
            >
              <Download className="w-5 h-5" />
              <span>
                {isExporting
                  ? "Generating Excel..."
                  : exportStatusFilter === "Pending"
                  ? `Download & Dispatch to Supplier (${filteredRecords.length})`
                  : `Download Excel Copy (${filteredRecords.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Droplist / Submenu Selector (Separate Tabs for Old Aged vs School Children) */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
            Order Category:
          </div>
          <button
            onClick={() => {
              setActiveTab("old-aged-spectacles");
              setSelectedBatchId("All");
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "old-aged-spectacles"
                ? "bg-[#396b84] text-white shadow-md ring-2 ring-[#396b84]/30"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>👓</span>
            <span>Old Aged Spectacles Orders</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("school-spectacles");
              setSelectedBatchId("All");
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "school-spectacles"
                ? "bg-[#396b84] text-white shadow-md ring-2 ring-[#396b84]/30"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>🎒</span>
            <span>School Children Spectacles Orders</span>
          </button>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* District Dropdown (All Districts for Developer/Admin, locked/default for DOC) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#396b84]" />
              District
            </label>
            {isSuperAdmin ? (
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedInstitution("All");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#396b84] focus:border-transparent"
              >
                <option value="All">All Districts (Kerala)</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800">
                {selectedDistrict}
              </div>
            )}
          </div>

          {/* Institution Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#396b84]" />
              Institution / Hospital
            </label>
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#396b84] focus:border-transparent"
            >
              <option value="All">All Institutions (Consolidated)</option>
              {availableInstitutions.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Dispatch Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#396b84]" />
              Dispatch Status
            </label>
            <select
              value={exportStatusFilter}
              onChange={(e) => {
                setExportStatusFilter(e.target.value);
                setSelectedBatchId("All");
              }}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#396b84] ${
                exportStatusFilter === "Pending"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : exportStatusFilter === "Exported"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-slate-50 text-slate-800 border-slate-200"
              }`}
            >
              <option value="Pending">🟢 New / Unsent Orders (Recommended)</option>
              <option value="Exported">📦 Sent to Supplier (Batch History)</option>
              <option value="All">📋 All Orders (New & Sent)</option>
            </select>
          </div>

          {/* Search bar */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#396b84]" />
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search patient, school, batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#396b84] focus:border-transparent"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Batch Filter & Reset Options (Only shown when viewing Sent / Exported orders) */}
        {exportStatusFilter === "Exported" && existingBatches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-900 uppercase">
                Filter by Past Batch:
              </span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-900 focus:outline-none"
              >
                <option value="All">All Export Batches</option>
                {existingBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {selectedBatchId !== "All" && (
              <button
                onClick={() => handleResetBatchToPending(selectedBatchId)}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition"
                title="Reset this batch so orders can be exported again"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Batch to Pending (Allow Re-dispatch)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Orders in View</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{filteredRecords.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase">Unsent / Ready</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.pending}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600 uppercase">Sent to Supplier</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.exported}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#396b84] uppercase">
              Hospitals Included
            </div>
            <div className="text-2xl font-black text-[#396b84] mt-1">{stats.instCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#396b84]/10 flex items-center justify-center text-[#396b84]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Institution Grouping Summary Banner */}
      {filteredRecords.length > 0 && (
        <div className="bg-gradient-to-r from-[#396b84] to-[#2c5366] text-white rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-base tracking-wide">
                Institution-Wise Breakdown Summary for Supplier
              </h3>
            </div>
            <div className="text-xs bg-white/10 px-3 py-1 rounded-full font-medium">
              Excel file will automatically group orders with separate headers per hospital
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-2">
            {Object.keys(groupedByInstitution)
              .sort()
              .map((inst) => (
                <div
                  key={inst}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10 flex flex-col justify-between"
                >
                  <div className="text-[11px] font-medium text-slate-100 truncate" title={inst}>
                    {inst}
                  </div>
                  <div className="text-lg font-black text-amber-300 mt-1">
                    {groupedByInstitution[inst].length}{" "}
                    <span className="text-[10px] font-normal text-slate-200">specs</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#396b84] animate-spin" />
            <p className="font-medium text-sm">Loading spectacles orders from server...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <FileSpreadsheet className="w-12 h-12 text-slate-300" />
            <p className="font-bold text-base text-slate-700">No spectacles orders found</p>
            <p className="text-xs text-slate-400 max-w-md">
              {exportStatusFilter === "Pending"
                ? "All spectacles orders have already been exported and dispatched to the supplier! You can switch the filter to 'Sent to Supplier (Batch History)' to view past orders."
                : "No matching records found for the selected district, institution, or search query."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[160px]">Hospital / Institution</th>
                  <th className="py-3 px-3 min-w-[140px]">
                    {activeTab === "old-aged-spectacles" ? "Patient Name" : "Student Name"}
                  </th>
                  <th className="py-3 px-2 w-16 text-center">Age / Sex</th>
                  {activeTab === "school-spectacles" && (
                    <th className="py-3 px-3 min-w-[150px]">School & Class</th>
                  )}
                  <th className="py-3 px-3 min-w-[140px]">Contact Details</th>
                  <th className="py-3 px-3 min-w-[150px]">Right Eye (RE) Power</th>
                  <th className="py-3 px-3 min-w-[150px]">Left Eye (LE) Power</th>
                  <th className="py-3 px-2 min-w-[100px] text-center">IPD / Frame</th>
                  <th className="py-3 px-3 min-w-[140px]">Optometrist</th>
                  <th className="py-3 px-3 min-w-[130px] text-center">Export Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(groupedByInstitution)
                  .sort()
                  .map((instName) => (
                    <React.Fragment key={instName}>
                      {/* Institution Banner Row */}
                      <tr className="bg-slate-100 font-extrabold text-[#396b84] border-t-2 border-slate-300">
                        <td
                          colSpan={activeTab === "school-spectacles" ? 11 : 10}
                          className="py-2.5 px-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#396b84]" />
                              <span>{instName.toUpperCase()}</span>
                            </div>
                            <span className="bg-[#396b84] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                              {groupedByInstitution[instName].length} Orders
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Orders for this Institution */}
                      {groupedByInstitution[instName].map((r, idx) => (
                        <tr
                          key={r._id || r.id || idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {r.institution}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">
                            {r.age || "—"} / {r.sex || "—"}
                          </td>
                          {activeTab === "school-spectacles" && (
                            <td className="py-2.5 px-3 text-slate-700">
                              <div className="font-semibold">{r.schoolName || "—"}</div>
                              <div className="text-[10px] text-slate-500">
                                Class: {r.classStandard || "—"}
                              </div>
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-slate-700">
                            {activeTab === "school-spectacles" ? (
                              <div>
                                <div className="font-medium text-slate-900">
                                  {r.parentName || "—"}
                                </div>
                                <div className="text-slate-500 font-mono text-[11px]">
                                  {r.parentPhone || r.address || "—"}
                                </div>
                              </div>
                            ) : (
                              <div className="max-w-[200px] truncate" title={r.address}>
                                {r.address || "—"}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {formatPowerSummary(
                              r.powerRE_Sph,
                              r.powerRE_Cyl,
                              r.powerRE_Axis,
                              r.powerRE_Add
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {formatPowerSummary(
                              r.powerLE_Sph,
                              r.powerLE_Cyl,
                              r.powerLE_Axis,
                              r.powerLE_Add
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-700">
                            {r.ipdFrameSize || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div className="font-medium text-slate-900">
                              {r.optometristName || r.optometrist || "—"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {r.optometristPhone || ""}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.supplierExportStatus === "Exported" ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Check className="w-3 h-3" /> Sent
                                </span>
                                {r.supplierBatchId && (
                                  <span
                                    className="text-[9px] text-slate-400 font-mono mt-0.5 max-w-[110px] truncate"
                                    title={r.supplierBatchId}
                                  >
                                    {r.supplierBatchId}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Clock className="w-3 h-3" /> New
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
