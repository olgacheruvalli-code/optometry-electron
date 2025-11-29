/* server.js */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

/* ======================= Config ======================= */
const PORT = process.env.PORT || 5050; // <-- make sure this matches your local port
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/optometry";

const ORIGINS_RAW = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "";
const ALLOWED_ORIGINS = ORIGINS_RAW.split(",").map(s => s.trim()).filter(Boolean);
const ALLOW_VERCEL_PREVIEWS = false;

const FISCAL_MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];
const ALL_QUESTION_KEYS = Array.from({ length: 84 }, (_, i) => `q${i + 1}`);

/* ======================= Name Normalization ======================= */
const sanitize = (s = "") => String(s).replace(/\s+/g, " ").trim();
const lowerSan = (s = "") => sanitize(s).toLowerCase();

const CANON = {
  "chc narikkuni": ["chc narikkuni", "bfhc narikkuni"],
  "chc olavanna": ["chc olavanna", "bfhc olavanna"],
  "chc thiruvangoor": ["chc thiruvangoor", "bfhc thiruvangoor"],
  "taluk hospital koyilandy": ["taluk hospital koyilandy", "thqh koyilandy"],
};
const ALIAS_TO_CANON = (() => {
  const map = new Map();
  for (const [canon, aliases] of Object.entries(CANON)) {
    aliases.forEach(a => map.set(lowerSan(a), canon));
  }
  return map;
})();
const normInstKey = (name = "") => {
  const s = lowerSan(name);
  return ALIAS_TO_CANON.get(s) || s;
};

/* ======================= Helpers ======================= */
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const _normalize84 = (obj = {}) => {
  const out = {};
  for (const k of ALL_QUESTION_KEYS) out[k] = _num(obj[k]);
  return out;
};
const _answersTo84Array = (ans = {}) => ALL_QUESTION_KEYS.map(k => _num(ans[k]));
const _sum84 = (a = [], b = []) => {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = _num(a[i]) + _num(b[i]);
  return out;
};
const _ensure84OnDoc = doc => {
  if (!doc) return doc;
  const d = { ...(doc.toObject?.() || doc) };
  d.institution = sanitize(d.institution || "");
  d.district = sanitize(d.district || "");
  d.answers = _normalize84(d.answers || {});
  const hasCum = d.cumulative && Object.keys(d.cumulative).length > 0;
  d.cumulative = hasCum ? _normalize84(d.cumulative) : { ...d.answers };
  return d;
};
const _fiscalStartYear = (m, y) =>
  ["January", "February", "March"].includes(m) ? +y - 1 : +y;

function _fiscalWindow(toMonth, toYear) {
  const startY = _fiscalStartYear(toMonth, toYear);
  const window = [];
  const FISCAL_MONTHS = [
    "April","May","June","July","August","September",
    "October","November","December","January","February","March",
  ];
  for (let i = 0; i < FISCAL_MONTHS.length; i++) {
    const m = FISCAL_MONTHS[i];
    const y = i <= 8 ? startY : startY + 1;
    window.push({ month: m, year: String(y) });
    if (m === toMonth && String(y) === String(toYear)) break;
  }
  return window;
}

function normalizeMonth(m = "") {
  const s = lowerSan(m);
  const map = {
    jan: "January", feb: "February", mar: "March", apr: "April", may: "May",
    jun: "June", jul: "July", aug: "August", sep: "September", sept: "September",
    oct: "October", nov: "November", dec: "December",
  };
  const key = s.slice(0, 3);
  return map[key] || sanitize(m);
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

/* ======================= Amblyopia Schema ======================= */
const AmblyopiaSchema = new mongoose.Schema(
  {
    patientId: String,
    age: String,
    sex: String,
    unaidedRE: String,
    unaidedLE: String,
    bcvaRE: String,
    bcvaLE: String,
    type: String,
    degree: String,
    treatment: String,
    outcome: String,
    remarks: String,
    district: String,
    institution: String,
    examiner: String,
    date: String,
  },
  { timestamps: true }
);
const Amblyopia =
  mongoose.models.Amblyopia || mongoose.model("Amblyopia", AmblyopiaSchema);

/* ======================= Express App ======================= */
const app = express();
let dbReady = false;
const startedAt = new Date().toISOString();

/* ---------- SMART CORS BLOCK ---------- */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOW_VERCEL_PREVIEWS) {
    try {
      const u = new URL(origin);
      if (u.protocol === "https:" && u.hostname.endsWith(".vercel.app")) return true;
    } catch {}
  }
  return false;
}

let corsOptions;
if (process.env.NODE_ENV !== "production") {
  console.log("🔓 Local dev mode: allowing all origins");
  corsOptions = { origin: true };
} else {
  corsOptions = {
    origin(origin, cb) {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
    credentials: false,
    maxAge: 86400,
  };
}
app.use(cors(corsOptions));
app.options(/^\/api\/.*$/, cors(corsOptions));
app.use((req, res, next) => { res.header("Vary", "Origin"); next(); });

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);

  // allow these even if dbReady is false
  const pass = ["/api/health", "/api/ping", "/api/login"];

  if (!dbReady && req.path.startsWith("/api") && !pass.includes(req.path)) {
    return res.status(503).json({ ok: false, error: "db_not_ready" });
  }
  next();
});

/* ======================= Diagnostics ======================= */
app.get("/api/health", (req, res) =>
  res.json({ ok: true, startedAt, version: "v9-autoCORS" })
);

app.get("/api/ping", (req, res) =>
  res.json({ ok: true, msg: "backend alive", db: dbReady })
);

/* ======================= SIMPLE LOCAL LOGIN (DEV ONLY) ======================= */
/* This is ONLY for local testing on http://localhost:5050.
   It lets you log in without real DB users.
   When you deploy to Render, you can replace this with your real login logic. */
app.post("/api/login", (req, res) => {
  const { username, district, institution } = req.body || {};

  if (!username) {
    return res.status(400).json({ ok: false, error: "missing_username" });
  }

  const role =
    String(username).toLowerCase().startsWith("dc") ? "DOC" : "OPTOMETRIST";

  return res.json({
    ok: true,
    user: {
      username,
      district: district || "",
      institution: institution || "",
      role,
      isGuest: false,
    },
  });
});

/* ======================= Amblyopia Research Routes ======================= */
app.post("/api/amblyopia-research", async (req, res) => {
  try {
    const data = req.body;

    if (!data.district || !data.institution) {
      return res.json({ ok: false, error: "Missing district/institution" });
    }

    await Amblyopia.create(data);

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Amblyopia save error:", e);
    res.json({ ok: false, error: "server_error" });
  }
});

app.get("/api/amblyopia-research", async (req, res) => {
  try {
    const { district, institution } = req.query;

    const docs = await Amblyopia.find({ district, institution })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, docs });
  } catch (e) {
    console.error("❌ Amblyopia fetch error:", e);
    res.json({ ok: false, error: "server_error" });
  }
});

/* ======================= (YOUR OTHER REPORT ROUTES GO HERE) ======================= */
/* e.g.
   app.get("/api/reports", ...);
   app.post("/api/reports", ...);
   app.get("/api/district-institution-report", ...);
   etc.
*/

/* ======================= 404 ======================= */
app.use((req, res) =>
  res.status(404).json({ ok: false, error: "route_not_found", path: req.path })
);

/* ======================= Start ======================= */
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 API listening on port ${PORT}`)
);

mongoose
  .connect(MONGO_URI, { dbName: "optometry" })
  .then(() => { dbReady = true; console.log("✅ Mongo connected"); })
  .catch(e => console.error("❌ Mongo connect failed:", e.message));
