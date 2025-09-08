// main.js
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const url = require("url");

// ✅ Avoid some GPU/WebGL quirks on certain Macs
app.disableHardwareAcceleration();

const isDev =
  !app.isPackaged || process.env.NODE_ENV === "development" || !!process.env.ELECTRON_START_URL;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false, // keep your frameless window
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    backgroundColor: "#ffffff",
    show: false, // show after ready-to-show to avoid white flash
    webPreferences: {
      // Safer defaults; use a preload if you need Node in renderer
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // preload: path.join(__dirname, "preload.js"),
    },
  });

  // Dev loads CRA on 3000; Prod loads built index.html
  const startUrl =
    process.env.ELECTRON_START_URL ||
    (isDev
      ? "http://localhost:3000"
      : url.format({
          pathname: path.join(__dirname, "build", "index.html"),
          protocol: "file:",
          slashes: true,
        }));

  console.log("[Electron] Loading:", startUrl);
  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      try {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      } catch {}
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ Electron: page loaded successfully");
  });

  mainWindow.webContents.on("did-fail-load", (event, code, desc) => {
    console.error(`❌ Electron failed to load: [${code}] ${desc}`);
  });

  // Open external links in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      const base = new URL(startUrl);
      const next = new URL(target);
      if (base.origin !== next.origin) {
        shell.openExternal(target);
        return { action: "deny" };
      }
    } catch {
      shell.openExternal(target);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Block navigation away from the app; open externals in browser
  mainWindow.webContents.on("will-navigate", (e, target) => {
    try {
      const base = new URL(startUrl);
      const next = new URL(target);
      if (base.origin !== next.origin) {
        e.preventDefault();
        shell.openExternal(target);
      }
    } catch {
      e.preventDefault();
      shell.openExternal(target);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single-instance guard (useful on Win/Linux)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// Basic error logging
process.on("uncaughtException", (err) => console.error("[Electron] Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("[Electron] Unhandled rejection:", reason));
