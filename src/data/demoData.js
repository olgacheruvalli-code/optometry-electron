/**
 * 🕶️ Demo Data for Guest Mode
 * Provides safe, sample demo reports and data for guest users so real hospital data is never exposed.
 */

export const DEMO_DISTRICT = "Demo District";
export const DEMO_INSTITUTION = "Demo General Hospital (Sample)";

export const DEMO_INSTITUTIONS = [
  "Demo General Hospital (Sample)",
  "Demo Taluk Hospital (Sample)",
  "Demo Community Health Centre",
  "Demo Primary Health Centre",
];

export const DEMO_ANSWERS_AUG = {
  q1: 2450, // Total OP
  q2: 1120, // Refractions done
  q3: 380,  // Presbyopia
  q4: 740,  // Spectacles prescribed
  q5: 145,  // Cataract cases detected
  q6: 35,   // Cataract detected tribal
  q7: 95,   // Cataract operated
  q8: 22,   // Cataract operated tribal
  q9: 14,   // Aphakic
  q10: 68,  // Glaucoma suspected
  q11: 18,  // Glaucoma confirmed
  q12: 5,   // Glaucoma surgery
  q13: 112, // Diabetic Retinopathy screened
  q14: 28,  // Diabetic Retinopathy detected
  q15: 8,   // Laser done
  q16: 4,   // Vitrectomy
  q17: 45,  // Squint
  q18: 12,  // Amblyopia
  q19: 8,   // Low Vision Devices
  q20: 520, // School children screened
  q21: 75,  // School children spectacles prescribed
  q22: 45,  // Old aged spectacles distributed
  q23: 12,  // Corneal blindness
  q24: 180, // Minor OT procedures
  q25: 45,  // Foreign body removal
  q26: 28,  // Epilation
  q27: 15,  // Syringing
  q28: 12,  // Fundus photos taken
  q29: 4,   // Cases detected from fundus photos
  q30: 8,   // Visual field tests
  q31: 3,   // OCT scans
  q32: 6,   // Corneas collected
  q33: 4,   // Corneas transplanted
  q34: 68,  // Glaucoma Screened
  q35: 0,
  q36: 68,  // Glaucoma Screened (alt)
  q37: 14,  // Glaucoma Confirmed
  q38: 5,   // Glaucoma Surgery
  q39: 0,
  q40: 112, // DR Screened
  q41: 28,  // DR Detected
  q42: 8,   // DR Laser
  q43: 4,   // DR Vitrectomy
  q44: 0,
  q45: 25,  // Trichiasis
  q46: 12,  // Pterygium
  q47: 18,  // Blepharitis
  q48: 34,  // Conjunctivitis
  q49: 42,  // Allergic Conjunctivitis
  q50: 16,  // Dry Eye
  q51: 8,   // Corneal Ulcer
  q52: 14,  // Uveitis
  q53: 2,   // Trauma
  q54: 18,  // Retinal disorders
  q55: 6,   // Optic atrophy
  q56: 3,   // Congenital anomaly
  q57: 4,   // Neoplasm
  q58: 15,  // Others
  q59: 8,
  q60: 12,
  q61: 15,
  q62: 45,
  q63: 60,
  q64: 18,
  q65: 12,
  q66: 14,
  q67: 6,
  q68: 4,
  q69: 8,
  q70: 5,
  q71: 4,
  q72: 2,
  q73: 3,
  q74: 2,
  q75: 12,
  q76: 6,
  q77: 24,
  q78: 18,
  q79: 24,
  q80: 18,
  q81: 8,
  q82: 8,
  q83: 4,
  q84: 4,
  q85: 0,
  q86: 0,
};

export const DEMO_EYEBANK = [
  { collectionCentre: "Demo Hospital Centre", collected: 6, utilized: 4, sentOut: 2 },
  { collectionCentre: "Demo Mobile Unit", collected: 2, utilized: 2, sentOut: 0 },
];

export const DEMO_VISION_CENTER = [
  {
    vc_1_name: "Demo Vision Centre Alpha",
    vc_1_examined: 320,
    vc_1_cataract: 24,
    vc_1_other_diseases: 45,
    vc_1_refractive_errors: 180,
    vc_1_spectacles_prescribed: 140,
  },
  {
    vc_2_name: "Demo Vision Centre Beta",
    vc_2_examined: 280,
    vc_2_cataract: 18,
    vc_2_other_diseases: 38,
    vc_2_refractive_errors: 150,
    vc_2_spectacles_prescribed: 125,
  },
];

export function createDemoReport(month = "August", year = "2026") {
  const mult = month === "July" ? 0.9 : month === "June" ? 0.8 : 1.0;
  const answers = {};
  const cumulative = {};

  for (let i = 1; i <= 86; i++) {
    const k = `q${i}`;
    const base = DEMO_ANSWERS_AUG[k] || 0;
    answers[k] = Math.round(base * mult);
    cumulative[k] = Math.round(base * 4.2); // approx April -> Month cumulative
  }

  return {
    _id: `demo-report-${year}-${month.toLowerCase()}`,
    district: DEMO_DISTRICT,
    institution: DEMO_INSTITUTION,
    month,
    year,
    answers,
    cumulative,
    eyeBank: DEMO_EYEBANK,
    visionCenter: DEMO_VISION_CENTER,
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
    isDemo: true,
  };
}

export const DEMO_REPORTS_LIST = [
  createDemoReport("August", "2026"),
  createDemoReport("July", "2026"),
  createDemoReport("June", "2026"),
];

export function getDemoDistrictData(month = "August", year = "2026") {
  const mult = month === "July" ? 0.9 : month === "June" ? 0.8 : 1.0;
  const multipliers = [1.2, 0.85, 0.6, 0.4];

  const institutionData = DEMO_INSTITUTIONS.map((instName, idx) => {
    const factor = (multipliers[idx] || 0.5) * mult;
    const monthData = [];
    const cumulativeData = [];

    for (let i = 1; i <= 86; i++) {
      const k = `q${i}`;
      const base = DEMO_ANSWERS_AUG[k] || 0;
      const mVal = Math.round(base * factor);
      monthData.push(mVal);
      // Cumulative is approx 4 months except schools_in_area (q22 / index 21) which doesn't sum
      cumulativeData.push(i === 22 ? mVal : Math.round(mVal * 4.2));
    }

    return {
      institution: instName,
      monthData,
      cumulativeData,
    };
  });

  const distMonth = Array(86).fill(0);
  const distCum = Array(86).fill(0);

  for (const r of institutionData) {
    for (let i = 0; i < 86; i++) {
      distMonth[i] += r.monthData[i];
      distCum[i] += r.cumulativeData[i];
    }
  }

  return {
    institutionData,
    districtPerformance: {
      monthData: distMonth,
      cumulativeData: distCum,
    },
  };
}
