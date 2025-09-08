import React, { useMemo } from "react";

const toStr = (v) => (v == null ? "" : String(v));
const digits = (s) => String(s ?? "").replace(/[^\d]/g, "");

const DEFAULT_COLUMNS = [
  "Status",
  "No of Eyes collected during the month",
  "No of Eyes utilized for Keratoplasty",
  "No of Eyes used for Research purpose",
  "No of Eyes distributed to other Institutions",
  "No of Eye Donation Pledge forms received",
];

const KEYS = ["collected", "keratoplasty", "research", "distributed", "pledges"];

const DEFAULT_ROWS = [
  { status: "Eye Bank", collected: "", keratoplasty: "", research: "", distributed: "", pledges: "" },
  { status: "Eye Collection Centre", collected: "", keratoplasty: "", research: "", distributed: "", pledges: "" },
];

export default function EyeBankTable({
  data = [],
  onChange = () => {},
  disabled = false,
  columns,
}) {
  // Accept multiple historical key shapes when reading existing docs
  const rows = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return DEFAULT_ROWS;
    return data.map((r, idx) => ({
      status: r?.status ?? DEFAULT_ROWS[idx]?.status ?? "",
      collected: r?.collected ?? r?.eye_bank_collected ?? r?.eb_collected ?? "",
      keratoplasty: r?.keratoplasty ?? r?.eye_bank_keratoplasty ?? r?.eb_keratoplasty ?? "",
      research: r?.research ?? r?.eye_bank_research ?? r?.eb_research ?? "",
      distributed: r?.distributed ?? r?.eye_bank_distributed ?? r?.eb_distributed ?? "",
      pledges: r?.pledges ?? r?.eye_bank_pledges ?? r?.eb_pledges ?? "",
    }));
  }, [data]);

  const cols = Array.isArray(columns) && columns.length >= 6 ? columns : DEFAULT_COLUMNS;

  const write = (rowIdx, key, val) => onChange(rowIdx, key, digits(val));

  return (
    <div className="overflow-x-auto mb-6 font-serif">
      <table className="min-w-full border-collapse border border-gray-300 text-[12pt]">
        <thead className="bg-gray-50 text-[#134074]">
          <tr>
            <th className="border px-2 py-1 text-left">{cols[0]}</th>
            {cols.slice(1).map((c, i) => (
              <th key={i} className="border px-2 py-1 text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="even:bg-gray-50">
              <td className="border px-2 py-1 font-semibold bg-gray-50">{row.status}</td>
              {KEYS.map((k) => (
                <td key={k} className="border px-2 py-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full px-2 py-1 bg-gray-100 rounded text-right"
                    disabled={disabled}
                    value={toStr(row[k])}
                    onChange={(e) => write(ri, k, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
