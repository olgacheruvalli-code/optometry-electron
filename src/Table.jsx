// src/components/Table.jsx
import React from 'react';
import './Table.css'; // Ensure this path is correct

const Table = ({ data, columns }) => {
  return (
    <div className="a4-wrapper">
      <table className="table-auto">
        <thead>
          <tr>
            {columns.map((column, idx) => (
              <th key={idx} className="sticky left-0">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIdx) => (
                <td key={colIdx} className={`sticky left-0 ${column === 'description' ? 'description' : ''}`}>
                  {row[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;