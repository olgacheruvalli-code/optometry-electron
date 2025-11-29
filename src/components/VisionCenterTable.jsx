import React from "react";

// helpers
const read = (row, keys, fallback = "") => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
};
const toInt = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function VisionCenterTable({
  data = [],
  onChange,
  disabled = false,
  showInstitution = false,
}) {
  const rows = Array.isArray(data) ? data : [];

  const handle = (rowIdx, key, value) => {
    if (!onChange) return;
    onChange(rowIdx, key, value);
  };

  const totals = rows.reduce(
    (a, r) => {
      a.patientsExamined += toInt(read(r, ["patientsExamined", "No of patients examined"], 0));
      a.cataract        += toInt(read(r, ["cataract", "No of Cataract cases detected"], 0));
      a.otherEye        += toInt(read(r, ["otherEye", "No of other eye diseases"], 0));
      a.refractive      += toInt(read(r, ["refractive", "No of Refractive errors"], 0));
      a.spectacles      += toInt(read(r, ["spectacles", "No of Spectacles Prescribed"], 0));
      return a;
    },
    { patientsExamined: 0, cataract: 0, otherEye: 0, refractive: 0, spectacles: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-black text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border border-black px-2 py-1 w-10">Sl.No.</th>
            {showInstitution && (
              <th className="border border-black px-2 py-1">Name of Institution</th>
            )}
            <th className="border border-black px-2 py-1">Name of Vision Centre</th>
            <th className="border border-black px-2 py-1">No. of patients examined</th>
            <th className="border border-black px-2 py-1">No. of Cataract cases detected</th>
            <th className="border border-black px-2 py-1">No. of other eye diseases</th>
            <th className="border border-black px-2 py-1">No. of Refractive errors</th>
            <th className="border border-black px-2 py-1">No. of Spectacles Prescribed</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: Math.max(10, rows.length) }).map((_, i) => {
            const r = rows[i] || {};
            const sl = i + 1;

            const institution = read(r, ["institution", "nameOfInstitution"], "");
            const centerName = read(r, ["centerName", "visionCenter", "Name of Vision Centre"], "");
            const patientsExamined = read(r, ["patientsExamined", "No of patients examined"], 0);
            const cataract   = read(r, ["cataract", "No of Cataract cases detected"], 0);
            const otherEye   = read(r, ["otherEye", "No of other eye diseases"], 0);
            const refractive = read(r, ["refractive", "No of Refractive errors"], 0);
            const spectacles = read(r, ["spectacles", "No of Spectacles Prescribed"], 0);

            return (
              <tr key={i}>
                <td className="border border-black px-2 py-1 text-center">{sl}</td>

                {showInstitution && (
                  <td className="border border-black px-2 py-1">
                    <input
                      type="text"
                      className="w-full outline-none"
                      value={institution}
                      onChange={(e) => handle(i, "institution", e.target.value)}
                      disabled={disabled}
                      placeholder="Enter institution"
                    />
                  </td>
                )}

                <td className="border border-black px-2 py-1">
                  <input
                    type="text"
                    className="w-full outline-none"
                    value={centerName}
                    onChange={(e) => handle(i, "centerName", e.target.value)}
                    disabled={disabled}
                    placeholder="Enter vision centre name"
                  />
                </td>

                {[
                  ["patientsExamined", patientsExamined],
                  ["cataract", cataract],
                  ["otherEye", otherEye],
                  ["refractive", refractive],
                  ["spectacles", spectacles],
                ].map(([key, val]) => {
                  // 🧠 If this cell has never been touched (no value in row),
                  // show it as blank "" instead of 0 for easier entry.
                  const displayVal =
                    r[key] === undefined || r[key] === null || r[key] === ""
                      ? ""
                      : val;

                  return (
                    <td key={key} className="border border-black px-2 py-1">
                      <input
                        type="number"
                        className="w-full text-right outline-none"
                        value={displayVal}
                        onChange={(e) => handle(i, key, e.target.value)}
                        disabled={disabled}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}

          <tr className="bg-gray-50 font-semibold">
            <td
              className="border border-black px-2 py-1 text-center"
              colSpan={showInstitution ? 2 : 1}
            >
              Total
            </td>
            <td className="border border-black px-2 py-1" />
            <td className="border border-black px-2 py-1 text-right">
              {totals.patientsExamined}
            </td>
            <td className="border border-black px-2 py-1 text-right">
              {totals.cataract}
            </td>
            <td className="border border-black px-2 py-1 text-right">
              {totals.otherEye}
            </td>
            <td className="border border-black px-2 py-1 text-right">
              {totals.refractive}
            </td>
            <td className="border border-black px-2 py-1 text-right">
              {totals.spectacles}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
