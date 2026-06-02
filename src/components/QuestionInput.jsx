import React from "react";

export default function QuestionInput({ q, value, onChange, disabled }) {
  const val = value ?? "";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-3 border-b border-gray-100">
      <label className="text-gray-800 font-medium text-sm sm:text-base leading-tight">
        {q?.label || "Question"}
      </label>
      <input
        type="number"
        className="w-full sm:w-48 border border-gray-300 rounded-md p-2 text-right text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        value={val}
        min="0"
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
