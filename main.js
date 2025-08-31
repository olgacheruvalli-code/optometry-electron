// main.js
const { app, BrowserWindow } = require('electron');

// ✅ Disable GPU to avoid GL_INVALID_OPERATION WebGL issues
app.disableHardwareAcceleration();  // <-- ADD THIS LINE

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  console.log('Frame is disabled:', mainWindow.isFrameless?.() ?? 'Check manually');

  mainWindow.loadURL('http://localhost:8080');

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Electron: page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`❌ Electron failed to load: [${errorCode}] ${errorDescription}`);
  });

  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(createWindow);
