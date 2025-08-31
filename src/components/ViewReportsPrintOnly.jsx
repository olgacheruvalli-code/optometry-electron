// src/components/ViewReportsPrintOnly.jsx
import React from "react";
import { sections } from "../data/questions";

export default function ViewReportsPrintOnly({ reportData, month, year }) {
  const computeCumulative = (key, subkey = null) => {
    return reportData.cumulative?.[subkey ? `${key}_${subkey}` : key] ?? 0;
  };

  const reordered = [];
  for (const sec of sections.filter(s => typeof s.title === "string")) {
    if (sec.title === "II. SCHOOL EYE HEALTH") {
      reordered.push(sec);
      const eb = sections.find(s => s.title === "III. EYE BANK PERFORMANCE");
      if (eb) reordered.push(eb);
    } else if (sec.title !== "III. EYE BANK PERFORMANCE") {
      reordered.push(sec);
    }
  }

  return (
    <div className="text-black text-[12pt] leading-relaxed">
      {reordered.map((sec, i) => (
        <div key={sec.title || i} className="mb-6 break-inside-avoid-page">
          <h4 className="text-[13pt] font-bold mb-2 border-b border-gray-400 pb-1">{sec.title}</h4>

          {sec.table ? (
            <table className="table-auto w-full text-[11pt] border border-black mb-4">
              <thead>
                <tr className="bg-gray-200">
                  {sec.columns.map((col) => (
                    <th key={col} className="border p-1 text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {Object.keys(row).includes("status") ? (
                      <>
                        <td className="border p-1">{row.status}</td>
                        {row.data.map((key, colIdx) => (
                          <td key={colIdx} className="border p-1 text-right">
                            {reportData.eyeBank?.[rowIdx]?.[key] || 0}
                          </td>
                        ))}
                      </>
                    ) : (
                      <>
                        <td className="border p-1 text-center">{row.slNo}</td>
                        {["nameKey", "examinedKey", "cataractKey", "otherDiseasesKey", "refractiveErrorsKey", "spectaclesPrescribedKey"].map((k) => (
                          <td key={k} className="border p-1 text-right">
                            {reportData.visionCenter?.[rowIdx]?.[row[k]] || 0}
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table-auto w-full text-[11pt] border border-black mb-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-1 text-left w-[70%]">Description</th>
                  <th className="border p-1 text-right w-[15%]">During the Month</th>
                  <th className="border p-1 text-right w-[15%]">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {[...(sec.questions || []), ...(sec.subsections || []).flatMap(sub =>
                  [{ isHeader: true, label: sub.title }, ...sub.questions]
                )].map((row, idx) => {
                  const key = row.key;
                  return (
                    <tr key={idx}>
                      <td className="border p-1">
                        {row.isHeader ? (
                          <span className="font-semibold underline">{row.label}</span>
                        ) : (
                          row.label
                        )}
                      </td>
                      <td className="border p-1 text-right">{reportData.answers?.[key] || 0}</td>
                      <td className="border p-1 text-right">{computeCumulative(key)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
