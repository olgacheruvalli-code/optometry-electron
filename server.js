/* server.js */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

/* ======================= Config ======================= */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/optometry";

const ORIGINS_RAW = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "";
const ALLOWED_ORIGINS = ORIGINS_RAW.split(",").map((s) => s.trim()).filter(Boolean);

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
    aliases.forEach((a) => map.set(lowerSan(a), canon));
  }
  return map;
})();

const normInstKey = (name = "") => {
  const s = lowerSan(name);
  return ALIAS_TO_CANON.get(s) || s;
};

const instRegexOR = (name = "") => {
  const canon = normInstKey(name);
  const aliases = new Set([canon]);
  for (const [c, list] of Object.entries(CANON)) {
    if (c === canon || list.some((a) => normInstKey(a) === canon)) {
      list.forEach((a) => aliases.add(normInstKey(a)));
    }
  }
  const patterns = Array.from(aliases)
    .map((a) => {
      const displayList = Object.entries(CANON).find(([c]) => c === a)?.[1] || [a];
      return displayList.map((disp) => {
        const parts = sanitize(disp)
          .split(" ")
          .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const body = parts.join("\\s+");
        return new RegExp(`^\\s*${body}\\s*$`, "i");
      });
    })
    .flat();
  if (!patterns.length) {
    const parts = sanitize(name)
      .split(" ")
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    patterns.push(new RegExp(`^\\s*${parts.join("\\s+")}\\s*$`, "i"));
  }
  return patterns;
};

/* ======================= Other Helpers ======================= */
const _num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const _normalize84 = (obj = {}) => {
  const out = {};
  for (const k of ALL_QUESTION_KEYS) out[k] = _num(obj[k]);
  return out;
};
const _answersTo84Array = (ans = {}) => ALL_QUESTION_KEYS.map((k) => _num(ans[k]));
const _sum84 = (a = [], b = []) => {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = _num(a[i]) + _num(b[i]);
  return out;
};
const _ensure84OnDoc = (doc) => {
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
  for (let i = 0; i < FISCAL_MONTHS.length; i++) {
    const m = FISCAL_MONTHS[i];
    const y = i <= 8 ? startY : startY + 1; // Apr–Dec -> startY; Jan–Mar -> startY+1
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

/* ======================= Express App ======================= */
const app = express();
let dbReady = false;
const startedAt = new Date().toISOString();

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
app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  const pass = ["/api/health"];
  if (!dbReady && req.path.startsWith("/api") && !pass.includes(req.path)) {
    return res.status(503).json({ ok: false, error: "db_not_ready" });
  }
  next();
});

/* ======================= Diagnostics ======================= */
app.get("/api/health", (req, res) =>
  res.json({ ok: true, startedAt, version: "v8-visioncenter-normalized" })
);

