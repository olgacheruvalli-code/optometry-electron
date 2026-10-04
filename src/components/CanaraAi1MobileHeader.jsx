import React from "react";
import { Download, LogOut } from "lucide-react";

export default function CanaraAi1MobileHeader({
  user,
  userRole,
  onLogout,
  onInstallClick,
  canInstall,
  isInstalled,
}) {
  const institutionName = user?.institution || "Optometry Portal";
  const districtName = user?.district || "District";
  const isSuperAdmin =
    user?.isAdmin ||
    user?.isSuperAdmin ||
    user?.role === "ADMIN" ||
    String(userRole || "").toLowerCase() === "admin";
  const isGuest = !!user?.isGuest;

  // Short abbreviation for avatar
  const initials = isSuperAdmin
    ? "SA"
    : institutionName
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "OP";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-[#0b1426] via-[#12223a] to-[#0b1426] border-b border-amber-500/25 text-white shadow-xl px-4 py-2.5 flex items-center justify-between safe-top">
      {/* Left: Avatar & User greeting */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-[1.5px] shadow-md">
            <div className="w-full h-full rounded-full bg-[#0d1624] flex items-center justify-center font-bold text-amber-300 text-xs tracking-wider">
              {initials}
            </div>
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0d1624] rounded-full"></span>
        </div>

        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-amber-300/90 tracking-wide uppercase">
              {isSuperAdmin
                ? "Super Admin"
                : isGuest
                ? "Guest Demo"
                : "Clinical Portal"}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-500"></span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>

          <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px]">
            {institutionName}
          </h2>

          <div className="text-[10px] text-slate-300 font-medium truncate">
            📍 {districtName}
          </div>
        </div>
      </div>

      {/* Right: Actions (Install App button & Logout) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {canInstall && !isInstalled && (
          <button
            onClick={onInstallClick}
            title="Install Mobile App"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold shadow-sm active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5 animate-bounce text-amber-300" />
            <span className="hidden xs:inline">Install</span>
          </button>
        )}

        <button
          onClick={onLogout}
          title="Logout"
          className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:text-white hover:bg-red-900/60 active:scale-95 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
