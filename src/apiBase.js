// src/apiBase.js
const DEFAULT = "https://optometry-backend-iiuk.onrender.com";   // <— use Render by default
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||      // runtime override (optional)
  process.env.REACT_APP_API_BASE ||                              // build-time override
  DEFAULT;

export default API_BASE;