/* ======================= API: Reports (generic) ======================= */
app.get("/api/reports", async (req, res) => {
  try {
    const district = sanitize(req.query.district || "");
    const institution = sanitize(req.query.institution || "");
    const month = req.query.month ? normalizeMonth(req.query.month) : undefined;
    const year = req.query.year ? String(req.query.year) : undefined;

    const q = {};
    if (district) {
      q.district = new RegExp(
        `^\\s*${sanitize(district).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i"
      );
    }
    if (month) q.month = month;
    if (year) q.year = year;

    if (institution) {
      const pats = instRegexOR(institution);
      q.$or = pats.map((rx) => ({ institution: rx }));
    }

    const docs = await Report.find(q).lean();
    res.json({ ok: true, docs: docs.map(_ensure84OnDoc) });
  } catch (e) {
    console.error("GET /api/reports error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ============ API: District → Institution-wise (with VC zeros visible) ============ */
app.get("/api/district-institution-report", async (req, res) => {
  try {
    const district = sanitize(req.query.district || "");
    const month = normalizeMonth(req.query.month || "");
    const year = String(req.query.year || "");
    if (!district || !month || !year) {
      return res.status(400).json({ ok: false, error: "missing_params" });
    }

    const docs = await Report.find({
      district: new RegExp(
        `^\\s*${sanitize(district).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i"
      ),
    }).lean();

    // Pick latest per (institution, month, year)
    const keyFor = (inst, m, y) => `${normInstKey(inst)}|${m.toLowerCase()}|${y}`;
    const latest = new Map();
    for (const d of docs) {
      const k = keyFor(d.institution, d.month, d.year);
      const ts = Date.parse(d.updatedAt || d.createdAt || 0) || 0;
      const prev = latest.get(k);
      if (!prev || ts > prev._ts) latest.set(k, { ...d, _ts: ts });
    }

    // Build institution list only from existing docs (excludes never-saved)
    const instNames = Array.from(
      new Set(
        docs
          .map((d) => sanitize(d.institution))
          .filter((n) => n && !/^doc\s|^dc\s/i.test(n))
          .map((n) => {
            const nk = normInstKey(n);
            const aliasList = Object.entries(CANON).find(([c]) => c === nk)?.[1];
            return aliasList ? sanitize(aliasList[0]) : sanitize(n);
          })
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const window = _fiscalWindow(month, year);

    // ---- MAIN PATCH: keep institutions visible even if VC sums to 0 ----
    const institutionData = instNames.map((dispName) => {
      const nk = normInstKey(dispName);
      const sel = latest.get(`${nk}|${month.toLowerCase()}|${year}`);

      // If no saved report at all for this month+year, exclude from totals but return placeholder arrays.
      if (!sel) {
        return {
          institution: dispName,
          monthData: new Array(ALL_QUESTION_KEYS.length).fill(0),
          cumulativeData: new Array(ALL_QUESTION_KEYS.length).fill(0),
          visionCenter: [
            {
              centerName: "",
              patientsExamined: 0,
              cataract: 0,
              otherEye: 0,
              refractive: 0,
              spectacles: 0,
            },
          ],
        };
      }

      const monthData = _answersTo84Array(sel.answers || {});

      // Normalize Vision Center rows
      let visionCenter = Array.isArray(sel.visionCenter)
        ? sel.visionCenter.map((vc) => ({
            centerName:
              vc.centerName ||
              vc.visionCenter ||
              vc.visionCentre ||
              vc.name ||
              vc["Name of Vision Centre"] ||
              "",
            patientsExamined: Number(vc.patientsExamined || vc["No of patients examined"] || 0),
            cataract: Number(vc.cataract || vc["No of Cataract cases detected"] || 0),
            otherEye: Number(vc.otherEye || vc["No of other eye diseases"] || 0),
            refractive: Number(vc.refractive || vc["No of Refractive errors"] || 0),
            spectacles: Number(vc.spectacles || vc["No of Spectacles Prescribed"] || 0),
          }))
        : [];

      // 🔒 Ensure at least one row shows up even if all zeros (to keep the institution visible)
      const vcSum = visionCenter.reduce(
        (sum, r) =>
          sum +
          _num(r.patientsExamined) +
          _num(r.cataract) +
          _num(r.otherEye) +
          _num(r.refractive) +
          _num(r.spectacles),
        0
      );
      if (visionCenter.length === 0 || vcSum === 0) {
        visionCenter = [
          {
            centerName: "",
            patientsExamined: 0,
            cataract: 0,
            otherEye: 0,
            refractive: 0,
            spectacles: 0,
          },
        ];
      }

      // Fiscal YTD cumulative (answers only; VC table is shown raw per-month)
      let cumulativeData = new Array(ALL_QUESTION_KEYS.length).fill(0);
      for (const p of window) {
        const d = latest.get(`${nk}|${p.month.toLowerCase()}|${p.year}`);
        if (d) cumulativeData = _sum84(cumulativeData, _answersTo84Array(d.answers));
      }

      return { institution: dispName, monthData, cumulativeData, visionCenter };
    });

    // District totals (answers only)
    let districtMonth = new Array(ALL_QUESTION_KEYS.length).fill(0);
    let districtCum = new Array(ALL_QUESTION_KEYS.length).fill(0);
    for (const row of institutionData) {
      districtMonth = _sum84(districtMonth, row.monthData);
      districtCum = _sum84(districtCum, row.cumulativeData);
    }

    res.json({
      ok: true,
      district,
      month,
      year,
      institutionData,
      districtPerformance: {
        monthData: districtMonth,
        cumulativeData: districtCum,
      },
    });
  } catch (e) {
    console.error("GET /api/district-institution-report error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ======================= API: Institution FY cumulative ======================= */
app.get("/api/institution-fy-cumulative", async (req, res) => {
  try {
    const district = sanitize(req.query.district || "");
    const institutionRaw = sanitize(req.query.institution || "");
    const month = normalizeMonth(req.query.month || "");
    const year = String(req.query.year || "");

    if (!district || !institutionRaw || !month || !year) {
      return res.status(400).json({ ok: false, error: "missing_params" });
    }

    const pats = instRegexOR(institutionRaw);
    const docs = await Report.find({
      district: new RegExp(
        `^\\s*${sanitize(district).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i"
      ),
      $or: pats.map((rx) => ({ institution: rx })),
    }).lean();

    const window = _fiscalWindow(month, year);
    const key = (m, y) => `${m.toLowerCase()}|${y}`;

    const latest = new Map();
    for (const d of docs) {
      const k = key(d.month, d.year);
      const ts = Date.parse(d.updatedAt || d.createdAt || 0) || 0;
      const prev = latest.get(k);
      if (!prev || ts > prev?._ts) latest.set(k, { ...d, _ts: ts });
    }

    let sums = {};
    for (const p of window) {
      const d = latest.get(key(p.month, p.year));
      if (!d) continue;
      const a = _normalize84(d.answers || {});
      for (const [k2, v] of Object.entries(a)) sums[k2] = (sums[k2] || 0) + (Number(v) || 0);
    }

    const sel = latest.get(key(month, year));
    const monthAnswers = _normalize84((sel && sel.answers) || {});
    const displayName = (() => {
      const nk = normInstKey(institutionRaw);
      const list = Object.entries(CANON).find(([c]) => c === nk)?.[1];
      return list ? sanitize(list[0]) : sanitize(institutionRaw);
    })();

    res.json({
      ok: true,
      district,
      institution: displayName,
      month,
      year,
      cumulative: sums,
      monthAnswers,
    });
  } catch (e) {
    console.error("GET /api/institution-fy-cumulative error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ======================= 404 ======================= */
app.use((req, res) =>
  res.status(404).json({ ok: false, error: "route_not_found", path: req.path })
);

/* ======================= Start ======================= */
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 API listening on port ${PORT}`));
mongoose
  .connect(MONGO_URI, { dbName: "optometry" })
  .then(() => {
    dbReady = true;
    console.log("✅ Mongo connected");
  })
  .catch((e) => console.error("❌ Mongo connect failed:", e.message));
