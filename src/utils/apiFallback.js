import API_BASE from "../apiBase";

/**
 * Update a report by ID, trying several routes so it works
 * with older or newer backends.
 */
export async function updateReportById(id, payload) {
  const candidates = [
    { url: `${API_BASE}/api/reports/${id}`, method: "PUT" },   // new route
    { url: `${API_BASE}/api/report/${id}`,  method: "PUT" },   // old singular route
    { url: `${API_BASE}/api/reports/update`, method: "POST" }, // legacy fallback
  ];

  for (const { url, method } of candidates) {
    try {
      const body = method === "POST" ? { id, ...payload } : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        return await res.json().catch(() => ({}));
      }
      // If 404/405/etc., just try the next candidate
    } catch (_err) {
      // Network/other error — try next route
    }
  }

  throw new Error("route_not_found");
}
