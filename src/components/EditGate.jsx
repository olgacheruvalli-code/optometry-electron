// src/components/EditGate.jsx
import React, { useMemo, useState } from "react";

/**
 * Gate for the Edit page.
 * Unlocks with:
 *  - process.env.REACT_APP_EDIT_PASSWORD (if set at build time), OR
 *  - "amma1970" (fallback), OR
 *  - "amma@1970" (legacy fallback)
 */
export default function EditGate({ user, children }) {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("__edit_unlocked") === "1");
  const [error, setError] = useState("");

  const ACCEPT = useMemo(() => {
    const env = (process.env.REACT_APP_EDIT_PASSWORD || "").trim();
    const list = [env, "amma1970", "amma@1970"]
      .filter(Boolean)
      .map((s) => s.normalize("NFKC").trim());
    return new Set(list);
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    const input = (pw || "").normalize("NFKC").trim();
    if (ACCEPT.has(input)) {
      localStorage.setItem("__edit_unlocked", "1");
      setUnlocked(true);
      setError("");
    } else {
      setError("Wrong password.");
    }
  };

  const handleClear = () => {
    localStorage.removeItem("__edit_unlocked");
    setPw("");
    setUnlocked(false);
    setError("");
  };

  if (!unlocked) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow font-serif">
        <h2 className="text-2xl font-bold text-[#134074] mb-4">Edit Saved Report</h2>

        <form onSubmit={handleUnlock} className="flex gap-2 items-center">
          <input
            type="password"
            className="border rounded px-3 py-2 flex-1"
            placeholder="Enter Edit Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          <button type="submit" className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700">
            Unlock
          </button>
          <button type="button" className="px-4 py-2 rounded border" onClick={handleClear}>
            Clear / Change
          </button>
        </form>

        {error && <div className="text-red-600 mt-2">🔒 {error}</div>}

        <div className="text-sm text-gray-500 mt-3">
          Hint: use the current edit password (env) or <code>amma1970</code>.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
