// src/components/Login.jsx
import React, { useState } from "react";
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

  const institutionOptions = district ? districtInstitutions[district] || [] : [];

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
      username: institution.trim(),
      institution: institution.trim(),
      district: district.trim(),
      password,
    };

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsLoading(false);
        return setError(data.error || `Login failed (${res.status}).`);
      }

      // No localStorage writes (per request)
      onLogin(data.user || data);
    } catch (err) {
      console.error("Login request failed:", err);
      setError("❌ Could not connect to server.");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      district: "Guest",
      institution: "Guest User",
      isGuest: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl border border-gray-100">
        {/* Left: Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 space-y-4 bg-white">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#134074]">
            Optometry Monthly Reporting
          </h2>

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
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Institution */}
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

          {/* Password */}
          <label className="block text-sm text-gray-700">Password</label>
          <input
            type="password"
            placeholder=""          // blank placeholder per request
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            className="w-full px-3 py-2 rounded bg-gray-100 text-gray-800 focus:outline-none"
            autoComplete="current-password"
          />

          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={!district || !institution || !password || isLoading}
            className="w-full py-2 bg-green-700 hover:bg-green-800 text-white rounded-md shadow-md transition disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center mt-2">
            <button
              onClick={onShowRegister}
              className="text-sm text-blue-600 hover:underline"
            >
              New Optometrist? Register here
            </button>
          </div>

          <hr className="my-2" />

          {/* Guest Login */}
          <div className="text-center">
            <button
              onClick={handleGuestLogin}
              className="text-sm text-gray-700 border border-gray-400 px-4 py-2 rounded hover:bg-gray-100"
            >
              👁️ Continue as Guest
            </button>
          </div>
        </div>

        {/* Right: Image */}
        <div className="w-full md:w-1/2 bg-[#0b2e59]/5">
          <img
            src={rightImage}
            alt="Optometrist examining patient"
            className="object-cover w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
