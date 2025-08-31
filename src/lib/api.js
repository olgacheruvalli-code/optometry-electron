import API_BASE from "../apiBase";

export const ALL_QUESTION_KEYS = Array.from({ length: 84 }, (_, i) => `q${i + 1}`);

const ZERO = Object.fromEntries(ALL_QUESTION_KEYS.map(k => [k, 0]));

function withDefaults(doc = {}) {
  // critical: defaults first, then fetched values (so fetched values WIN)
  const answers = { ...ZERO, ...(doc.answers || {}) };
  const cumulative = { ...ZERO, ...(doc.cumulative || {}) };
  return { ...doc, answers, cumulative };
}

async function j(resp) {
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(t || `${resp.status}`);
  }
  return resp.json();
}

export async function getReportById(id) {
  const data = await j(await fetch(`${API_BASE}/api/reports/${id}`));
  return withDefaults(data.doc || data);
}

export async function getReport(params) {
  const url = new URL(`${API_BASE}/api/report`);
  Object.entries(params || {}).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const data = await j(await fetch(url));
  return withDefaults(data.doc || data);
}

export async function listReports(params) {
  const url = new URL(`${API_BASE}/api/reports`);
  Object.entries(params || {}).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const arr = await j(await fetch(url));
  // Keep _id while normalizing answers/cumulative
  return (arr || []).map(d => ({ ...withDefaults(d), _id: d._id }));
}

export async function saveReport(payload, usePlural = true) {
  const path = usePlural ? "/api/reports" : "/api/report";
  const data = await j(await fetch(`${API_BASE}${path}?merge=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  }));
  return withDefaults(data.doc || data);
}
