const { app, BrowserWindow, shell, session, WebContentsView, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

// --- Settings Management ---
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch(e) {
    console.error('Error loading settings', e);
  }
  return { extensions: [] };
}
function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

let settings = loadSettings();
let view; // Global reference for IPC

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#070707', // Matches new --bg-dark
      symbolColor: '#ffffff',
      height: 40
    },
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js') // Preload for the UI shell
    }
  });

  // Load the new All Ent App UI shell
  win.loadFile('index.html');

  // Create a view for the external content
  view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
      // External sites don't need the IPC preload
    }
  });

  // Force desktop User Agent to prevent mobile UI from loading
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  view.webContents.setUserAgent(userAgent);

  win.contentView.addChildView(view);
  
  // Resize the view to fill the window minus the 40px title bar and 68px sidebar
  const resizeView = () => {
    try {
      const { width, height } = win.contentView.getBounds();
      view.setBounds({ x: 68, y: 40, width: width - 68, height: height - 40 });
    } catch(e) {}
  };
  
  win.on('resize', resizeView);
  win.on('maximize', resizeView);
  win.on('unmaximize', resizeView);
  win.on('restore', resizeView);
  resizeView();

  // Handle settings modal toggle by hiding the WebContentsView
  ipcMain.removeAllListeners('toggle-settings-view');
  ipcMain.on('toggle-settings-view', (e, isOpen) => {
    try {
      if (isOpen) {
        win.contentView.removeChildView(view);
      } else {
        win.contentView.addChildView(view);
        resizeView();
      }
    } catch (err) {
      console.error('Error toggling view:', err);
    }
  });

  // Allowed external hosts
  const allowedHosts = ['spotify.com', 'youtube.com', 'genius.com'];

  // Prevent navigation to random external sites
  view.webContents.on('will-navigate', (event, url) => {
    try {
      const parsedUrl = new URL(url);
      if (!allowedHosts.some(host => parsedUrl.hostname.includes(host))) {
        event.preventDefault();
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  // Open external links (like auth or ads) in default system browser
  view.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (!allowedHosts.some(host => parsedUrl.hostname.includes(host))) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (e) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Default launch site
  view.webContents.loadURL('https://open.spotify.com');
}

// --- IPC Handlers for UI ---
ipcMain.on('switch-app', (e, url) => {
  if(view) view.webContents.loadURL(url);
});

ipcMain.handle('load-extension', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    message: 'Select Unpacked Chrome Extension Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const extPath = result.filePaths[0];
    try {
      await session.defaultSession.loadExtension(extPath);
      if (!settings.extensions.includes(extPath)) {
        settings.extensions.push(extPath);
        saveSettings(settings);
      }
      return extPath;
    } catch (err) {
      console.error('Failed to load extension:', err);
      return null;
    }
  }
  return null;
});

ipcMain.handle('get-settings', () => settings);

app.whenReady().then(async () => {
  // Load saved extensions securely
  for (const extPath of settings.extensions) {
    try {
      await session.defaultSession.loadExtension(extPath);
    } catch (e) {
      console.error('Failed to load saved extension:', extPath, e);
    }
  }

  // Ghostery Adblocker
  const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  blocker.enableBlockingInSession(session.defaultSession);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
