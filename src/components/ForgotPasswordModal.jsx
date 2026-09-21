import React, { useState } from "react";
import API_BASE from "../apiBase";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: verify, 2: new password, 3: success
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [userId, setUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered Email ID.");
      return;
    }
    if (!phone.trim() && !securityPin.trim()) {
      setError("Please enter either your registered Mobile Number or Security PIN.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          securityPin: securityPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Identity verification failed.");
      }

      setUserId(data.userId);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to verify details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword || newPassword.length < 3) {
      setError("Password must be at least 3 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Password reset failed.");
      }

      setStep(3);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail("");
    setPhone("");
    setSecurityPin("");
    setUserId(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#111728] rounded-[28px] shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-700/80 text-slate-100 relative">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center text-white text-sm shadow">
              🔑
            </div>
            <h3 className="text-lg font-bold text-white">
              {step === 3 ? "Password Reset Complete" : "Reset Password"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white text-2xl font-bold leading-none p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Verify */}
        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered Email ID and either your Mobile Number or 4-digit Security PIN to verify your identity.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registered Email ID *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-amber-400 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  placeholder="4-digit PIN"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-amber-400 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed">
              ℹ️ <b>Forgot both?</b> Please contact the Developer / Admin directly. They can instantly reset your password from the Approvals Management panel.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/2 py-2.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2.5 text-xs text-white bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 font-semibold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Verifying..." : "Verify Identity"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-emerald-300 font-medium bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/30">
              ✅ Identity verified! Please enter your new password below.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 3 characters"
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-emerald-400 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-emerald-400 focus:outline-none transition"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/2 py-2.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2.5 text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Updating..." : "Set New Password"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Password Updated!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your password has been changed successfully. You can now log in using your new credentials.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold rounded-xl shadow transition cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
