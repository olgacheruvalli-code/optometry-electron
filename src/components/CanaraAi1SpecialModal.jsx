import React from "react";
import { Eye, BookOpen, X, ChevronRight, BarChart2, FilePlus, Archive } from "lucide-react";

export default function CanaraAi1SpecialModal({ isOpen, onClose, onSelectMenu }) {
  if (!isOpen) return null;

  const handleSelect = (key) => {
    onSelectMenu(key);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0c1524] border-t border-amber-500/30 rounded-t-[32px] p-5 text-white max-h-[85vh] overflow-y-auto shadow-2xl safe-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Speciality & Registers</h3>
              <p className="text-[10px] text-slate-400">Clinical Studies & Patient Registers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Amblyopia Deep Study */}
        <div className="mb-5">
          <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Amblyopia Research & Clinic
          </h4>
          <div className="space-y-1.5">
            <button
              onClick={() => handleSelect("research-amblyopia-entry")}
              className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 flex items-center justify-between text-left active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-2.5">
                <FilePlus className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Amblyopia – Patient Entry</div>
                  <div className="text-[10px] text-slate-400">Clinical Screening & Diagnostic Form</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => handleSelect("research-amblyopia-view")}
              className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 flex items-center justify-between text-left active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-white">Amblyopia – View Records</div>
                  <div className="text-[10px] text-slate-400">Filter and search amblyopia patients</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => handleSelect("research-amblyopia-analytics")}
              className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 flex items-center justify-between text-left active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Amblyopia – Analytics Dashboard</div>
                  <div className="text-[10px] text-slate-400">Demographics & visual acuity charts</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* 2. Clinical Registers */}
        <div className="mb-4">
          <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Clinical Patient Registers
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSelect("register-blind")}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 text-left active:scale-[0.98] transition"
            >
              <div className="text-xs font-bold text-white">Blind Register</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Certificates & Records</div>
            </button>

            <button
              onClick={() => handleSelect("register-cataract")}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 text-left active:scale-[0.98] transition"
            >
              <div className="text-xs font-bold text-white">Cataract Backlog</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Surgical Queue</div>
            </button>

            <button
              onClick={() => handleSelect("register-old-aged")}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 text-left active:scale-[0.98] transition"
            >
              <div className="text-xs font-bold text-white">Old Aged Glasses</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Senior Citizen Distribution</div>
            </button>

            <button
              onClick={() => handleSelect("register-school")}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 text-left active:scale-[0.98] transition"
            >
              <div className="text-xs font-bold text-white">School Glasses</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pediatric Screening</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
