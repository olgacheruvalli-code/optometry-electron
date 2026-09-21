import React, { useState, useMemo } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";

export default function Register({ onRegister, onBackToLogin }) {
  const [district, setDistrict] = useState("");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const institutionOptions = useMemo(() => {
    if (!district) return [];
    const base = Array.isArray(districtInstitutions[district])
      ? districtInstitutions[district]
      : [];
    const seen = new Set();
    const out = [];
    for (const item of base) {
      const s = String(item || "").trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
    }
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return out;
  }, [district]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!district || !institution || !name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 3) {
      setError("Password must be at least 3 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district,
          institution,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          securityPin: securityPin.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setIsSuccess(true);
      setSuccessMessage(
        data.message ||
          "Registration submitted successfully! Your account is pending approval by the Admin / Developer."
      );
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    if (onBackToLogin) onBackToLogin();
    else if (onRegister) onRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-lg border border-gray-100 p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#134074]">
            Optometrist Registration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Register your email to access the Optometry Monthly Reporting Portal
          </p>
        </div>

        {isSuccess ? (
          /* SUCCESS SCREEN */
          <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Registration Submitted!
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 text-left">
              📌 <b>Note:</b> You will be able to log in once the Admin / Developer approves your account. Please keep your password safe.
            </div>
            <div className="pt-2">
              <button
                onClick={handleReturnToLogin}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {/* District & Institution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  District *
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setInstitution("");
                    setError("");
                  }}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select District</option>
                  {Object.keys(districtInstitutions).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Institution *
                </label>
                <select
                  value={institution}
                  onChange={(e) => {
                    setInstitution(e.target.value);
                    setError("");
                  }}
                  disabled={!district}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Select Institution</option>
                  {institutionOptions.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optometrist Full Name"
                required
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email ID (Used for Login) *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@kerala.gov.in / gmail.com"
                required
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mobile Number & Security PIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  placeholder="e.g. 1234 (for reset)"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Show Password Toggle */}
            <div className="flex items-center text-xs text-gray-600">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Show password
              </label>
            </div>

            {/* Info notice */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
              ℹ️ <b>Approval Notice:</b> After submitting, your registration will be reviewed and approved by the <b>Admin / Developer</b> before you can log in.
            </div>

            {/* Submit & Back buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white font-medium rounded-lg shadow transition disabled:opacity-50"
              >
                {isLoading ? "Submitting Registration..." : "Submit Registration"}
              </button>

              <button
                type="button"
                onClick={handleReturnToLogin}
                className="w-full py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                Already registered? Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
