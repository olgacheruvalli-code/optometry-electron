// src/index.jsx
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

// If some libs expect `global`, map it to `window` in the browser.
window.global = window;

console.log("🔥 Renderer bootstrapping…");

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
