// optometry-backend/fixReportsAnswers84.js

const mongoose = require("mongoose");

// ⚠️ Use the same URI as you used for mongodump (Atlas)
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://opto_app:Opto2025aa@cluster0.6dbr4bo.mongodb.net/optometry?retryWrites=true&w=majority";

// This MUST match your src/data/questions.js non-table questions order:
// I. GENERAL SERVICES → II. SCHOOL EYE HEALTH → IV. OTHER EYE DISEASES → ADDL. REPORTS
const ID_ORDER = [
  // I. GENERAL SERVICES (21)
  "ophthalmic_patients_examined",
  "refractive_errors_detected",
  "retinoscopy",
  "spectacles_prescribed",
  "cataract_detected",
  "cataract_referred",
  "cases_operated",
  "cases_operated_women_beneficiaries",
  "cases_operated_sc_st",
  "cases_operated_bpl_cases",
  "specs_provided_old_aged",
  "outreach_camps",
  "outreach_camps_mobile_units",
  "outreach_camps_disability_camp",
  "outreach_camps_other_camps",
  "mini_camp_examined",
  "mini_phc_visited",
  "cases_examined_mini_phc",
  "health_education_classes",
  "tonometry_done",
  "retinopathy_camps",

  // II. SCHOOL EYE HEALTH (11)
  "schools_in_area",
  "schools_covered",
  "children_examined",
  "school_refractive_errors",
  "school_spectacles_prescribed",
  "school_spectacles_free_supplied",
  "school_other_diseases",
  "low_vision",
  "squint",
  "vitamin_a_deficiency",
  "teachers_trained",

  // IV. OTHER EYE DISEASES (24)
  "glaucoma_cases",
  "glaucoma_screened",
  "glaucoma_detected",
  "glaucoma_treated",
  "diabetic_retinopathy",
  "dr_screened",
  "dr_detected",
  "dr_treated",
  "childhood_blindness",
  "trachoma",
  "disease_squint",
  "rop",
  "low_vision_disease",
  "keratitis",
  "conjunctivitis",
  "pterygium",
  "blepharitis",
  "trauma",
  "retinal_detachment",
  "hordeolum",
  "dacryocystitis",
  "retinoblastoma",
  "blinds_detected",
  "corneal_blind",

  // ADDL. REPORTS – OLD AGED-SPECTACLES (3)
  "specs_old_male",
  "specs_old_female",
  "old_presc_sent_state",

  // ADDL. REPORTS – SCHOOL EYE HEALTH PROGRAM (8)
  "school_examined_male",
  "school_examined_female",
  "school_refractive_male",
  "school_refractive_female",
  "school_glasses_prescribed",
  "school_specs_male",
  "school_specs_female",
  "school_presc_sent_state",

  // ADDL. REPORTS – GLAUCOMA (7)
  "addl_glaucoma_detected",
  "addl_glaucoma_male",
  "addl_glaucoma_female",
  "addl_glaucoma_treated_male",
  "addl_glaucoma_treated_female",
  "addl_glaucoma_laser_male",
  "addl_glaucoma_laser_female",

  // ADDL. REPORTS – DIABETIC RETINOPATHY (10)
  "addl_dr_detected_male",
  "addl_dr_detected_female",
  "addl_dr_treated_male",
  "addl_dr_treated_female",
  "addl_dr_laser_male",
  "addl_dr_laser_female",
  "addl_fundus_photos",
  "addl_fundus_cases_detected",
  "addl_tribal_cataract_cases",
  "addl_tribal_cataract_surgery",
];

if (ID_ORDER.length !== 84) {
  console.error("❌ ID_ORDER must be exactly 84 items, got:", ID_ORDER.length);
  process.exit(1);
}

// Minimal schema just to access the collection
const ReportSchema = new mongoose.Schema(
  {
    district: String,
    institution: String,
    month: String,
    year: String,
    answers: mongoose.Schema.Types.Mixed,
    eyeBank: mongoose.Schema.Types.Mixed,
    visionCenter: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: "reports" }
);

const Report = mongoose.model("Report", ReportSchema);

(async () => {
  try {
    console.log("Connecting to Mongo…");
    await mongoose.connect(MONGO_URI, { dbName: "optometry" });
    console.log("✅ Connected");

    const cursor = Report.find({}).cursor();

    let total = 0;
    let patched = 0;
    let skipped = 0;

    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      total++;
      const ans = doc.answers || {};
      const keys = Object.keys(ans);

      // If answers already look like q1..q84 only, skip
      const hasIdKeys = keys.some((k) => !/^q\d+$/i.test(k));
      if (!hasIdKeys) {
        skipped++;
        continue;
      }

      const newAnswers = {};

      ID_ORDER.forEach((id, idx) => {
        const raw = ans[id];
        const v =
          raw === undefined || raw === null || String(raw).trim() === ""
            ? "0"
            : String(raw).trim();
        newAnswers[`q${idx + 1}`] = v;
      });

      // Keep original answers as backup in the doc
      doc.answersLegacy = ans;
      doc.answers = newAnswers;

      await doc.save();
      patched++;
      console.log(
        `Patched: ${doc.institution || "?"} ${doc.month || "?"} ${
          doc.year || "?"
        } (${doc._id})`
      );
    }

    console.log("────────────────────────────");
    console.log("Total docs scanned :", total);
    console.log("Docs patched       :", patched);
    console.log("Docs skipped (already q1..):", skipped);
    console.log("Done.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
})();

