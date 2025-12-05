import React, { useState, useMemo } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";
import rightImage from "../assets/optometrist-right.png";

const REQUIRED_PASSWORD = "123";

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

    try {
      // 1️⃣ Try to wake backend quickly (ignore failure)
      await warmUpBackend();

      const payload = {
        username: institution.trim(), // keep sending username
        institution: institution.trim(),
        district: district.trim(),
        password,
      };

      console.log("Login → POST", `${API_BASE}/api/login`, payload);

      // 2️⃣ One login request with 20s timeout
      const res = await fetchWithTimeout(
        `${API_BASE}/api/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        20000 // 20 seconds
      );

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON body, ignore
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          raw ||
          `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(msg);
      }

      const user = data.user || data;
      if (!user?.district || !user?.institution) {
        throw new Error("Malformed login response from server.");
      }

      onLogin(user); // ✅ success
    } catch (err) {
      console.warn("Login failed:", err);

      if (err.name === "AbortError") {
        setError(
          "Server did not respond in time. Please open " +
            `${API_BASE}/api/ping` +
            " in a browser tab to wake it, then try again."
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
        <div className="w-full md:w-1/2 p-6 md:p-8 space-y-4 bg-white">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#134074]">
            Optometry Monthly Reporting
          </h2>

          {process.env.NODE_ENV === "development" && (
            <div className="text-[10px] text-gray-500 text-center break-all">
              API: {API_BASE}
            </div>
          )}

          {/* DISTRICT */}
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
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* INSTITUTION */}
          <label className="block text-sm text-gray-700">Institution</label>
          <select
            value={institution}
            onChange={(e) => {
              setInstitution(e.target.value);
              setError("");
            }}
            disabled={!district}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select Institution</option>
            {institutionOptions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          {/* PASSWORD */}
          <label className="block text-sm text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none"
            autoComplete="current-password"
          />

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          {/* LOGIN BUTTON */}
          <button
            onClick={handleLogin}
            disabled={!district || !institution || !password || isLoading}
            className="w-full py-2 bg-green-700 hover:bg-green-800 text-white rounded-md shadow-md transition disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          {/* REGISTER */}
          <div className="text-center mt-2">
            <button
              onClick={onShowRegister}
              className="text-sm text-blue-600 hover:underline"
            >
              New Optometrist? Register here
            </button>
          </div>

          <hr className="my-2" />

          {/* GUEST LOGIN */}
          <div className="text-center">
            <button
              onClick={handleGuestLogin}
              className="text-sm text-gray-700 border border-gray-400 px-4 py-2 rounded hover:bg-gray-100"
            >
              👁️ Continue as Guest
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="w-full md:w-1/2 bg-[#0b2e59]/5">
          <img
            src={rightImage}
            alt="Optometrist"
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* LOADER OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            <p className="mt-3 text-white font-medium animate-pulse">
              Signing you in...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
