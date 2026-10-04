import React from "react";
import {
  FileText,
  BarChart3,
  Edit3,
  Search,
  Building2,
  Table,
  Eye,
  BookOpen,
  Printer,
  ShieldCheck,
  Download,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

export default function CanaraAi1Dashboard({
  user,
  userRole,
  month,
  setMonth,
  year,
  setYear,
  monthsList,
  onMenu,
  onInstallClick,
  canInstall,
  isInstalled,
}) {
  const isSuperAdmin =
    user?.isAdmin ||
    user?.isSuperAdmin ||
    user?.role === "ADMIN" ||
    String(userRole || "").toLowerCase() === "admin";

  // Canara ai1 quick service tiles
  const services = [
    {
      id: "entry",
      title: "Report Entry",
      subtitle: "Monthly Clinical MIS",
      icon: FileText,
      gradient: "from-sky-500 to-blue-600",
      accent: "text-sky-400",
      border: "border-sky-500/30",
      action: () => onMenu("entry"),
    },
    {
      id: "view",
      title: "View Reports",
      subtitle: "Hospital Archives",
      icon: BarChart3,
      gradient: "from-amber-500 to-orange-600",
      accent: "text-amber-400",
      border: "border-amber-500/30",
      action: () => onMenu("view"),
    },
    {
      id: "edit",
      title: "Edit Report",
      subtitle: "Modify Submitted Data",
      icon: Edit3,
      gradient: "from-indigo-500 to-purple-600",
      accent: "text-indigo-400",
      border: "border-indigo-500/30",
      action: () => onMenu("edit"),
    },
    {
      id: "search",
      title: "Search MIS",
      subtitle: "Global Report Filter",
      icon: Search,
      gradient: "from-emerald-500 to-teal-600",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
      action: () => onMenu("search"),
    },
    {
      id: "district-institutions",
      title: "Institution MIS",
      subtitle: "District Performance",
      icon: Building2,
      gradient: "from-rose-500 to-red-600",
      accent: "text-rose-400",
      border: "border-rose-500/30",
      action: () => onMenu("district-institutions"),
    },
    {
      id: "district-tables",
      title: "District Tables",
      subtitle: "Eye Bank & Vision Center",
      icon: Table,
      gradient: "from-cyan-500 to-blue-600",
      accent: "text-cyan-400",
      border: "border-cyan-500/30",
      action: () => onMenu("district-tables"),
    },
    {
      id: "amblyopia",
      title: "Amblyopia Study",
      subtitle: "Screening & Analytics",
      icon: Eye,
      gradient: "from-teal-500 to-emerald-600",
      accent: "text-teal-400",
      border: "border-teal-500/30",
      action: () => onMenu("research-amblyopia-entry"),
    },
    {
      id: "registers",
      title: "Clinical Registers",
      subtitle: "Blind & Cataract Backlog",
      icon: BookOpen,
      gradient: "from-yellow-500 to-amber-600",
      accent: "text-yellow-400",
      border: "border-yellow-500/30",
      action: () => onMenu("register-blind"),
    },
    ...(isSuperAdmin || user?.isDoc || String(userRole || "").toLowerCase() === "doc"
      ? [
          {
            id: "specs-old-aged-supplier",
            title: "Old Aged Specs Orders",
            subtitle: "Supplier Orders & Excel",
            icon: FileSpreadsheet,
            gradient: "from-blue-600 to-indigo-700",
            accent: "text-blue-300",
            border: "border-blue-500/30",
            action: () => onMenu("district-specs-old-aged"),
          },
          {
            id: "specs-school-supplier",
            title: "School Specs Orders",
            subtitle: "Supplier Orders & Excel",
            icon: FileSpreadsheet,
            gradient: "from-teal-600 to-emerald-700",
            accent: "text-emerald-300",
            border: "border-teal-500/30",
            action: () => onMenu("district-specs-school"),
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            id: "admin-approvals",
            title: "Approvals Portal",
            subtitle: "User Registration Approval",
            icon: ShieldCheck,
            gradient: "from-purple-500 to-pink-600",
            accent: "text-purple-400",
            border: "border-purple-500/30",
            action: () => onMenu("admin-approvals"),
          },
        ]
      : []),
    {
      id: "print",
      title: "Print Reports",
      subtitle: "Official A4 / Format",
      icon: Printer,
      gradient: "from-slate-600 to-slate-800",
      accent: "text-slate-300",
      border: "border-slate-600/30",
      action: () => onMenu("print"),
    },
  ];

  return (
    <div className="space-y-4 pb-20 pt-16 px-4 max-w-lg mx-auto animate-fadeIn font-sans">
      {/* 1. Canara ai1 Main Account/Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111e33] via-[#162744] to-[#0c1626] border border-amber-500/35 p-5 shadow-2xl text-white">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Active Reporting Cycle
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
            {month} {year}
          </span>
        </div>

        {/* Inline Month & Year Selector in Canara ai1 style */}
        <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
          <div className="bg-[#09101d]/80 border border-slate-700/70 rounded-xl p-2 text-left">
            <label className="text-[10px] text-slate-400 block mb-0.5">Reporting Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {monthsList.map((m) => (
                <option key={m} value={m} className="bg-[#09101d] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#09101d]/80 border border-slate-700/70 rounded-xl p-2 text-left">
            <label className="text-[10px] text-slate-400 block mb-0.5">Financial Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {Array.from({ length: 6 }, (_, i) => 2024 + i).map((y) => (
                <option key={y} value={y} className="bg-[#09101d] text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick CTA to start report */}
        <button
          onClick={() => onMenu("entry")}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition relative z-10"
        >
          <span>Fill {month} {year} Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Install App Banner (Canara ai1 mobile prompt) */}
      {canInstall && !isInstalled && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/35 p-3.5 flex items-center justify-between gap-3 text-left shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center flex-shrink-0 text-slate-950 shadow">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">
                Install as Pure Mobile App
              </h4>
              <p className="text-[11px] text-slate-300">
                Fullscreen experience & one-tap home screen access
              </p>
            </div>
          </div>
          <button
            onClick={onInstallClick}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex-shrink-0 shadow active:scale-95 transition"
          >
            Install
          </button>
        </div>
      )}

      {/* 3. Section Title: Quick Services (ai1 Grid) */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
          Quick Services
        </h3>
        <span className="text-[10px] text-amber-400 font-semibold">
          Canara ai1 Layout
        </span>
      </div>

      {/* 4. Symmetrical Canara ai1 Grid of Service Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <button
              key={srv.id}
              onClick={srv.action}
              className={`p-3.5 rounded-2xl bg-[#0f1728]/90 border ${srv.border} hover:border-amber-400/50 flex flex-col items-start text-left shadow-lg active:scale-[0.97] transition group relative overflow-hidden`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${srv.gradient} flex items-center justify-center text-white mb-2.5 shadow-md group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white leading-snug group-hover:text-amber-300 transition-colors">
                {srv.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                {srv.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* 5. Bottom Info / Security badge */}
      <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-[10px] text-slate-400">
        <span>🔒 256-bit Encrypted Clinical Sync • Optometry MIS Mobile v2.0</span>
      </div>
    </div>
  );
}
