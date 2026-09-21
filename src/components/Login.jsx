import React, { useState, useMemo, useEffect, useRef } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";
import rightImage from "../assets/optometrist-right.png";
import ForgotPasswordModal from "./ForgotPasswordModal";

// ⚡ Universal fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ⚡ Backend warm-up function (quick ping)
async function warmUpBackend() {
  try {
    await fetchWithTimeout(`${API_BASE}/api/ping`, {}, 5000);
  } catch {
    // ignore ping errors — only to wake backend
  }
}

export default function Login({ onLogin, onShowRegister }) {
  // Main form fields
  const [district, setDistrict] = useState(() => localStorage.getItem("opt_last_district") || "");
  const [institution, setInstitution] = useState(() => localStorage.getItem("opt_last_institution") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("opt_last_email") || "");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Hidden Secret Admin Modal state
  const [isSecretAdminOpen, setIsSecretAdminOpen] = useState(false);
  const [secretAdminPass, setSecretAdminPass] = useState("");
  const [secretAdminError, setSecretAdminError] = useState("");
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  // Save preferences
  useEffect(() => {
    if (district) localStorage.setItem("opt_last_district", district);
  }, [district]);
  useEffect(() => {
    if (institution) localStorage.setItem("opt_last_institution", institution);
  }, [institution]);
  useEffect(() => {
    if (email) localStorage.setItem("opt_last_email", email);
  }, [email]);

  // Secret keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A opens secret admin modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setIsSecretAdminOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const institutionOptions = useMemo(() => {
    if (!district) return [];
    const base = Array.isArray(districtInstitutions[district])
      ? districtInstitutions[district]
      : [];
    const seen = new Set();
    const out = [];
    for (const name of base) {
      const s = String(name || "").trim();
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

  // Secret Header Click: Clicking "Optometry Reporting" 3 times in 2 seconds triggers secret admin popup
  const handleHeaderClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setIsSecretAdminOpen(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 2000);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!district || !institution || !cleanEmail || !password) {
      setError("Please select District, Institution, and enter Email ID & Password.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await warmUpBackend();

      const payload = {
        district: district.trim(),
        institution: institution.trim(),
        email: cleanEmail,
        password,
        username: institution.trim() || cleanEmail,
        isAdminLogin: false,
      };

      console.log("Login → POST", `${API_BASE}/api/login`, payload);

      const res = await fetchWithTimeout(
        `${API_BASE}/api/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        75000
      );

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON
      }

      if (!res.ok || !data.ok) {
        const msg =
          data?.error ||
          raw ||
          `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(msg);
      }

      const user = data.user || data;
      if (!user) {
        throw new Error("Malformed login response from server.");
      }

      onLogin(user); // ✅ Login successful!
    } catch (err) {
      console.warn("Login failed:", err);

      if (err.name === "AbortError") {
        setError(
          "Server did not respond in time. The backend server might still be waking up. Please try again."
        );
      } else if (!navigator.onLine) {
        setError("No internet connection. Please check your network.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Secret Admin Modal Login
  const handleSecretAdminSubmit = async (e) => {
    e?.preventDefault();
    if (!secretAdminPass) {
      setSecretAdminError("Please enter the Admin Password.");
      return;
    }

    setSecretAdminError("");
    setIsLoading(true);

    try {
      await warmUpBackend();

      const payload = {
        isAdminLogin: true,
        email: "cpc.amma@gmail.com",
        password: secretAdminPass,
      };

      const res = await fetchWithTimeout(
        `${API_BASE}/api/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        30000
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Incorrect Admin Password.");
      }

      setIsSecretAdminOpen(false);
      onLogin(data.user);
    } catch (err) {
      setSecretAdminError(err.message || "Admin authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({ district: "Guest", institution: "Guest User", isGuest: true });
  };

  const isSubmitDisabled =
    isLoading || !district || !institution || !email.trim() || !password;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl border border-gray-100">
        {/* Left: Login Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 space-y-4 bg-white flex flex-col justify-center">
          {/* Secret clickable title (triple-click to open hidden admin prompt) */}
          <h2
            onClick={handleHeaderClick}
            className="text-2xl md:text-3xl font-bold text-center text-[#134074] cursor-pointer select-none"
            title="Optometry Monthly Reporting"
          >
            Optometry Reporting
          </h2>

          {/* STANDARD CLEAN LOGIN FORM (No visible admin buttons or tabs!) */}
          <form onSubmit={handleLogin} className="space-y-3">
            {/* DISTRICT */}
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

            {/* INSTITUTION */}
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

            {/* EMAIL ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Registered Email ID *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="email"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg font-medium shadow-md transition disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>

            {/* REGISTER LINK */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onShowRegister}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                New Optometrist? Register with your Email ID here →
              </button>
            </div>
          </form>

          <hr className="my-1 border-gray-200" />

          {/* GUEST LOGIN */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="text-xs text-gray-600 border border-gray-300 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              👁️ Continue as Guest (Preview Only)
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="w-full md:w-1/2 bg-[#0b2e59]/5 hidden md:block">
          <img
            src={rightImage}
            alt="Optometrist"
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* HIDDEN SECRET DEVELOPER / ADMIN ACCESS MODAL */}
      {isSecretAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <h3 className="text-base font-bold text-gray-900">Developer Access</h3>
              </div>
              <button
                onClick={() => {
                  setIsSecretAdminOpen(false);
                  setSecretAdminPass("");
                  setSecretAdminError("");
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Enter the developer password to access all institutions and approvals.
            </p>

            <form onSubmit={handleSecretAdminSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Developer Password
                </label>
                <input
                  type="password"
                  value={secretAdminPass}
                  onChange={(e) => {
                    setSecretAdminPass(e.target.value);
                    setSecretAdminError("");
                  }}
                  placeholder="Enter password"
                  autoFocus
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {secretAdminError && (
                <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {secretAdminError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSecretAdminOpen(false)}
                  className="w-1/2 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 py-2 text-xs text-white bg-[#134074] hover:bg-[#0e2c50] font-semibold rounded-lg shadow transition disabled:opacity-50"
                >
                  {isLoading ? "Unlocking..." : "Unlock & Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />

      {/* LOADER OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-white/95 px-8 py-6 rounded-2xl shadow-2xl max-w-sm text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            <p className="mt-4 text-gray-800 font-bold text-base">
              Signing you in...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Please wait while the server authenticates your account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
