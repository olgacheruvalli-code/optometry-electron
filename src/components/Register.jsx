import React from "react";

export default function Register({ onRegister }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 bg-white rounded shadow">
        <div className="mb-3 font-semibold">Registration (stub)</div>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={() => onRegister && onRegister()}
        >
          Done
        </button>
      </div>
    </div>
  );
}
