import React, { useEffect, useState } from "react";
import API_BASE from "../../apiBase.js";

export default function AmblyopiaView({ user }) {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const fetchRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/amblyopia-research`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
        setFiltered(data);
      }
    } catch (err) {
      console.error("Amblyopia fetch error:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(records);
      return;
    }
    const s = search.toLowerCase();
    setFiltered(
      records.filter(
        (r) =>
          r.patientId?.toLowerCase().includes(s) ||
          r.institution?.toLowerCase().includes(s) ||
          r.age?.toString().includes(s) ||
          r.type?.toLowerCase().includes(s) ||
          r.outcome?.toLowerCase().includes(s)
      )
    );
  }, [search, records]);

  return (
    <div className="bg-white p-6 rounded shadow-lg font-serif">
      <h2 className="text-2xl font-bold text-center mb-4 text-[#134074]">
        View Amblyopia Research Records
      </h2>

      <div className="mb-4 flex justify-center">
        <input
          type="text"
          placeholder="Search Patient ID / Type / Outcome..."
          className="border p-2 rounded w-1/2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200 font-semibold">
            <tr>
              <th className="p-2 border">Patient ID</th>
              <th className="p-2 border">Age</th>
              <th className="p-2 border">Sex</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Degree</th>
              <th className="p-2 border">Outcome</th>
              <th className="p-2 border">Institution</th>
              <th className="p-2 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="border p-2">{r.patientId}</td>
                <td className="border p-2">{r.age}</td>
                <td className="border p-2">{r.sex}</td>
                <td className="border p-2">{r.type}</td>
                <td className="border p-2">{r.degree}</td>
                <td className="border p-2">{r.outcome}</td>
                <td className="border p-2">{r.institution}</td>
                <td className="border p-2">{new Date(r.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center mt-4 text-gray-600">No records found</div>
      )}
    </div>
  );
}
