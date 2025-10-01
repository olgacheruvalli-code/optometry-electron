import React from "react";

export default function ViewInstitutionWiseReport({ questions = [], institutionNames = [], data = [], districtPerformance = {}, month, year }) {
  const header = ["Description", ...institutionNames.flatMap(n=>[`${n} (Month)`, `${n} (Cumulative)`]), "District (Month)", "District (Cumulative)"];
  return (
    <div className="overflow-auto">
      <table className="table-auto w-full text-sm border border-black">
        <thead>
          <tr>{header.map((h,i)=><th key={i} className="border p-1 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {questions.map((label, i)=>{
            const row = [label];
            institutionNames.forEach((name)=>{
              const rec = data.find(d=>d.institution===name);
              row.push(rec?.monthData?.[i] ?? 0, rec?.cumulativeData?.[i] ?? 0);
            });
            row.push(districtPerformance?.monthData?.[i] ?? 0, districtPerformance?.cumulativeData?.[i] ?? 0);
            return (
              <tr key={i}>
                {row.map((cell, j)=> <td key={j} className="border p-1">{cell}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
