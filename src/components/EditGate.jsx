import React, { useEffect, useState } from "react";

/** ONLY FOR EDIT MENU */
const EDIT_PASSWORD = "amma@1970";              // shared password
const STORAGE_KEY   = "edit_gate_ok_v1";        // localStorage key
const SESSION_MS    = 8 * 60 * 60 * 1000;       // 8 hours

function isSessionValid() {
  try {
    const until = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(until) && Date.now() < until;
  } catch { return false; }
}

export default function EditGate({ children }) {
  const [unlocked, setUnlocked] = useState(isSessionValid());
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const tryUnlock = (e) => {
    e?.preventDefault();
    if (pwd === EDIT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + SESSION_MS));
      setUnlocked(true);
      setPwd("");
      setError("");
    } else {
      setError("Wrong password. Please try again.");
    }
  };

  const lock = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setPwd("");
    setError("");
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 rounded-xl bg-white shadow font-serif">
        <h2 className="text-xl font-bold text-[#134074] mb-2">Enter Edit Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          Editing is restricted. Enter the shared password to continue.
        </p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#396b84] text-white hover:bg-[#2f5a70]"
          >
            Unlock Edit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={lock}
          className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
        >
          Lock Edit
        </button>
      </div>
      {children}
    </div>
  );
}
