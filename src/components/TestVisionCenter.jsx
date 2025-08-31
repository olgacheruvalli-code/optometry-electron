import React from "react";

// ✅ Local mock table config
const mockCfg = {
  columns: ["SL No", "Name", "Examined", "Cataract", "Other", "Ref Errors", "Specs"],
  rows: [
    {
      slNo: 1,
      nameKey: "vc1name",
      examinedKey: "vc1exam",
      cataractKey: "vc1cat",
      otherDiseasesKey: "vc1other",
      refractiveErrorsKey: "vc1ref",
      spectaclesPrescribedKey: "vc1spec",
    },
    {
      slNo: 2,
      nameKey: "vc2name",
      examinedKey: "vc2exam",
      cataractKey: "vc2cat",
      otherDiseasesKey: "vc2other",
      refractiveErrorsKey: "vc2ref",
      spectaclesPrescribedKey: "vc2spec",
    },
  ]
};

export default function TestVisionCenter() {
  const mockData = [
    {
      vc1name: "VC1",
      vc1exam: 40,
      vc1cat: 5,
      vc1other: 3,
      vc1ref: 12,
      vc1spec: 10,
    },
    {
      vc2name: "VC2",
      vc2exam: 38,
      vc2cat: 4,
      vc2other: 2,
      vc2ref: 11,
      vc2spec: 9,
    },
  ];

  const keys = [
    "nameKey",
    "examinedKey",
    "cataractKey",
    "otherDiseasesKey",
    "refractiveErrorsKey",
    "spectaclesPrescribedKey"
  ];

  return (
    <div className="p-6 bg-white font-serif">
      <h2 className="text-2xl font-bold text-center text-[#134074] mb-4">🔬 Test Vision Center Table</h2>
      <table className="min-w-full border-collapse border text-xs">
        <thead className="bg-blue-900 text-white">
          <tr>
            {mockCfg.columns.map(col => (
              <th key={col} className="border p-1 text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockCfg.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="bg-white hover:bg-yellow-50">
              <td className="border p-1 text-center">{row.slNo}</td>
              {keys.map(fieldKey => {
                const key = row[fieldKey];
                const val = mockData?.[rowIdx]?.[key];
                return (
                  <td key={key} className="border p-1 text-right text-black bg-white">
                    <input
                      type="text"
                      value={val ?? "0"}
                      disabled={true}
                      className="w-full px-1 py-0.5 border rounded text-right bg-white text-black"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
