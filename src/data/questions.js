// src/data/questions.js

export const sections = [
  {
    title: "I. GENERAL SERVICES",
    questions: [
      { id: "ophthalmic_patients_examined", label: "No of Ophthalmic patients examined" },
      { id: "refractive_errors_detected", label: "No of Refractive Errors detected" },
      { id: "retinoscopy", label: "No of Retinoscopy" },
      { id: "spectacles_prescribed", label: "No of Spectacles prescribed" },
      { id: "cataract_detected", label: "No of Cataract detected" },
      { id: "cataract_referred", label: "No of cataract cases referred to higher centre for surgery" },
      { id: "cases_operated", label: "No of cases operated out of them" },
      { id: "cases_operated_women_beneficiaries", label: "↳ No of women beneficiaries" },
      { id: "cases_operated_sc_st", label: "↳ No of SC/ST" },
      { id: "cases_operated_bpl_cases", label: "↳ No of BPL cases" },
      { id: "specs_provided_old_aged", label: "No of spectacles provided to old aged" },
      { id: "outreach_camps", label: "No of outreach camps conducted in the area" },
      { id: "outreach_camps_mobile_units", label: "↳ By District/Mobile ophthalmic unit/Medical college mob.unit" },
      { id: "outreach_camps_disability_camp", label: "↳ Disability camp" },
      { id: "outreach_camps_other_camps", label: "↳ Others (NGO/Private etc...) mini eye camp" },
      { id: "mini_camp_examined", label: "No of patients examined in the mini camp" },
      { id: "mini_phc_visited", label: "No of Mini PHC visited" },
      { id: "cases_examined_mini_phc", label: "No of cases examined in mini PHC" },
      { id: "health_education_classes", label: "No of Health education classes conducted" },
      { id: "tonometry_done", label: "No of Tonometry done (Hospital/CHC/ PHC/Mini PHC/Vision centre)" },
      { id: "retinopathy_camps", label: "No.of Retinopathy camp Conducted" }
    ]
  },
  {
    title: "II. SCHOOL EYE HEALTH",
    questions: [
      { id: "schools_in_area", label: "No. of schools in the area (LP/UP/HS-(Govt./Aided./Private))" },
      { id: "schools_covered", label: "Total No of Schools covered" },
      { id: "children_examined", label: "No of children examined" },
      { id: "school_refractive_errors", label: "No of Refractive Errors detected" },
      { id: "school_spectacles_prescribed", label: "No of Spectacles prescribed" },
      { id: "school_spectacles_free_supplied", label: "No of free Spectacles supplied" },
      { id: "school_other_diseases", label: "No of other eye diseases detected" },
      { id: "low_vision", label: "↳ Low vision" },
      { id: "squint", label: "↳ Squint" },
      { id: "vitamin_a_deficiency", label: "↳ Vitamin A deficiency" },
      { id: "teachers_trained", label: "No of Teachers trained" }
    ]
  },
  {
    title: "III. EYE BANK PERFORMANCE",
    table: true,
    columns: [
      "Status",
      "No of Eyes collected during the month",
      "No of Eyes utilized for Keratoplasty",
      "No of Eyes used for Research purpose",
      "No of Eyes distributed to other Institutions",
      "No of Eye Donation Pledge forms received"
    ],
    rows: [
      {
        status: "Eye Bank",
        data: [
          "eye_bank_collected",
          "eye_bank_keratoplasty",
          "eye_bank_research",
          "eye_bank_distributed",
          "eye_bank_pledges"
        ]
      },
      {
        status: "Eye Collection Centre",
        data: [
          "eye_cc_collected",
          "eye_cc_keratoplasty",
          "eye_cc_research",
          "eye_cc_distributed",
          "eye_cc_pledges"
        ]
      }
    ]
  },
   {
    title: "IV. OTHER EYE DISEASES",
    questions: [
      { id: "glaucoma_cases", label: "No.Of glaucoma cases" },
      { id: "glaucoma_screened", label: "↳ Screened" },
      { id: "glaucoma_detected", label: "↳ Detected" },
      { id: "glaucoma_treated", label: "↳ Treated" },
      { id: "diabetic_retinopathy", label: "Diabetic Retinopathy" },
      { id: "dr_screened", label: "↳ Screened" },
      { id: "dr_detected", label: "↳ Detected" },
      { id: "dr_treated", label: "↳ Treated" },
      { id: "childhood_blindness", label: "No of Childhood Blindness" },
      { id: "trachoma", label: "Trachoma" },
      { id: "disease_squint", label: "Squint" },
      { id: "rop", label: "Retinopathy of prematurety (ROP)" },
      { id: "low_vision_disease", label: "Low Vision" },
      { id: "keratitis", label: "Keratitis" },
      { id: "conjunctivitis", label: "Conjunctivitis" },
      { id: "pterygium", label: "Pterygium" },
      { id: "blepharitis", label: "Blepharitis" },
      { id: "trauma", label: "Trauma" },
      { id: "retinal_detachment", label: "Retinal Detachment" },
      { id: "hordeolum", label: "Hordeolum" },
      { id: "dacryocystitis", label: "Dacryocystitis" },
      { id: "retinoblastoma", label: "Retinoblastoma" },
      { id: "blinds_detected", label: "No of Blinds detected (Vision < CF 3 Meters BE)" },
      { id: "corneal_blind", label: "↳ Corneal Blind among them" }
    ]
  },
  {
    title: "ADDL. REPORTS",
    subsections: [
      {
        title: "OLD AGED‑SPECTACLES",
        questions: [
          { id: "specs_old_male", label: "No of specs given to male old aged" },
          { id: "specs_old_female", label: "No of specs given to female old aged" },
          { id: "old_presc_sent_state", label: "Total of no of old age prescriptions sent to state" }
        ]
      },
      {
        title: "SCHOOL EYE HEALTH PROGRAM",
        questions: [
          { id: "school_examined_male", label: "No of school children examined - Male" },
          { id: "school_examined_female", label: "No of school children examined - Female" },
          { id: "school_refractive_male", label: "Refractive error - Male" },
          { id: "school_refractive_female", label: "Refractive error - Female" },
          { id: "school_glasses_prescribed", label: "Total number of glasses prescribed for school children" },
          { id: "school_specs_male", label: "Total number of specs supplied to male" },
          { id: "school_specs_female", label: "Total number of specs supplied to female" },
          { id: "school_presc_sent_state", label: "Total no of prescriptions sent to state" }
        ]
      },
      {
        title: "GLAUCOMA",
        questions: [
          { id: "addl_glaucoma_detected", label: "Glaucoma detected" },
          { id: "addl_glaucoma_male", label: "Total no of glaucoma detected in male" },
          { id: "addl_glaucoma_female", label: "Total no of glaucoma detected in female" },
          { id: "addl_glaucoma_treated_male", label: "Glaucoma treated in male" },
          { id: "addl_glaucoma_treated_female", label: "Glaucoma treated in female" },
          { id: "addl_glaucoma_laser_male", label: "Glaucoma laser treated male" },
          { id: "addl_glaucoma_laser_female", label: "Glaucoma laser treated female" }
        ]
      },
      {
        title: "DIABETIC RETINOPATHY",
        questions: [
          { id: "addl_dr_detected_male", label: "DR detected in male" },
          { id: "addl_dr_detected_female", label: "DR detected in female" },
          { id: "addl_dr_treated_male", label: "DR treated in male" },
          { id: "addl_dr_treated_female", label: "DR treated in female" },
          { id: "addl_dr_laser_male", label: "DR‑laser treated in male" },
          { id: "addl_dr_laser_female", label: "DR‑laser treated in female" },
          { id: "addl_fundus_photos", label: "No of Fundus photo taken" },
          { id: "addl_fundus_cases_detected", label: "No of cases detected from the fundus photos" },
          { id: "addl_tribal_cataract_cases", label: "No of cataract cases detected in tribal population" },
          { id: "addl_tribal_cataract_surgery", label: "No of cases undergone for cataract surgery in tribal population" }
        ]
      }
    ]
  }
];

const visionCenter = {
  title: "V. VISION CENTER",
  table: true,
  columns: [
    "SL NO",
    "Name of Vision Centre",
    "No of patients examined",
    "No of Cataract cases detected",
    "No of other eye diseases",
    "No of Refractive errors",
    "No of Spectacles Prescribed"
  ],
  rows: Array.from({ length: 10 }, (_, i) => ({
    slNo: i + 1,
    nameKey: `vc_${i + 1}_name`,
    examinedKey: `vc_${i + 1}_examined`,
    cataractKey: `vc_${i + 1}_cataract`,
    otherDiseasesKey: `vc_${i + 1}_other_diseases`,
    refractiveErrorsKey: `vc_${i + 1}_refractive_errors`,
    spectaclesPrescribedKey: `vc_${i + 1}_spectacles_prescribed`
  }))
};

sections.push(visionCenter);

export default sections;
