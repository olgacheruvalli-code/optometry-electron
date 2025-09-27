// src/data/connectedLinks.js

// Standard submenus for every district:
export const SUBMENUS = [
  "Blind Register",
  "Cataract Backlog",
  "Old aged Spectacles",
  "School Children Spectacles",
];

// Helper: build an object with all submenus, no links yet
const emptyDistrict = () =>
  Object.fromEntries(SUBMENUS.map((k) => [k, null]));

// IMPORTANT: district keys must exactly match the user's district string
const LINKS_CONFIG = {
  // ✅ Filled for Kozhikode (your real links)
  Kozhikode: {
    "Blind Register":
      "https://docs.google.com/spreadsheets/d/19MlrGzm6WYUEt7BRFP2VMxhUOzOd_C7sHloI7LBBXrI/edit?usp=sharing",
    "Cataract Backlog":
      "https://docs.google.com/spreadsheets/d/1DMOOQ3ZVyxPlgVhl3vI0huDcb1vuGNVkaPsokxdler4/edit?usp=sharing",
    "Old aged Spectacles":
      "https://docs.google.com/spreadsheets/d/1lNOg6bl5NJu2j8q-BVITfkdL3CWwsC65pWM29fioPhw/edit?usp=sharing",
    "School Children Spectacles":
      "https://docs.google.com/spreadsheets/d/1MDhuyGOamcoHv1Gl0hkcqeP86hQeY84O3X3KZvMx0pc/edit?usp=sharing",
  },

  // ✅ Prepared for all other Kerala districts (add links later)
  Thiruvananthapuram: emptyDistrict(),
  Kollam: emptyDistrict(),
  Pathanamthitta: emptyDistrict(),
  Alappuzha: emptyDistrict(),
  Kottayam: emptyDistrict(),
  Idukki: emptyDistrict(),
  Ernakulam: emptyDistrict(),
  Thrissur: emptyDistrict(),
  Palakkad: emptyDistrict(),
  Malappuram: emptyDistrict(),
  Wayanad: emptyDistrict(),
  Kannur: {
  "Old aged Spectacles": [
    {
      label: "Old aged Spectacles (Google Sheet)",
      url: "https://docs.google.com/spreadsheets/d/1FqUEg4IEkU9KhwhWvs5n-T4mq-ITBS7T92NGgm7zX_g/edit?usp=drivesdk"
    }
  ],
  "School Children Spectacles": [
    {
      label: "School Children Spectacles (Google Sheet)",
      url: "https://docs.google.com/spreadsheets/d/1i2CkYKqzHvxoBY3dsUiwFzMh6vVm1_DYU0MIMdNTGBA/edit?usp=drivesdk"
    }
  ],
},
  Kasaragod: emptyDistrict(),
};

export default LINKS_CONFIG;
