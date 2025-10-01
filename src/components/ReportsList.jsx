import React, { useEffect, useState } from 'react';

export default function ReportsList({ onSelect }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load reports:', err);
        setError('Could not load reports');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading reports...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h3 className="text-xl font-bold mb-2">Saved Reports</h3>
      <ul>
        {reports.map(r => (
          <li key={r._id} className="border-b py-2">
            <button
              className="w-full text-left hover:underline"
              onClick={() => onSelect(r)}
            >
              {r.month} {r.year} — {r.institution}, {r.district}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

