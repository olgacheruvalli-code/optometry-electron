import React from "react";
import { User, LogOut, Download, X, Building, MapPin, Mail, Shield } from "lucide-react";

export default function CanaraAi1ProfileModal({
  isOpen,
  onClose,
  user,
  userRole,
  onLogout,
  onInstallClick,
  canInstall,
  isInstalled,
}) {
  if (!isOpen) return null;

  const isSuperAdmin =
    user?.isAdmin ||
    user?.isSuperAdmin ||
    user?.role === "ADMIN" ||
    String(userRole || "").toLowerCase() === "admin";
  const isGuest = !!user?.isGuest;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-[#0c1524] border-t border-amber-500/30 rounded-t-[32px] p-5 text-white max-h-[85vh] overflow-y-auto shadow-2xl safe-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Profile & Account</h3>
              <p className="text-[10px] text-slate-400">Optometry MIS Session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User / Institution Details Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Building className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Institution</span>
              <span className="font-bold text-white truncate block">
                {user?.institution || "Optometry Center"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">District</span>
              <span className="font-bold text-white truncate block">
                {user?.district || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Registered Email</span>
              <span className="font-mono text-slate-300 truncate block text-[11px]">
                {user?.email || "guest@optometry.local"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Access Role</span>
              <span className="font-semibold text-purple-300">
                {isSuperAdmin
                  ? "👑 Super Admin"
                  : isGuest
                  ? "🕶️ Guest Demo"
                  : user?.role || "Staff Optometrist"}
              </span>
            </div>
          </div>
        </div>

        {/* Install Mobile App CTA */}
        {canInstall && !isInstalled && (
          <button
            onClick={() => {
              onClose();
              onInstallClick();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 mb-3 active:scale-[0.98] transition shadow"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>Install as Pure Mobile App (Add to Home)</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full py-3 px-4 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-red-600/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout from App</span>
        </button>
      </div>
    </div>
  );
}
