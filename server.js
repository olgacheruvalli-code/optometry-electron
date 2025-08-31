const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/optometry";

const FISCAL_MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March"
];
const ALL_QUESTION_KEYS = Array.from({ length: 84 }, (_, i) => `q${i+1}`);

function _num(v){ const x = Number(v); return Number.isFinite(x) ? x : 0; }
function _normalize84(obj = {}) {
  const out = {};
  for (const k of ALL_QUESTION_KEYS) out[k] = _num(obj[k]);
  return out;
}
function _empty84(){ return Array.from({length: ALL_QUESTION_KEYS.length}, () => 0); }
function _answersTo84Array(ans = {}) {
  const a = _normalize84(ans);
  return ALL_QUESTION_KEYS.map(k => _num(a[k]));
}
function _sum84(a = [], b = []) {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = _num(a[i]) + _num(b[i]);
  return out;
}
function _fiscalStartYear(month, year){
  return ["January","February","March"].includes(month) ? Number(year) - 1 : Number(year);
}
function _fiscalWindow(toMonth, toYear){
  const startY = _fiscalStartYear(toMonth, toYear);
  const window = [];
  for (let i = 0; i < FISCAL_MONTHS.length; i++) {
    const m = FISCAL_MONTHS[i];
    const y = i <= 8 ? startY : startY + 1;
    window.push({ month: m, year: String(y) });
    if (m === toMonth && String(y) === String(toYear)) break;
  }
  return window;
}

const ReportSchema = new mongoose.Schema({
  district: { type: String, required: true },
  institution: { type: String, required: true },
  month: { type: String, required: true, enum: FISCAL_MONTHS },
  year: { type: String, required: true },
  answers: { type: Object, default: {} },
  cumulative: { type: Object, default: {} },
  eyeBank: { type: Array, default: [] },
  visionCenter: { type: Array, default: [] }
}, { versionKey: false, timestamps: true });

ReportSchema.index({ district: 1, institution: 1, month: 1, year: 1 }, { unique: true });

const Report = mongoose.model("Report", ReportSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

let serverStartedAt = new Date();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/debug/who", (req, res) => {
  res.json({
    ok: true,
    pid: process.pid,
    file: __filename,
    startedAt: serverStartedAt.toISOString(),
    routes: [
      { path: "/api/health", methods: ["get"] },
      { path: "/api/debug/who", methods: ["get"] },
      { path: "/api/debug/check-q", methods: ["get"] },
      { path: "/api/district-institution-report", methods: ["get"] },
      { path: "/api/reports", methods: ["get", "post"] },
      { path: "/api/reports/:id", methods: ["get"] },
      { path: "/api/report", methods: ["get"] },
      { path: "/api/reports/space/all", methods: ["get"] },
      { path: "/api/reports/all", methods: ["delete"] },
      { path: "/api/login", methods: ["post"] }
    ]
  });
});

