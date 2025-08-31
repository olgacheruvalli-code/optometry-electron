import React, { useState } from "react";

export default function VisionCenterTableStandalone() {
  const [rows, setRows] = useState([
    { name: "" },
    { name: "" }
  ]);
  return (
    <div>
      <table border="1" cellPadding={5}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name (letters only)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td>{rowIdx + 1}</td>
              <td>
                <input
                  type="text"
                  inputMode="text"
                  pattern="[a-zA-Z\s]*"
                  value={typeof row.name === "string" ? row.name : ""}
                  placeholder="Enter name"
                  onChange={e => {
                    const val = e.target.value;
                    if (!/^[a-zA-Z\s]*$/.test(val)) return;
                    setRows(r => {
                      const updated = [...r];
                      updated[rowIdx] = { ...updated[rowIdx], name: val };
                      return updated;
                    });
                  }}
                  autoComplete="off"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}