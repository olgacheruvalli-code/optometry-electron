// src/components/Login.jsx
import React, { useState, useMemo } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";
import rightImage from "../assets/optometrist-right.png";

const REQUIRED_PASSWORD = "123";

export default function Login({ onLogin, onShowRegister }) {
  const [district, setDistrict] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const institutionOptions = useMemo(() => {
    if (!district) return [];
    const base = Array.isArray(districtInstitutions[district])
      ? districtInstitutions[district]
      : [];

    // Ensure DOC/DC options always exist for the chosen district
    const injected = [`DOC ${district}`, `DC ${district}`, ...base];

    const seen = new Set();
    const out = [];
    for (const name of injected) {
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

  const handleLogin = async () => {
    if (!district || !institution || !password) {
      setError("Please select district, institution, and enter password.");
      return;
    }
    if (password.trim() !== REQUIRED_PASSWORD) {
      setError("Incorrect password.");
      return;
    }

    setError("");
    setIsLoading(true);

    const payload = {
      institution: institution.trim(),
      district: district.trim(),
      password,
    };

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}

      if (!res.ok) {
        const msg = data?.error || raw || `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(msg);
      }

      const user = data.user || data;
      if (!user || !user.district || !user.institution) {
        throw new Error("Malformed login response from server.");
      }
      onLogin(user);
    } catch (err) {
      setError(err?.name === "AbortError"
        ? "Login request timed out. Please try again."
        : (err?.message || "Login failed."));
      console.error("Login error:", err);
    } finally {
      clearTimeout(t);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({ district: "Guest", institution: "Guest User", isGuest: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl border border-gray-100">
        <div className="w-full md:w-1/2 p-6 md:p-8 space-y-4 bg-white">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#134074]">
            Optometry Monthly Reporting
          </h2>

          <div className="text-[10px] text-gray-500 text-center break-all">
            API: {API_BASE}
          </div>

          {/* District */}
          <label className="block text-sm text-gray-700">District</label>
          <select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setInstitution("");
              setError("");
            }}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none"
          >
            <option value="">Select District</option>
            {Object.keys(districtInstitutions).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Institution */}
          <label className="block text-sm text-gray-700">Institution</label>
          <select
            value={institution}
            onChange={(e) => { setInstitution(e.target.value); setError(""); }}
            disabled={!district}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select Institution</option>
            {institutionOptions.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {/* Password */}
          <label className="block text-sm text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none"
            autoComplete="current-password"
          />

          {error && <div className="text-sm text-red-600 text-center">{error}</div>}

          <button
            onClick={handleLogin}
            disabled={!district || !institution || !password || isLoading}
            className="w-full py-2 bg-green-700 hover:bg-green-800 text-white rounded-md shadow-md transition disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center mt-2">
            <button onClick={onShowRegister} className="text-sm text-blue-600 hover:underline" type="button">
              New Optometrist? Register here
            </button>
          </div>

          <hr className="my-2" />

          {/* Guest Login */}
          <div className="text-center">
            <button
              onClick={handleGuestLogin}
              className="text-sm text-gray-700 border border-gray-400 px-4 py-2 rounded hover:bg-gray-100"
              type="button"
            >
              👁️ Continue as Guest
            </button>
          </div>
        </div>

        {/* Right: Image */}
        <div className="w-full md:w-1/2 bg-[#0b2e59]/5">
          <img src={rightImage} alt="Optometrist examining patient" className="object-cover w-full h-full" />
        </div>
      </div>
    </div>
  );
}