// /api/debug/check-q -- query any question key, filterable
app.get("/api/debug/check-q", async (req, res) => {
  try {
    const { key = "q20", district, institution, month, year } = req.query;
    const filter = {};
    if (district) filter.district = district;
    if (institution) filter.institution = institution;
    if (month) filter.month = month;
    if (year) filter.year = year;

    const docs = await Report.find(filter).lean();
    const rows = docs.map(d => ({
      district: d.district,
      institution: d.institution,
      month: d.month,
      year: d.year,
      value: _num(d.answers?.[key]),
      updatedAt: d.updatedAt || d.createdAt
    }));
    res.json({ ok: true, key, count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// /api/district-institution-report -- fiscal window, cumulative for district
app.get("/api/district-institution-report", async (req, res) => {
  try {
    const { district, month, year } = req.query;
    if (!district || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/month/year" });
    }

    const window = _fiscalWindow(month, String(year));
    const orPairs = window.map(w => ({ month: w.month, year: String(w.year) }));

    const docs = await Report.find({ district, $or: orPairs }).lean();

    const latestByInstMonth = new Map();
    for (const d of docs) {
      const k = `${d.institution}|${d.month}|${d.year}`;
      const prev = latestByInstMonth.get(k);
      const dTime = new Date(d.updatedAt || d.createdAt || 0).getTime();
      const pTime = prev ? new Date(prev.updatedAt || prev.createdAt || 0).getTime() : -1;
      if (!prev || dTime > pTime) latestByInstMonth.set(k, d);
    }

    const byInst = new Map();
    for (const d of latestByInstMonth.values()) {
      if (!byInst.has(d.institution)) byInst.set(d.institution, new Map());
      byInst.get(d.institution).set(`${d.month}-${d.year}`, d);
    }

    const institutionNames = Array.from(byInst.keys()).sort((a,b)=>a.localeCompare(b));
    const institutionData = [];
    let districtPerformance = { month: _empty84(), cumulative: _empty84() };

    for (const inst of institutionNames) {
      const perMonth = byInst.get(inst);

      const selKey = `${month}-${year}`;
      const selArr = _answersTo84Array(perMonth.get(selKey)?.answers || {});

      let cum = _empty84();
      for (const w of window) {
        const doc = perMonth.get(`${w.month}-${w.year}`);
        const arr = _answersTo84Array(doc?.answers || {});
        cum = _sum84(cum, arr);
      }

      institutionData.push({ institution: inst, monthData: selArr, cumulativeData: cum });
      districtPerformance.month = _sum84(districtPerformance.month, selArr);
      districtPerformance.cumulative = _sum84(districtPerformance.cumulative, cum);
    }

    res.json({
      ok: true,
      questions: ALL_QUESTION_KEYS,
      institutionNames,
      institutionData,
      districtPerformance
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// core report routes
app.get("/api/reports", async (req, res) => {
  try {
    const q = {};
    if (req.query.district) q.district = req.query.district;
    if (req.query.institution) q.institution = req.query.institution;
    if (req.query.month) q.month = req.query.month;
    if (req.query.year) q.year = req.query.year;

    const docs = await Report.find(q).sort({ year: 1, updatedAt: -1 }).lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/reports/:id", async (req, res) => {
  try {
    const doc = await Report.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/report", async (req, res) => {
  try {
    const { district, institution, month, year } = req.query;
    if (!district || !institution || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/institution/month/year" });
    }
    const doc = await Report.findOne({ district, institution, month, year }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, report: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// TRUE SAFE MERGE LOGIC HERE!
app.post("/api/reports", async (req, res) => {
  try {
    const { district, institution, month, year, answers = {}, cumulative = {}, eyeBank = [], visionCenter = [] } = req.body;
    if (!district || !institution || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/institution/month/year" });
    }

    const filter = { district, institution, month, year };
    let merge = String(req.query.merge ?? "").toLowerCase() === "1" || req.body.merge;

    let prevDoc = null;
    if (merge) {
      prevDoc = await Report.findOne(filter);
    }

    let baseAnswers = prevDoc ? _normalize84(prevDoc.answers) : _normalize84({});
    let incomingAnswers = _normalize84(answers);
    let finalAnswers = {};
    for (const k of ALL_QUESTION_KEYS) {
      finalAnswers[k] = merge
        ? ((answers[k] !== undefined) ? incomingAnswers[k] : baseAnswers[k])
        : incomingAnswers[k];
    }

    let baseCumulative = prevDoc ? _normalize84(prevDoc.cumulative || prevDoc.answers) : _normalize84({});
    let incomingCumulative = _normalize84(cumulative);
    let finalCumulative = {};
    for (const k of ALL_QUESTION_KEYS) {
      finalCumulative[k] = merge
        ? ((cumulative[k] !== undefined) ? incomingCumulative[k] : baseCumulative[k])
        : (Object.keys(cumulative).length ? incomingCumulative[k] : finalAnswers[k]);
    }

    const update = {
      district, institution, month, year,
      answers: finalAnswers,
      cumulative: finalCumulative,
      eyeBank: Array.isArray(eyeBank) ? eyeBank : [],
      visionCenter: Array.isArray(visionCenter) ? visionCenter : []
    };

    const doc = await Report.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/reports/space/all", async (req, res) => {
  try {
    const docs = await Report.find({}).lean();
    res.json({ ok: true, count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete("/api/reports/all", async (req, res) => {
  try {
    const r = await Report.deleteMany({});
    res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { district = "", institution = "", password = "" } = req.body || {};
    const role = institution.startsWith("DC ") ? "DOC" : "OPTOMETRIST";
    if (!district || !institution) return res.status(400).json({ ok: false, error: "Missing district/institution" });
    if (!password) return res.status(401).json({ ok: false, error: "Missing password" });
    res.json({
      ok: true,
      user: {
        district,
        institution,
        role,
        isGuest: false,
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "route_not_found", path: req.path });
});

(async () => {
  await mongoose.connect(MONGO_URI, { dbName: "optometry" });
  console.log("✅ Mongo connected");
  serverStartedAt = new Date();
  app.listen(PORT, () => {
    console.log(`🚀 API listening on http://localhost:${PORT}`);
  });
})();const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/optometry";

const FISCAL_MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March"
];
const ALL_QUESTION_KEYS = Array.from({ length: 84 }, (_, i) => `q${i+1}`);

function _num(v){ const x = Number(v); return Number.isFinite(x) ? x : 0; }
function _normalize84(obj = {}) {
  const out = {};
  for (const k of ALL_QUESTION_KEYS) out[k] = _num(obj[k]);
  return out;
}
function _empty84(){ return Array.from({length: ALL_QUESTION_KEYS.length}, () => 0); }
function _answersTo84Array(ans = {}) {
  const a = _normalize84(ans);
  return ALL_QUESTION_KEYS.map(k => _num(a[k]));
}
function _sum84(a = [], b = []) {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = _num(a[i]) + _num(b[i]);
  return out;
}
function _fiscalStartYear(month, year){
  return ["January","February","March"].includes(month) ? Number(year) - 1 : Number(year);
}
function _fiscalWindow(toMonth, toYear){
  const startY = _fiscalStartYear(toMonth, toYear);
  const window = [];
  for (let i = 0; i < FISCAL_MONTHS.length; i++) {
    const m = FISCAL_MONTHS[i];
    const y = i <= 8 ? startY : startY + 1;
    window.push({ month: m, year: String(y) });
    if (m === toMonth && String(y) === String(toYear)) break;
  }
  return window;
}

const ReportSchema = new mongoose.Schema({
  district: { type: String, required: true },
  institution: { type: String, required: true },
  month: { type: String, required: true, enum: FISCAL_MONTHS },
  year: { type: String, required: true },
  answers: { type: Object, default: {} },
  cumulative: { type: Object, default: {} },
  eyeBank: { type: Array, default: [] },
  visionCenter: { type: Array, default: [] }
}, { versionKey: false, timestamps: true });

ReportSchema.index({ district: 1, institution: 1, month: 1, year: 1 }, { unique: true });

const Report = mongoose.model("Report", ReportSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

let serverStartedAt = new Date();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/debug/who", (req, res) => {
  res.json({
    ok: true,
    pid: process.pid,
    file: __filename,
    startedAt: serverStartedAt.toISOString(),
    routes: [
      { path: "/api/health", methods: ["get"] },
      { path: "/api/debug/who", methods: ["get"] },
      { path: "/api/debug/check-q", methods: ["get"] },
      { path: "/api/district-institution-report", methods: ["get"] },
      { path: "/api/reports", methods: ["get", "post"] },
      { path: "/api/reports/:id", methods: ["get"] },
      { path: "/api/report", methods: ["get"] },
      { path: "/api/reports/space/all", methods: ["get"] },
      { path: "/api/reports/all", methods: ["delete"] },
      { path: "/api/login", methods: ["post"] }
    ]
  });
});

// /api/debug/check-q -- query any question key, filterable
app.get("/api/debug/check-q", async (req, res) => {
  try {
    const { key = "q20", district, institution, month, year } = req.query;
    const filter = {};
    if (district) filter.district = district;
    if (institution) filter.institution = institution;
    if (month) filter.month = month;
    if (year) filter.year = year;

    const docs = await Report.find(filter).lean();
    const rows = docs.map(d => ({
      district: d.district,
      institution: d.institution,
      month: d.month,
      year: d.year,
      value: _num(d.answers?.[key]),
      updatedAt: d.updatedAt || d.createdAt
    }));
    res.json({ ok: true, key, count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// /api/district-institution-report -- fiscal window, cumulative for district
app.get("/api/district-institution-report", async (req, res) => {
  try {
    const { district, month, year } = req.query;
    if (!district || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/month/year" });
    }

    const window = _fiscalWindow(month, String(year));
    const orPairs = window.map(w => ({ month: w.month, year: String(w.year) }));

    const docs = await Report.find({ district, $or: orPairs }).lean();

    const latestByInstMonth = new Map();
    for (const d of docs) {
      const k = `${d.institution}|${d.month}|${d.year}`;
      const prev = latestByInstMonth.get(k);
      const dTime = new Date(d.updatedAt || d.createdAt || 0).getTime();
      const pTime = prev ? new Date(prev.updatedAt || prev.createdAt || 0).getTime() : -1;
      if (!prev || dTime > pTime) latestByInstMonth.set(k, d);
    }

    const byInst = new Map();
    for (const d of latestByInstMonth.values()) {
      if (!byInst.has(d.institution)) byInst.set(d.institution, new Map());
      byInst.get(d.institution).set(`${d.month}-${d.year}`, d);
    }

    const institutionNames = Array.from(byInst.keys()).sort((a,b)=>a.localeCompare(b));
    const institutionData = [];
    let districtPerformance = { month: _empty84(), cumulative: _empty84() };

    for (const inst of institutionNames) {
      const perMonth = byInst.get(inst);

      const selKey = `${month}-${year}`;
      const selArr = _answersTo84Array(perMonth.get(selKey)?.answers || {});

      let cum = _empty84();
      for (const w of window) {
        const doc = perMonth.get(`${w.month}-${w.year}`);
        const arr = _answersTo84Array(doc?.answers || {});
        cum = _sum84(cum, arr);
      }

      institutionData.push({ institution: inst, monthData: selArr, cumulativeData: cum });
      districtPerformance.month = _sum84(districtPerformance.month, selArr);
      districtPerformance.cumulative = _sum84(districtPerformance.cumulative, cum);
    }

    res.json({
      ok: true,
      questions: ALL_QUESTION_KEYS,
      institutionNames,
      institutionData,
      districtPerformance
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// core report routes
app.get("/api/reports", async (req, res) => {
  try {
    const q = {};
    if (req.query.district) q.district = req.query.district;
    if (req.query.institution) q.institution = req.query.institution;
    if (req.query.month) q.month = req.query.month;
    if (req.query.year) q.year = req.query.year;

    const docs = await Report.find(q).sort({ year: 1, updatedAt: -1 }).lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/reports/:id", async (req, res) => {
  try {
    const doc = await Report.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/report", async (req, res) => {
  try {
    const { district, institution, month, year } = req.query;
    if (!district || !institution || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/institution/month/year" });
    }
    const doc = await Report.findOne({ district, institution, month, year }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, report: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// TRUE SAFE MERGE LOGIC HERE!
app.post("/api/reports", async (req, res) => {
  try {
    const { district, institution, month, year, answers = {}, cumulative = {}, eyeBank = [], visionCenter = [] } = req.body;
    if (!district || !institution || !month || !year) {
      return res.status(400).json({ ok: false, error: "Missing district/institution/month/year" });
    }

    const filter = { district, institution, month, year };
    let merge = String(req.query.merge ?? "").toLowerCase() === "1" || req.body.merge;

    let prevDoc = null;
    if (merge) {
      prevDoc = await Report.findOne(filter);
    }

    let baseAnswers = prevDoc ? _normalize84(prevDoc.answers) : _normalize84({});
    let incomingAnswers = _normalize84(answers);
    let finalAnswers = {};
    for (const k of ALL_QUESTION_KEYS) {
      finalAnswers[k] = merge
        ? ((answers[k] !== undefined) ? incomingAnswers[k] : baseAnswers[k])
        : incomingAnswers[k];
    }

    let baseCumulative = prevDoc ? _normalize84(prevDoc.cumulative || prevDoc.answers) : _normalize84({});
    let incomingCumulative = _normalize84(cumulative);
    let finalCumulative = {};
    for (const k of ALL_QUESTION_KEYS) {
      finalCumulative[k] = merge
        ? ((cumulative[k] !== undefined) ? incomingCumulative[k] : baseCumulative[k])
        : (Object.keys(cumulative).length ? incomingCumulative[k] : finalAnswers[k]);
    }

    const update = {
      district, institution, month, year,
      answers: finalAnswers,
      cumulative: finalCumulative,
      eyeBank: Array.isArray(eyeBank) ? eyeBank : [],
      visionCenter: Array.isArray(visionCenter) ? visionCenter : []
    };

    const doc = await Report.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/reports/space/all", async (req, res) => {
  try {
    const docs = await Report.find({}).lean();
    res.json({ ok: true, count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete("/api/reports/all", async (req, res) => {
  try {
    const r = await Report.deleteMany({});
    res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { district = "", institution = "", password = "" } = req.body || {};
    const role = institution.startsWith("DC ") ? "DOC" : "OPTOMETRIST";
    if (!district || !institution) return res.status(400).json({ ok: false, error: "Missing district/institution" });
    if (!password) return res.status(401).json({ ok: false, error: "Missing password" });
    res.json({
      ok: true,
      user: {
        district,
        institution,
        role,
        isGuest: false,
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "route_not_found", path: req.path });
});

(async () => {
  await mongoose.connect(MONGO_URI, { dbName: "optometry" });
  console.log("✅ Mongo connected");
  serverStartedAt = new Date();
  app.listen(PORT, () => {
    console.log(`🚀 API listening on http://localhost:${PORT}`);
  });
})();