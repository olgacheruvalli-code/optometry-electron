import React, { useState, useMemo, useEffect, useRef } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";
import crystalImg from "../assets/crystal_transparent.png";
import pradeepProfileImg from "../assets/pradeep_profile.jpg";
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
  const [district, setDistrict] = useState(
    () => localStorage.getItem("opt_last_district") || ""
  );
  const [institution, setInstitution] = useState(
    () => localStorage.getItem("opt_last_institution") || ""
  );
  const [email, setEmail] = useState(
    () => localStorage.getItem("opt_last_email") || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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
    if (rememberDevice) {
      if (district) localStorage.setItem("opt_last_district", district);
      if (institution) localStorage.setItem("opt_last_institution", institution);
      if (email) localStorage.setItem("opt_last_email", email);
    }
  }, [district, institution, email, rememberDevice]);

  // Secret keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A opens secret admin modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "A" || e.key === "a")
      ) {
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

  // Secret Header Click: Clicking "Optometry" 3 times in 2 seconds triggers secret admin popup
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
    onLogin({
      district: "Demo District",
      institution: "Demo General Hospital (Sample)",
      role: "GUEST",
      isGuest: true,
    });
  };

  const isSubmitDisabled =
    isLoading || !district || !institution || !email.trim() || !password;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center font-sans p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Ambient atmospheric glows (Wynpro style) */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-amber-500/[0.08] rounded-full blur-[110px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-sky-500/[0.06] rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
        
        {/* Left Column: Brand Hero & 3D Crystal Graphic */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6 sm:space-y-8 pr-0 lg:pr-4">
          
          {/* Upper portion: Circular Photo with Caption - Pradeep Innovations */}
          <div className="flex items-center gap-4 justify-center lg:justify-start">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 rounded-full blur-md opacity-70"></div>
              <img
                src={pradeepProfileImg}
                alt="Pradeep Innovations"
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover object-top border-2 border-amber-300/90 shadow-2xl"
              />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-amber-400 tracking-widest uppercase block">
                Creator
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-white tracking-wide block">
                Pradeep Innovations
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white leading-[1.18] text-center lg:text-left">
            Elevate Your Healthcare<br />
            <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
              with timely and precise Reporting.
            </span>
          </h1>

          {/* 3D Crystal Graphic with Orbiting Rings */}
          <div className="flex justify-center items-center py-2 relative">
            <div className="relative w-56 sm:w-68 md:w-80 aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-sky-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
              <img
                src={crystalImg}
                alt="Wynpro 3D Crystal"
                className="w-full h-auto object-contain pointer-events-none select-none relative z-10 drop-shadow-[0_15px_35px_rgba(0,0,0,0.65)] hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-1 text-center lg:text-left max-w-lg mx-auto lg:mx-0">
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
              Comprehensive clinical reporting for OPD, Cataract Surgeries, School Health Screening & Vision Centers across all institutions.
            </p>
            <div className="text-xs font-semibold text-amber-300/90 tracking-wide flex flex-wrap gap-2 justify-center lg:justify-start">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25">🔒 Encrypted Records</span>
              <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25">🏛️ Multi-District Ready</span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25">⚡ Real-Time MIS</span>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#111728]/85 backdrop-blur-2xl border border-slate-700/60 rounded-[32px] p-6 sm:p-8 lg:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative">
            
            {/* Card Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center shadow-inner">
                  <svg
                    className="w-5 h-5 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <span
                  onClick={handleHeaderClick}
                  title="Optometry Reporting"
                  className="text-2xl font-bold tracking-tight text-white cursor-pointer select-none hover:text-amber-200 transition"
                >
                  Optometry
                </span>
              </div>

              {/* Sleek Wynpro-style gold badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-yellow-500/20 border border-amber-300/40 text-amber-200 text-xs font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <svg className="w-3.5 h-3.5 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                </svg>
                <span>PORTAL</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl flex items-center gap-2 leading-relaxed">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* DISTRICT */}
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  District *
                </label>
                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setInstitution("");
                      setError("");
                    }}
                    className="w-full bg-[#182138]/90 border border-slate-700/80 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#111728] text-gray-400">
                      Select District
                    </option>
                    {Object.keys(districtInstitutions).map((d) => (
                      <option key={d} value={d} className="bg-[#111728] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* INSTITUTION */}
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Institution *
                </label>
                <div className="relative">
                  <select
                    value={institution}
                    onChange={(e) => {
                      setInstitution(e.target.value);
                      setError("");
                    }}
                    disabled={!district}
                    className="w-full bg-[#182138]/90 border border-slate-700/80 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-[#111728] text-gray-400">
                      Select Institution
                    </option>
                    {institutionOptions.map((i) => (
                      <option key={i} value={i} className="bg-[#111728] text-white">
                        {i}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* REGISTERED EMAIL */}
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
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
                  className="w-full bg-[#182138]/90 border border-slate-700/80 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                  autoComplete="email"
                />
              </div>

              {/* PASSWORD WITH EYE REVEAL */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300 font-semibold">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 transition font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter password"
                    className="w-full bg-[#182138]/90 border border-amber-500/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-white placeholder-slate-500 outline-none transition shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER DEVICE TOGGLE */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300 transition">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rememberDevice}
                    onClick={() => setRememberDevice(!rememberDevice)}
                    className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                      rememberDevice ? "bg-amber-500" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        rememberDevice ? "translate-x-3.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span>Remember District & Institution</span>
                </label>
              </div>

              {/* WYNPRO GRADIENT PRIMARY CTA BUTTON */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full mt-1.5 py-3.5 px-4 rounded-full font-bold text-sm tracking-wide text-white transition-all duration-300 shadow-[0_4px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(90deg, #122247 0%, #292d3f 40%, #c49233 75%, #e9ba55 100%)",
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Sign in to Optometry Portal →</span>
                )}
              </button>

              {/* REGISTER LINK */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onShowRegister}
                  className="text-xs text-amber-300 hover:text-amber-200 transition font-semibold cursor-pointer"
                >
                  New Optometrist? Register with your Email ID here →
                </button>
              </div>
            </form>

            {/* GUEST PREVIEW */}
            <div className="mt-4 pt-3.5 border-t border-slate-700/50 text-center">
              <button
                type="button"
                onClick={handleGuestLogin}
                className="w-full py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>👁️</span> Continue as Guest (Preview Only)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* HIDDEN SECRET DEVELOPER / ADMIN ACCESS MODAL (WYNPRO DARK STYLE) */}
      {isSecretAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111728] border border-slate-700 rounded-[28px] shadow-2xl max-w-sm w-full p-6 text-slate-100 relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center text-white text-sm shadow">
                  🔒
                </div>
                <h3 className="text-base font-bold text-white">Developer Access</h3>
              </div>
              <button
                onClick={() => {
                  setIsSecretAdminOpen(false);
                  setSecretAdminPass("");
                  setSecretAdminError("");
                }}
                className="text-slate-400 hover:text-white text-xl font-bold leading-none p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter developer master password to unlock all institutions and the approvals dashboard.
            </p>

            <form onSubmit={handleSecretAdminSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-900 text-white focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              {secretAdminError && (
                <div className="p-2.5 text-xs text-red-300 bg-red-950/60 border border-red-500/40 rounded-xl">
                  ⚠️ {secretAdminError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSecretAdminOpen(false)}
                  className="w-1/2 py-2.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 py-2.5 text-xs text-white bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 font-semibold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-[#111728] border border-slate-700 px-8 py-6 rounded-2xl shadow-2xl max-w-sm text-center">
            <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
            <p className="mt-4 text-white font-bold text-base">Signing you in...</p>
            <p className="mt-1 text-xs text-slate-400">
              Please wait while authenticating your account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
