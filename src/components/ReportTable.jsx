import React from 'react';

const mockData = [
  {
    id: 1,
    description: 'No. of patients examined',
    monthTotal: 150,
    cumulative: 600,
  },
  {
    id: 2,
    description: 'Spectacles prescribed',
    monthTotal: 80,
    cumulative: 310,
  },
];

function ReportTable() {
  return (
    <div>
      <h2>Submitted Report</h2>
      <table border="1">
        <thead>
          <tr>
            <th>SL No.</th>
            <th>Description</th>
            <th>During the Month</th>
            {/* Removed cumulative column header */}
          </tr>
        </thead>
        <tbody>
          {mockData.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>{row.description}</td>
              <td>{row.monthTotal}</td>
              {/* Removed cumulative value */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ReportTable;
