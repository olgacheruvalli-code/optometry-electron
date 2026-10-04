import React from "react";
import { Share2, PlusSquare, X } from "lucide-react";

export default function IOSInstallGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#111728] border border-amber-500/40 rounded-3xl p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md flex items-center justify-center">
            <img
              src="./icon.png"
              alt="Optometry App"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Install Optometry App</h3>
            <p className="text-xs text-amber-300 font-medium">Pure Mobile App on iOS</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Install this app on your iPhone or iPad for an instant, full-screen native mobile experience without Safari browser bars:
        </p>

        <div className="space-y-3 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800 mb-5 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span>Tap the</span>
              <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-semibold">
                <Share2 className="w-3.5 h-3.5" /> Share
              </span>
              <span>button below in Safari</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span>Scroll down & tap</span>
              <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-semibold">
                <PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <span className="text-slate-200">
              Tap <b>Add</b> in the top right corner. The app will launch directly from your home screen!
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
