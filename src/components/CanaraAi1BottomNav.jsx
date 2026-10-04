import React from "react";
import {
  Home,
  FileText,
  BarChart3,
  Eye,
  User,
} from "lucide-react";

export default function CanaraAi1BottomNav({
  activeMenu,
  onMenu,
  onOpenSpecial,
  onOpenProfile,
}) {
  const isSpecialActive =
    activeMenu?.startsWith?.("research") ||
    activeMenu?.startsWith?.("register-") ||
    activeMenu === "registers-new";

  const isReportsActive =
    activeMenu === "view" ||
    activeMenu === "edit" ||
    activeMenu === "search" ||
    activeMenu?.startsWith?.("district");

  const isEntryActive = activeMenu === "entry";
  const isHomeActive = activeMenu === "home" || !activeMenu;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1624]/95 backdrop-blur-xl border-t border-slate-800 text-slate-400 px-2 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. HOME / DASHBOARD */}
        <button
          onClick={() => onMenu("home")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isHomeActive
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <Home className="w-5 h-5" />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </button>

        {/* 2. REPORT ENTRY */}
        <button
          onClick={() => onMenu("entry")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isEntryActive
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5" />
            {isEntryActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Entry</span>
        </button>

        {/* 3. REPORTS */}
        <button
          onClick={() => onMenu("view")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isReportsActive
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <BarChart3 className="w-5 h-5" />
            {isReportsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Reports</span>
        </button>

        {/* 4. SPECIAL (Amblyopia & Registers) */}
        <button
          onClick={onOpenSpecial}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isSpecialActive
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <Eye className="w-5 h-5" />
            {isSpecialActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Special</span>
        </button>

        {/* 5. PROFILE / MENU */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition-all"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
}
