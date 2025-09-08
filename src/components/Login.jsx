// src/components/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../apiBase";
import { districtInstitutions } from "../data/districtInstitutions";
import rightImage from "../assets/optometrist-right.png";

const REQUIRED_PASSWORD = "123";
const LS_LAST_DIST = "opt_last_district";
const LS_LAST_INST = "opt_last_institution";
const LS_REMEMBER = "opt_login_remember";

export default function Login({ onLogin, onShowRegister }) {
  const [district, setDistrict] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_REMEMBER) || "true"); } catch { return true; }
  });
  const [apiStatus, setApiStatus] = useState({ up: false, version: "", checking: true });

  const instOptions = useMemo(
    () => (district ? districtInstitutions[district] || [] : []),
    [district]
  );

  useEffect(() => {
    // prefill
    try {
      const d = localStorage.getItem(LS_LAST_DIST) || "";
      const i = localStorage.getItem(LS_LAST_INST) || "";
      if (d && districtInstitutions[d]) {
        setDistrict(d);
        if (i && (districtInstitutions[d] || []).includes(i)) setInstitution(i);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // auto-pick single option
    if (district) {
      const opts = districtInstitutions[district] || [];
      if (opts.length === 1) setInstitution(opts[0]);
      if (institution && !opts.includes(institution)) setInstitution("");
    } else {
      setInstitution("");
    }
    // eslint-disable-next-line
  }, [district]);

  useEffect(() => {
    // ping version
    let stop = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/version`);
        const j = await r.json().catch(() => ({}));
        if (!stop) setApiStatus({ up: r.ok, version: j?.version || "", checking: false });
      } catch {
        if (!stop) setApiStatus({ up: false, version: "", checking: false });
      }
    })();
    return () => { stop = true; };
  }, []);

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    let data = {};
    try { data = JSON.parse(txt); } catch {}
    return { res, data, txt };
  }

  async function handleLogin() {
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
      district: district.trim(),
      institution: institution.trim(),
      password,
    };

    try {
      const { res, data } = await postJSON(`${API_BASE}/api/login`, payload);
      if (!res.ok || data?.ok === false || data?.error) {
        setIsLoading(false);
        setError(data?.error || `Login failed (${res.status}).`);
        return;
      }
      if (remember) {
        localStorage.setItem(LS_LAST_DIST, district);
        localStorage.setItem(LS_LAST_INST, institution);
      } else {
        localStorage.removeItem(LS_LAST_DIST);
        localStorage.removeItem(LS_LAST_INST);
      }
      localStorage.setItem(LS_REMEMBER, JSON.stringify(remember));
      onLogin(data.user || data);
    } catch (e) {
      setError("Could not connect to server.");
      setIsLoading(false);
    }
  }

  const handleGuest = () => onLogin({ district: "Guest", institution: "Guest User", isGuest: true });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e9f1f8] to-[#f7fafc] font-serif p-6">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl border border-gray-100">
        {/* left */}
        <div className="w-full md:w-1/2 p-8 space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-[#134074] uppercase tracking-wide">
            Optometry Monthly<br/>Reporting
          </h2>
          <div className="text-[11px] text-center text-gray-500">
            API: {API_BASE} • {apiStatus.checking ? "checking…" : (apiStatus.up ? `online (${apiStatus.version})` : "offline")}
          </div>

          <label className="block text-sm">District</label>
          <select
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setInstitution(""); setError(""); }}
            className="w-full px-3 py-2 rounded bg-gray-100 focus:outline-none"
          >
            <option value="">Select District</option>
            {Object.keys(districtInstitutions).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <label className="block text-sm">Institution</label>
          <select
            value={institution}
            onChange={(e) => { setInstitution(e.target.value); setError(""); }}
            disabled={!district}
            className="w-full px-3 py-2 rounded bg-gray-100 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select Institution</option>
            {instOptions.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>

          <label className="block text-sm">Password</label>
          <div className="flex gap-2">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              className="w-full px-3 py-2 rounded bg-gray-100 focus:outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember my district & institution
          </label>

          {error && <div className="text-sm text-red-600 text-center">{error}</div>}

          <button
            onClick={handleLogin}
            disabled={!district || !institution || !password || isLoading}
            className="w-full py-2 bg-green-700 hover:bg-green-800 text-white rounded-md shadow-md transition disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center mt-2">
            <button onClick={onShowRegister} className="text-sm text-blue-600 hover:underline">
              New Optometrist? Register here
            </button>
          </div>

          <hr className="my-2" />

          <div className="text-center">
            <button onClick={handleGuest} className="text-sm text-gray-700 border border-gray-400 px-4 py-2 rounded hover:bg-gray-100">
              👁️ Continue as Guest
            </button>
          </div>
        </div>

        {/* right image */}
        <div className="w-full md:w-1/2 bg-[#0b2e59]/5">
          <img src={rightImage} alt="Optometrist examining patient" className="object-cover w-full h-full" />
        </div>
      </div>
    </div>
  );
}
