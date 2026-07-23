/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { app, BrowserWindow, session } = require('electron');
const { loadSettings } = require('./main/settings');
const { initAdblocker } = require('./main/adblocker');
const { createWindow } = require('./main/window');
const { registerIpcHandlers } = require('./main/ipc');
const state = require('./main/state');

// Configure Autoplay Policy
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function setupLinuxDesktopEntry() {
  if (process.platform !== 'linux') return;
  const fs = require('fs');
  const path = require('path');
  try {
    const desktopFilePath = path.join(app.getPath('home'), '.local/share/applications', 'all-ent-app.desktop');
    
    // Copy the icon to a standard directory outside of ASAR so the desktop manager can load it
    const targetIconDir = path.join(app.getPath('home'), '.local/share/icons');
    const targetIconPath = path.join(targetIconDir, 'all-ent-app.png');
    const sourceIconPath = path.join(app.getAppPath(), 'aea.png');
    
    fs.mkdirSync(targetIconDir, { recursive: true });
    if (fs.existsSync(sourceIconPath)) {
      fs.copyFileSync(sourceIconPath, targetIconPath);
    }
    
    const execPath = `"${process.execPath}" "${app.getAppPath()}"`;
    
    const desktopContent = `[Desktop Entry]
Name=All Ent App
Exec=${execPath}
Icon=${targetIconPath}
Type=Application
Terminal=false
StartupWMClass=all-ent-app
Comment=All Entertainment App Wrapper
Categories=Network;WebBrowser;
`;
    
    fs.mkdirSync(path.dirname(desktopFilePath), { recursive: true });
    fs.writeFileSync(desktopFilePath, desktopContent, 'utf8');
  } catch (err) {
    console.error('Failed to create desktop entry:', err);
  }
}

app.whenReady().then(async () => {
  setupLinuxDesktopEntry();
  app.setName('All Ent App');
  await loadSettings();
  
  // Load saved extensions asynchronously after a short delay
  if (state.settings && state.settings.extensions) {
    setTimeout(async () => {
      const appSession = session.fromPartition('persist:allentapp');
      await Promise.all(state.settings.extensions.map(async (extPath) => {
        try {
          await session.defaultSession.extensions.loadExtension(extPath);
        } catch (e) {
          console.error('Failed to load saved extension in defaultSession:', extPath, e);
        }
        try {
          await appSession.extensions.loadExtension(extPath);
        } catch (e) {
          console.error('Failed to load saved extension in persist:allentapp session:', extPath, e);
        }
      }));
    }, 500);
  }

  await initAdblocker();
  
  registerIpcHandlers();

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
