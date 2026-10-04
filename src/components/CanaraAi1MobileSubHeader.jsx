import React from "react";
import { ArrowLeft } from "lucide-react";

export default function CanaraAi1MobileSubHeader({
  title,
  month,
  year,
  onBackToHome,
}) {
  return (
    <div className="bg-[#0b1426] border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between shadow-sm sticky top-[57px] z-30 font-sans">
      <button
        onClick={onBackToHome}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 text-xs font-bold active:scale-95 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </button>

      <div className="text-center">
        <h3 className="text-xs font-extrabold text-white leading-tight">
          {title}
        </h3>
        {month && year && (
          <span className="text-[10px] text-slate-400 font-mono">
            {month} {year}
          </span>
        )}
      </div>

      <div className="w-16 flex justify-end">
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/25">
          MIS
        </span>
      </div>
    </div>
  );
}
