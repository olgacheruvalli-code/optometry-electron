// src/polyfills.js
import process from "process";
import { Buffer } from "buffer";

// make “global” point at window (for any library that expects Node’s global)
window.global = window;
window.process = process;
window.Buffer = Buffer;
