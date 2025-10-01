import React from "react";

export default function QuestionInput({ q, value, onChange, disabled }) {
  const val = value ?? "";
  return (
    <div className="flex items-center gap-3">
      <label className="flex-1">{q?.label || "Question"}</label>
      <input
        type="number"
        className="w-40 border rounded p-2 text-right"
        value={val}
        min="0"
        onChange={(e)=>onChange?.(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
