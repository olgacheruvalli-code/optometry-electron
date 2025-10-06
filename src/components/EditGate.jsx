// ./components/EditGate.jsx
import React, { useState } from "react";

/**
 * Admin gate for editing.
 * Reads from env first, then falls back to hardcoded default.
 *   Vite:  import.meta.env.VITE_ADMIN_EDIT_PASSWORD
 *   CRA:   process.env.REACT_APP_ADMIN_EDIT_PASSWORD
 */
const ENV_PASS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADMIN_EDIT_PASSWORD) ||
  process.env.REACT_APP_ADMIN_EDIT_PASSWORD ||
  "451970"; // <— change this default if you want

export default function EditGate({ children }) {
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");

  if (!ok) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 font-serif">
        <h2 className="text-2xl font-bold mb-4 text-[#134074]">Admin Edit</h2>
        <p className="text-sm text-gray-600 mb-3">
          This area is restricted. Enter the admin password to continue.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full border rounded p-2 mb-3"
          placeholder="Admin password"
        />
        <button
          onClick={() => {
            if (pw === ENV_PASS) setOk(true);
            else alert("❌ Wrong password.");
          }}
          className="px-4 py-2 rounded bg-[#134074] text-white hover:opacity-90"
        >
          Unlock
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
