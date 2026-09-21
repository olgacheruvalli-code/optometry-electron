import React, { useState, useMemo, useEffect } from "react";
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
  // Modes: "user" (Optometrist/DOC) | "admin" (Developer/Admin)
  const [loginMode, setLoginMode] = useState("user");

  // User fields
  const [district, setDistrict] = useState(() => localStorage.getItem("opt_last_district") || "");
  const [institution, setInstitution] = useState(() => localStorage.getItem("opt_last_institution") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("opt_last_email") || "");
  const [password, setPassword] = useState("");

  // Admin fields
  const [adminEmail, setAdminEmail] = useState("admin@optometry.com");
  const [adminPassword, setAdminPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

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

  const handleLogin = async (e) => {
    e?.preventDefault();

    if (loginMode === "admin") {
      if (!adminPassword) {
        setError("Please enter the Admin / Developer password.");
        return;
      }
    } else {
      if (!district || !institution || !email.trim() || !password) {
        setError("Please select District, Institution, and enter Email ID & Password.");
        return;
      }
    }

    setError("");
    setIsLoading(true);

    try {
      // Warm up Render backend if sleeping
      await warmUpBackend();

      const payload =
        loginMode === "admin"
          ? {
              isAdminLogin: true,
              email: adminEmail.trim().toLowerCase(),
              password: adminPassword,
            }
          : {
              district: district.trim(),
              institution: institution.trim(),
              email: email.trim().toLowerCase(),
              password,
              username: institution.trim(),
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
          "Server did not respond in time. The backend server might still be waking up. Please try again in a few seconds."
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

  const handleGuestLogin = () => {
    onLogin({ district: "Guest", institution: "Guest User", isGuest: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl border border-gray-100">
        {/* Left: Login Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 space-y-4 bg-white flex flex-col justify-center">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#134074]">
            Optometry Reporting
          </h2>

          {/* Login Mode Selector Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setLoginMode("user");
                setError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                loginMode === "user"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Optometrist / DOC Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("admin");
                setError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                loginMode === "admin"
                  ? "bg-[#134074] text-white shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              👑 Developer / Admin
            </button>
          </div>

          {loginMode === "user" ? (
            /* OPTOMETRIST / DOC LOGIN FORM */
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
                disabled={!district || !institution || !email || !password || isLoading}
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
          ) : (
            /* DEVELOPER / SUPER ADMIN LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
                👑 <b>Developer / Master Admin Mode:</b> You have full authority to approve optometrists and view/manage all institutions across all districts.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Email / Username
                </label>
                <input
                  type="text"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@optometry.com"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter Admin Password (451970)"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {error && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!adminPassword || isLoading}
                className="w-full py-2.5 bg-[#134074] hover:bg-[#0f325c] text-white rounded-lg font-medium shadow-md transition disabled:opacity-50"
              >
                {isLoading ? "Authenticating..." : "Login as Admin / Developer"}
              </button>
            </form>
          )}

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
