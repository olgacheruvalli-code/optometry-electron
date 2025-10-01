import React, { useState } from "react";

function VisionCenterTableDebug({ data, onChange }) {
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name (letters only)</th>
          <th>Examined (numbers only)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx}>
            <td>{rowIdx + 1}</td>
            <td>
              <input
                type="text"
                inputMode="text"
                pattern="[a-zA-Z\s]*"
                autoComplete="off"
                value={typeof row.name === "string" ? row.name : ""}
                placeholder="Enter name"
                onChange={e => {
                  const inputVal = e.target.value;
                  // Debug
                  console.log(
                    "[NAME-DEBUG]",
                    "rowIdx:", rowIdx,
                    "val:", inputVal,
                    "typeof:", typeof inputVal
                  );
                  if (!/^[a-zA-Z\s]*$/.test(inputVal)) return;
                  onChange(rowIdx, "name", inputVal);
                }}
              />
            </td>
            <td>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={typeof row.examined === "string" ? row.examined : row.examined?.toString() || ""}
                placeholder="0"
                onChange={e => {
                  const inputVal = e.target.value.replace(/\D/g, "");
                  onChange(rowIdx, "examined", inputVal);
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function App() {
  const [data, setData] = useState([
    { name: "", examined: "" },
    { name: "", examined: "" }
  ]);
  return (
    <div>
      <VisionCenterTableDebug
        data={data}
        onChange={(rowIdx, key, value) => {
          setData(d => {
            const updated = [...d];
            updated[rowIdx] = { ...updated[rowIdx], [key]: value };
            return updated;
          });
        }}
      />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}