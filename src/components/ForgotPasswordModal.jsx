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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {step === 3 ? "Password Reset Complete" : "Reset Password"}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Verify */}
        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-gray-600">
              Enter your registered Email ID and either your registered Mobile Number or Security PIN to verify your account.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Registered Email ID *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  placeholder="4-digit PIN"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-800">
              ℹ️ <b>Forgot both?</b> Please contact the Developer / Admin directly. They can reset your password from the Admin Management panel.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/2 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg shadow transition disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify Identity"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-green-700 font-medium bg-green-50 p-2.5 rounded-lg border border-green-200">
              ✅ Identity verified! Please enter your new password below.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 3 characters"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/2 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2 text-sm text-white bg-green-700 hover:bg-green-800 font-medium rounded-lg shadow transition disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Set New Password"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-800">Password Updated!</h4>
              <p className="text-xs text-gray-600 mt-1">
                Your password has been changed successfully. You can now log in using your new credentials.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
