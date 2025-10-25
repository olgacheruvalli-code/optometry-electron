require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

/* ======================= Config ======================= */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/optometry";

const ORIGINS_RAW = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "";
const ALLOWED_ORIGINS = ORIGINS_RAW.split(",").map(s => s.trim()).filter(Boolean);

const FISCAL_MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];
const ALL_QUESTION_KEYS = Array.from({ length: 84 }, (_, i) => `q${i + 1}`);

/* ======================= Helpers ======================= */
const _num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const _answersTo84Array = (ans = {}) => ALL_QUESTION_KEYS.map((k) => _num(ans[k]));
const _sum84 = (a = [], b = []) => {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = _num(a[i]) + _num(b[i]);
  return out;
};
const _normalize84 = (obj = {}) => {
  const out = {};
  for (const k of ALL_QUESTION_KEYS) out[k] = _num(obj[k]);
  return out;
};
const _ensure84OnDoc = (doc) => {
  if (!doc) return doc;
  const d = { ...(doc.toObject?.() || doc) };
  d.answers = _normalize84(d.answers || {});
  const hasCum = d.cumulative && Object.keys(d.cumulative).length > 0;
  d.cumulative = hasCum ? _normalize84(d.cumulative) : { ...d.answers };
  return d;
};
const _fiscalStartYear = (m, y) => (["January","February","March"].includes(m) ? (+y - 1) : (+y));
function _fiscalWindow(toMonth, toYear) {
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
const escRe = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciEq = (field, value) => ({
  [field]: { $regex: `^${escRe(String(value).trim())}$`, $options: "i" },
});
function normalizeMonth(m = "") {
  const s = String(m).trim();
  if (!s) return s;
  const full = FISCAL_MONTHS.find((n) => n.toLowerCase() === s.toLowerCase());
  if (full) return full;
  const map = {
    jan: "January", feb: "February", mar: "March", apr: "April", may: "May",
    jun: "June", jul: "July", aug: "August", sep: "September", sept: "September",
    oct: "October", nov: "November", dec: "December",
  };
  const key = s.slice(0, 4).toLowerCase();
  return map[key] || s;
}

/* ======================= Mongoose ======================= */
const ReportSchema = new mongoose.Schema(
  {
    district: { type: String, required: true },
    institution: { type: String, required: true },
    month: { type: String, required: true, enum: FISCAL_MONTHS },
    year: { type: String, required: true },
    answers: { type: Object, default: {} },
    cumulative: { type: Object, default: {} },
    eyeBank: { type: Array, default: [] },
    visionCenter: { type: Array, default: [] },
  },
  { versionKey: false, timestamps: true }
);
ReportSchema.index({ district: 1, institution: 1, month: 1, year: 1 }, { unique: true });
const Report = mongoose.model("Report", ReportSchema);

/* ======================= Express App ======================= */
const app = express();
let dbReady = false;
const startedAt = new Date().toISOString();

/* ---------- CORS ---------- */
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options(/^\/api\/.*$/, cors(corsOptions));
app.options("/api", cors(corsOptions));
app.use((req, res, next) => { res.header("Vary", "Origin"); next(); });

/* ---------- Body parsing ---------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Wait for DB ---------- */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  const pass = ["/api/health", "/api/version", "/api/login", "/api/ping", "/api/debug/echo", "/api/debug/body"];
  if (!dbReady && req.path.startsWith("/api") && !pass.includes(req.path)) {
    return res.status(503).json({ ok: false, error: "db_not_ready" });
  }
  next();
});

/* ======================= Diagnostics ======================= */
app.get("/api/health", (req, res) => res.json({ ok: true, startedAt, tag: "server.js", version: "login-v4" }));
app.get("/api/version", (req, res) => res.json({ ok: true, version: "login-v4" }));
app.get("/api/ping", (req, res) => res.json({ ok: true, message: "pong", ts: Date.now() })); // 👈 NEW quick wake route
app.post("/api/debug/echo", (req, res) => res.json({ ok: true, body: req.body || null }));
app.post("/api/debug/body", (req, res) => {
  const body = req.body;
  res.json({
    ok: true,
    type: typeof body,
    keys: body && typeof body === "object" ? Object.keys(body) : [],
    raw: body ?? null,
  });
});

/* ======================= LOGIN ======================= */
app.post("/api/login", (req, res) => {
  try {
    const body = req.body || {};
    let { username, district, institution, password } = body;
    district = String(district || "").trim();
    institution = String(institution || "").trim();
    password = String(password || "").trim();
    username = String(username || "").trim() || institution;

    if (!district || !institution || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        got: { district: !!district, institution: !!institution, passwordLen: password.length },
      });
    }

    const role = /^dc\s|^doc\s/i.test(institution) ? "DOC" : "USER";
    return res.json({
      ok: true,
      user: { username, district, institution, role, isDoc: role === "DOC" },
      token: "dev-token",
    });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ======================= Existing report routes remain unchanged ======================= */
// (All your /api/reports, /api/district-institution-report, /api/institution-fy-cumulative remain the same)

/* ======================= 404 ======================= */
app.use((req, res) => res.status(404).json({ ok: false, error: "route_not_found", path: req.path }));

/* ======================= Start ======================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API listening on port ${PORT}`);
});
mongoose.connect(MONGO_URI, { dbName: "optometry" })
  .then(() => { dbReady = true; console.log("✅ Mongo connected"); })
  .catch(e => console.error("❌ Mongo connect failed:", e.message));
