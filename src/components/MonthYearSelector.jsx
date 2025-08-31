import React from "react";

const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

export default function MonthYearSelector({ month, year, setMonth, setYear, disabled }) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="mb-2 flex gap-2 items-center font-serif">
      <label className="text-[#134074] font-semibold">Month:</label>
      <select
        value={month}
        onChange={e => setMonth(e.target.value)}
        disabled={disabled}
        className="border rounded p-1"
      >
        <option value="">Select</option>
        {MONTHS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <label className="text-[#134074] font-semibold ml-4">Year:</label>
      <select
        value={year}
        onChange={e => setYear(e.target.value)}
        disabled={disabled}
        className="border rounded p-1"
      >
        <option value="">Select</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
