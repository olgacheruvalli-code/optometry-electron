// src/apiBase.js
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||      // runtime override (index.html / Electron)
  process.env.REACT_APP_API_BASE ||                              // build-time (Vercel env)
  "http://127.0.0.1:5000";                                       // Electron/local default

export default API_BASE;
