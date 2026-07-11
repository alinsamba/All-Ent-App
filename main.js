const { app, BrowserWindow, shell, session, WebContentsView, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

// --- Settings Management ---
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const defaultSites = [
  { id: 'nav-spotify', url: 'https://open.spotify.com', name: 'Spotify', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.56.3z"/></svg>' },
  { id: 'nav-yt', url: 'https://www.youtube.com', name: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
  { id: 'nav-ytm', url: 'https://music.youtube.com', name: 'YouTube Music', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>' },
  { id: 'nav-genius', url: 'https://genius.com', name: 'Genius', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect width="24" height="24" rx="4" fill="currentColor" fill-opacity="0.1"/><text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-weight="800" font-size="18" fill="currentColor">G</text></svg>' }
];

function loadSettings() {
  let loaded = { extensions: [], sites: defaultSites };
  try {
    if (fs.existsSync(settingsPath)) {
      const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (parsed.extensions) loaded.extensions = parsed.extensions;
      if (parsed.sites) loaded.sites = parsed.sites;
    }
  } catch(e) {
    console.error('Error loading settings', e);
  }
  return loaded;
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

  // Dynamic allowed hosts check
  const isAllowed = (urlStr) => {
    try {
      const parsedUrl = new URL(urlStr);
      return settings.sites.some(site => {
        try {
          const siteUrl = new URL(site.url);
          const baseHost = siteUrl.hostname.replace(/^www\./, '');
          return parsedUrl.hostname.includes(baseHost);
        } catch (e) {
          return false;
        }
      });
    } catch(e) {
      return false;
    }
  };

  // Prevent navigation to random external sites
  view.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
    }
  });

  // Open external links (like auth or ads) in default system browser
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowed(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Default launch site
  if (settings.sites.length > 0) {
    view.webContents.loadURL(settings.sites[0].url);
  }
}

// --- IPC Handlers for UI ---
ipcMain.on('switch-app', (e, url) => {
  if(view) view.webContents.loadURL(url);
});

ipcMain.on('update-settings', (e, newSettings) => {
  settings = newSettings;
  saveSettings(settings);
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
