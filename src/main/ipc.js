/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { ipcMain, session, dialog, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('cross-fetch');
const AdmZip = require('adm-zip');
const state = require('./state');
const { saveSettings } = require('./settings');
const { injectVolume } = require('./window');
const { PLAY_PAUSE_SCRIPT, NEXT_SCRIPT, PREV_SCRIPT } = require('./media');

let extensionPopupWin = null;
const extensionMetadataCache = new Map();
const fsp = fs.promises;

async function getExtensionMetadata(ext) {
  const cacheKey = `${ext.path}@${ext.version}`;
  if (extensionMetadataCache.has(cacheKey)) {
    return extensionMetadataCache.get(cacheKey);
  }

  let popupPath = null;
  let base64Icon = null;

  try {
    const manifestPath = path.join(ext.path, 'manifest.json');
    const manifestContent = await fsp.readFile(manifestPath, 'utf8').catch(() => null);
    if (manifestContent) {
      const manifest = JSON.parse(manifestContent);
      const action = manifest.action || manifest.browser_action || manifest.page_action;
      if (action) {
        popupPath = action.default_popup || null;
        let iconPath = null;
        if (action.default_icon) {
          if (typeof action.default_icon === 'string') {
            iconPath = action.default_icon;
          } else if (typeof action.default_icon === 'object') {
            const keys = Object.keys(action.default_icon).map(Number).sort((a, b) => b - a);
            if (keys.length > 0) iconPath = action.default_icon[keys[0]];
          }
        }
        if (!iconPath && manifest.icons) {
          const keys = Object.keys(manifest.icons).map(Number).sort((a, b) => b - a);
          if (keys.length > 0) iconPath = manifest.icons[keys[0]];
        }
        if (iconPath) {
          const iconFullPath = path.join(ext.path, iconPath);
          const buffer = await fsp.readFile(iconFullPath).catch(() => null);
          if (buffer) {
            const extName = path.extname(iconFullPath).replace('.', '') || 'png';
            base64Icon = `data:image/${extName};base64,${buffer.toString('base64')}`;
          }
        }
      }
    }
  } catch (err) {
    console.error(`Failed to parse manifest for extension ${ext.id}:`, err);
  }

  const metadata = { popupPath, icon: base64Icon };
  extensionMetadataCache.set(cacheKey, metadata);
  return metadata;
}

async function extractIconUrlFromHtml(origin) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(origin, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const linkRegex = /<link\s+[^>]*>/gi;
      let match;
      const candidateIcons = [];

      while ((match = linkRegex.exec(html)) !== null) {
        const linkTag = match[0];
        const relMatch = linkTag.match(/rel=["']([^"']*)["']/i);
        if (relMatch) {
          const rel = relMatch[1].toLowerCase();
          if (rel.includes('icon') || rel.includes('apple-touch-icon')) {
            const hrefMatch = linkTag.match(/href=["']([^"']*)["']/i);
            if (hrefMatch) {
              let href = hrefMatch[1];
              let size = 0;
              const sizesMatch = linkTag.match(/sizes=["']([^"']*)["']/i);
              if (sizesMatch) {
                const sizes = sizesMatch[1].toLowerCase();
                if (sizes === 'any') {
                  size = 999;
                } else {
                  const matchSz = sizes.match(/(\d+)x/);
                  if (matchSz) size = parseInt(matchSz[1], 10);
                }
              }
              let priority = rel.includes('apple-touch-icon') ? 100 + size : size;
              candidateIcons.push({ href, priority });
            }
          }
        }
      }

      if (candidateIcons.length > 0) {
        candidateIcons.sort((a, b) => b.priority - a.priority);
        const bestHref = candidateIcons[0].href;
        if (bestHref.startsWith('//')) {
          return 'https:' + bestHref;
        } else if (bestHref.startsWith('/')) {
          return origin + bestHref;
        } else if (bestHref.startsWith('http://') || bestHref.startsWith('https://')) {
          return bestHref;
        } else {
          return new URL(bestHref, origin).toString();
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse site HTML for favicon:', e.message);
  }
  return null;
}

async function fetchImageAsBase64(url, defaultContentType, logError = false) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const imgRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (imgRes.ok) {
      const contentType = imgRes.headers.get('content-type') || defaultContentType;
      const buffer = await imgRes.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      return `data:${contentType};base64,${base64Data}`;
    }
  } catch (e) {
    if (logError) {
      console.warn(`Failed to fetch image from ${url}:`, e.message);
    }
  }
  return null;
}

function registerIpcHandlers() {
  ipcMain.on('switch-app', (e, { url, siteId, forceNavigate }) => {
    // Security Fix: Validate URL against allowed settings
    let isValidUrl = false;
    try {
      // If no url is provided, skip URL validation (just focus switch)
      if (!url) {
        isValidUrl = true;
      } else {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          if (state.settings && state.settings.sites) {
            isValidUrl = state.settings.sites.some(site => {
              try {
                const siteUrl = new URL(site.url);
                const baseHost = siteUrl.hostname.replace(/^www\./, '');
                return parsed.hostname === baseHost || parsed.hostname.endsWith('.' + baseHost);
              } catch (err) {
                return false;
              }
            });
          }
        }
      }
    } catch (err) {
      isValidUrl = false;
    }

    if (!isValidUrl) {
      console.warn(`[Security] Blocked unauthorized URL navigation attempt in switch-app: ${url}`);
      return;
    }

    const isNew = !state.views.has(siteId);
    if (isNew && state.win && !state.win.isDestroyed()) {
      state.win.webContents.send('show-loader');
    }
    const { switchAppView } = require('./window');
    switchAppView(url, siteId, forceNavigate);
  });

  // Handle settings modal toggle by hiding active WebContentsViews
  ipcMain.removeAllListeners('toggle-settings-view');
  ipcMain.on('toggle-settings-view', (e, isOpen) => {
    try {
      if (isOpen) {
        if (state.isSplitMode) {
          const leftView = state.views.get(state.leftSiteId);
          const rightView = state.views.get(state.rightSiteId);
          if (leftView) state.win.contentView.removeChildView(leftView);
          if (rightView) state.win.contentView.removeChildView(rightView);
        } else if (state.view) {
          state.win.contentView.removeChildView(state.view);
        }
      } else {
        if (state.isSplitMode) {
          const leftView = state.views.get(state.leftSiteId);
          const rightView = state.views.get(state.rightSiteId);
          if (leftView) state.win.contentView.addChildView(leftView);
          if (rightView) state.win.contentView.addChildView(rightView);
        } else if (state.view) {
          state.win.contentView.addChildView(state.view);
        }
        // Dispatch resize to trigger the window.js resize handler
        state.win.emit('resize');
      }
    } catch (err) {
      console.error('Error toggling view:', err);
    }
  });

  ipcMain.on('media-play-pause', () => {
    if (!state.view) return;
    state.view.webContents.executeJavaScript(PLAY_PAUSE_SCRIPT).catch(err => console.error('Media play/pause error:', err));
  });

  ipcMain.on('media-next', () => {
    if (!state.view) return;
    state.view.webContents.executeJavaScript(NEXT_SCRIPT).catch(err => console.error('Media next error:', err));
  });

  ipcMain.on('media-prev', () => {
    if (!state.view) return;
    state.view.webContents.executeJavaScript(PREV_SCRIPT).catch(err => console.error('Media prev error:', err));
  });

  ipcMain.on('set-volume', (e, vol) => {
    state.appVolume = vol;
    state.settings.volume = vol;
    saveSettings(state.settings);
    if (!state.view) return;
    injectVolume(state.view.webContents, state.appVolume);
  });

  ipcMain.on('nav-back', () => {
    if (state.view && state.view.webContents.canGoBack()) {
      state.view.webContents.goBack();
    }
  });

  ipcMain.on('nav-forward', () => {
    if (state.view && state.view.webContents.canGoForward()) {
      state.view.webContents.goForward();
    }
  });

  ipcMain.on('nav-reload', () => {
    if (state.view) {
      state.view.webContents.reload();
    }
  });

  ipcMain.on('update-settings', (e, newSettings) => {
    const oldAdBlock = state.settings.adBlockEnabled;
    
    // Clean up views for deleted sites or sites whose URLs have changed
    if (newSettings && newSettings.sites) {
      const currentSiteMap = new Map(newSettings.sites.map(s => [s.id, s.url]));
      state.views.forEach((view, siteId) => {
        const currentUrlForSite = currentSiteMap.get(siteId);

        let shouldDestroy = false;
        if (!currentUrlForSite) {
          shouldDestroy = true; // Site was deleted
        } else {
          // Extract base origins to compare properly
          try {
            const newUrlObj = new URL(currentUrlForSite);
            const oldUrlObj = new URL(view.webContents.getURL());

            // Re-create the view if the core origin changes (e.g. they edited the site URL from youtube to spotify)
            if (newUrlObj.origin !== oldUrlObj.origin) {
              shouldDestroy = true;
            }
          } catch(e) {
             shouldDestroy = true;
          }
        }

        if (shouldDestroy) {
          try {
            if (state.win) {
              state.win.contentView.removeChildView(view);
            }
            view.webContents.destroy();
          } catch(err) {
            console.warn('Error cleaning up view:', err.message);
          }
          state.views.delete(siteId);
          if (state.leftSiteId === siteId) state.leftSiteId = null;
          if (state.rightSiteId === siteId) state.rightSiteId = null;
          if (state.view === view) state.view = null;
        }
      });
    }

    state.settings = newSettings;
    saveSettings(state.settings);
    
    if (state.blocker) {
      const shouldEnable = state.settings.adBlockEnabled !== false;
      const wasEnabled = oldAdBlock !== false;
      const persistSession = session.fromPartition('persist:allentapp');
      if (shouldEnable && !wasEnabled) {
        state.blocker.enableBlockingInSession(session.defaultSession);
        state.blocker.enableBlockingInSession(persistSession);
        console.log('Adblocker enabled dynamically on default and persistent sessions');
      } else if (!shouldEnable && wasEnabled) {
        state.blocker.disableBlockingInSession(session.defaultSession);
        state.blocker.disableBlockingInSession(persistSession);
        console.log('Adblocker disabled dynamically on default and persistent sessions');
      }
    }
  });

  ipcMain.on('toggle-split-screen', (e, { rightSiteId, enable }) => {
    const { setSplitScreenMode } = require('./window');
    setSplitScreenMode(rightSiteId, enable);
  });

  ipcMain.on('open-external-popup', (e, url) => {
    try {
      const parsedUrl = new URL(url);
      if (['http:', 'https:'].includes(parsedUrl.protocol)) {
        const { openBriefPopup } = require('./window');
        openBriefPopup(parsedUrl.href);
      } else {
        console.warn('Blocked opening external popup with invalid protocol:', parsedUrl.protocol);
      }
    } catch (err) {
      console.error('Invalid URL provided to open-external-popup:', err);
    }
  });

  ipcMain.on('toggle-fullscreen', () => {
    const { toggleFullscreen } = require('./window');
    toggleFullscreen();
  });

  ipcMain.handle('get-split-state', () => {
    return {
      isSplitMode: state.isSplitMode,
      leftSiteId: state.leftSiteId,
      rightSiteId: state.rightSiteId
    };
  });

  ipcMain.on('show-split-menu', (e, { x, y }) => {
    const { Menu } = require('electron');
    const { setSplitScreenMode } = require('./window');

    if (state.isSplitMode) {
      console.log('[IPC] show-split-menu: Split active, toggling OFF');
      setSplitScreenMode(null, false);
      state.win.webContents.send('split-state-changed', { isSplitMode: false });
      return;
    }

    console.log('[IPC] show-split-menu: Displaying native split menu');
    const activeId = state.leftSiteId;
    const otherSites = state.settings.sites.filter(s => s.id !== activeId);

    if (otherSites.length === 0) {
      const menu = Menu.buildFromTemplate([
        { label: 'No other sites to split with', enabled: false }
      ]);
      menu.popup({ window: state.win, x, y });
      return;
    }

    const menuTemplate = otherSites.map(site => ({
      label: site.name,
      click: () => {
        console.log(`[IPC] Native split menu selected site: ${site.id}`);
        setSplitScreenMode(site.id, true);
        state.win.webContents.send('split-state-changed', { isSplitMode: true });
      }
    }));

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({ window: state.win, x, y });
  });

  ipcMain.handle('load-extension', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select Unpacked Chrome Extension Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const extPath = result.filePaths[0];
      try {
        await session.defaultSession.extensions.loadExtension(extPath);
        try {
          await session.fromPartition('persist:allentapp').extensions.loadExtension(extPath);
        } catch (errPartition) {
          console.error('Failed to load extension in partition session:', errPartition);
        }
        if (!state.settings.extensions.includes(extPath)) {
          state.settings.extensions.push(extPath);
          saveSettings(state.settings);
        }
        return extPath;
      } catch (err) {
        console.error('Failed to load extension in default session:', err);
        return null;
      }
    }
    return null;
  });

  ipcMain.handle('install-webstore-extension', async (event, extensionIdOrUrl) => {
    const match = extensionIdOrUrl.trim().match(/[a-p]{32}/);
    if (!match) {
      return { success: false, error: 'Invalid Chrome Web Store Extension ID or URL.' };
    }
    const extensionId = match[0];
    const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
    
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        return { success: false, error: `Failed to download extension: HTTP ${response.status}` };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length < 12 || buffer.readUInt32BE(0) !== 0x43723234) {
        return { success: false, error: 'Downloaded file is not a valid Chrome extension package' };
      }
      
      const version = buffer.readUInt32LE(4);
      if (version !== 3) {
        return { success: false, error: `Unsupported CRX version: ${version}` };
      }
      
      const headerLength = buffer.readUInt32LE(8);
      const zipStartOffset = 12 + headerLength;
      if (zipStartOffset >= buffer.length) {
        return { success: false, error: 'Invalid Chrome extension package' };
      }
      
      const zipBuffer = buffer.subarray(zipStartOffset);
      const extensionsBaseDir = path.join(app.getPath('userData'), 'extensions');
      const extensionsDir = path.join(extensionsBaseDir, extensionId);
      
      if (fs.existsSync(extensionsDir)) {
        fs.rmSync(extensionsDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extensionsDir, { recursive: true });
      
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(extensionsDir, true);
      
      const ext = await session.defaultSession.extensions.loadExtension(extensionsDir);
      try {
        await session.fromPartition('persist:allentapp').extensions.loadExtension(extensionsDir);
      } catch (errPartition) {
        console.error('Failed to load webstore extension in partition session:', errPartition);
      }
      const extensionName = (ext && ext.name) || extensionId;
      
      if (!state.settings.extensions.includes(extensionsDir)) {
        state.settings.extensions.push(extensionsDir);
        saveSettings(state.settings);
      }
      
      return { success: true, path: extensionsDir, id: extensionId, name: extensionName };
    } catch (err) {
      console.error('Failed to install webstore extension:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('remove-extension', async (event, extPath) => {
    try {
      const loadedExts = session.defaultSession.extensions.getAllExtensions();
      const ext = loadedExts.find(e => e.path === extPath);
      if (ext) {
        session.defaultSession.extensions.removeExtension(ext.id);
      }
      try {
        const loadedExtsApp = session.fromPartition('persist:allentapp').extensions.getAllExtensions();
        const extApp = loadedExtsApp.find(e => e.path === extPath);
        if (extApp) {
          session.fromPartition('persist:allentapp').extensions.removeExtension(extApp.id);
        }
      } catch (errPartition) {
        console.error('Failed to remove extension from partition session:', errPartition);
      }
      
      const userDataExtensionsDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
      const resolvedExtPath = path.resolve(extPath);
      if (resolvedExtPath.startsWith(userDataExtensionsDir + path.sep)) {
        if (fs.existsSync(resolvedExtPath)) {
          fs.rmSync(resolvedExtPath, { recursive: true, force: true });
        }
      }
      
      state.settings.extensions = state.settings.extensions.filter(p => p !== extPath);
      saveSettings(state.settings);
      return true;
    } catch (err) {
      console.error('Failed to remove extension:', err);
      return false;
    }
  });

  ipcMain.handle('get-settings', () => state.settings);

  ipcMain.handle('get-app-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      author: "Nsamba Ali (alinsamba@outlook.com)",
      license: "ISC",
      copyright: "Copyright © 2026 Nsamba Ali. All rights reserved."
    };
  });

  ipcMain.handle('get-loaded-extensions', async () => {
    const extensions = session.fromPartition('persist:allentapp').extensions.getAllExtensions();
    return Promise.all(extensions.map(async ext => {
      const metadata = await getExtensionMetadata(ext);
      return {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        path: ext.path,
        popupPath: metadata.popupPath,
        icon: metadata.icon
      };
    }));
  });

  ipcMain.handle('open-extension-popup', async (event, { id, popupPath, anchorBounds, placement }) => {
    if (typeof id !== 'string' || typeof popupPath !== 'string') {
      throw new Error('Invalid arguments: id and popupPath must be strings.');
    }

    let popupUrl;
    try {
      const url = new URL(popupPath, `chrome-extension://${id}/`);
      if (url.protocol !== 'chrome-extension:' || url.hostname !== id) {
        throw new Error('Invalid popup path.');
      }
      popupUrl = url.href;
    } catch (e) {
      throw new Error('Invalid popup path.');
    }

    if (extensionPopupWin) {
      try { extensionPopupWin.close(); } catch (e) {
        console.warn('Error closing extension popup win:', e.message);
      }
      extensionPopupWin = null;
    }

    extensionPopupWin = new BrowserWindow({
      width: 360,
      height: 480,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      show: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        session: session.fromPartition('persist:allentapp')
      }
    });

    await extensionPopupWin.loadURL(popupUrl);

    const popupWidth = 360;
    const popupHeight = 480;
    let x = 0; let y = 0;

    if (placement === 'bottom') {
      x = Math.round(anchorBounds.x + anchorBounds.width - popupWidth);
      y = Math.round(anchorBounds.y + anchorBounds.height + 8);
    } else {
      x = Math.round(anchorBounds.x + anchorBounds.width + 8);
      y = Math.round(anchorBounds.y);
    }

    const { screen } = require('electron');
    const display = screen.getDisplayMatching({ x, y, width: popupWidth, height: popupHeight });
    const workArea = display.workArea;

    if (x < workArea.x) x = workArea.x + 8;
    if (x + popupWidth > workArea.x + workArea.width) x = workArea.x + workArea.width - popupWidth - 8;
    if (y < workArea.y) y = workArea.y + 8;
    if (y + popupHeight > workArea.y + workArea.height) y = workArea.y + workArea.height - popupHeight - 8;

    extensionPopupWin.setBounds({ x, y, width: popupWidth, height: popupHeight });
    extensionPopupWin.show();
    extensionPopupWin.focus();

    extensionPopupWin.on('blur', () => {
      if (extensionPopupWin) {
        extensionPopupWin.close();
        extensionPopupWin = null;
      }
    });
  });

  ipcMain.on('show-extensions-menu', async (e, { x, y }) => {
    const { Menu } = require('electron');
    
    // Get loaded extensions
    const loadedExts = session.fromPartition('persist:allentapp').extensions.getAllExtensions();
    if (loadedExts.length === 0) {
      const menu = Menu.buildFromTemplate([
        { label: 'No extensions loaded', enabled: false }
      ]);
      menu.popup({ window: state.win, x, y });
      return;
    }
    
    const pinnedExtensions = state.settings.pinnedExtensions || [];
    const menuTemplate = [];
    
    for (const ext of loadedExts) {
      const metadata = await getExtensionMetadata(ext);
      const popupPath = metadata.popupPath;
      
      const isPinned = pinnedExtensions.includes(ext.id);
      const submenuItems = [];
      
      if (popupPath) {
        submenuItems.push({
          label: 'Open Popup',
          click: async () => {
            const popupUrl = `chrome-extension://${ext.id}/${popupPath}`;
            if (extensionPopupWin) {
              try { extensionPopupWin.close(); } catch (err) {
                console.warn('Error closing extension popup win:', err.message);
              }
              extensionPopupWin = null;
            }
            const { BrowserWindow } = require('electron');
            extensionPopupWin = new BrowserWindow({
              width: 360,
              height: 480,
              frame: false,
              resizable: false,
              alwaysOnTop: true,
              show: false,
              skipTaskbar: true,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                session: session.fromPartition('persist:allentapp')
              }
            });
            await extensionPopupWin.loadURL(popupUrl);
            
            const popupWidth = 360;
            const popupHeight = 480;
            let px = x; let py = y;
            const { screen } = require('electron');
            const display = screen.getDisplayMatching({ x: px, y: py, width: popupWidth, height: popupHeight });
            const workArea = display.workArea;
            if (px + popupWidth > workArea.x + workArea.width) px = workArea.x + workArea.width - popupWidth - 8;
            if (py + popupHeight > workArea.y + workArea.height) py = workArea.y + workArea.height - popupHeight - 8;
            
            extensionPopupWin.setBounds({ x: px, y: py, width: popupWidth, height: popupHeight });
            extensionPopupWin.show();
            extensionPopupWin.focus();
            extensionPopupWin.on('blur', () => {
              if (extensionPopupWin) {
                extensionPopupWin.close();
                extensionPopupWin = null;
              }
            });
          }
        });
      } else {
        submenuItems.push({ label: 'No popup available', enabled: false });
      }
      
      submenuItems.push({
        label: 'Pin to Top Bar',
        type: 'checkbox',
        checked: isPinned,
        click: async () => {
          if (!state.settings.pinnedExtensions) {
            state.settings.pinnedExtensions = [];
          }
          const idx = state.settings.pinnedExtensions.indexOf(ext.id);
          if (idx > -1) {
            state.settings.pinnedExtensions.splice(idx, 1);
          } else {
            state.settings.pinnedExtensions.push(ext.id);
          }
          saveSettings(state.settings);
          state.win.webContents.send('settings-updated', state.settings);
        }
      });
      
      submenuItems.push({
        label: 'Remove Extension',
        click: async () => {
          try {
            const loadedExtsDefault = session.defaultSession.extensions.getAllExtensions();
            const extDefault = loadedExtsDefault.find(e => e.id === ext.id);
            if (extDefault) {
              session.defaultSession.extensions.removeExtension(ext.id);
            }
            session.fromPartition('persist:allentapp').extensions.removeExtension(ext.id);
            
            const userDataExtensionsDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
            const resolvedExtPath = path.resolve(ext.path);
            if (resolvedExtPath.startsWith(userDataExtensionsDir + path.sep)) {
              if (fs.existsSync(resolvedExtPath)) {
                fs.rmSync(resolvedExtPath, { recursive: true, force: true });
              }
            }
            state.settings.extensions = state.settings.extensions.filter(p => p !== ext.path);
            saveSettings(state.settings);
            state.win.webContents.send('settings-updated', state.settings);
          } catch (err) {
            console.error('Failed to remove extension via menu:', err);
          }
        }
      });
      
      menuTemplate.push({
        label: ext.name,
        submenu: submenuItems
      });
    }
    
    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({ window: state.win, x, y });
  });

  ipcMain.handle('get-site-icon', async (event, url) => {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const origin = parsedUrl.origin;
      let base64Icon = null;

      const iconUrl = await extractIconUrlFromHtml(origin);

      if (iconUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const imgRes = await fetch(iconUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (imgRes.ok) {
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            if (contentType.startsWith('image/')) {
              const buffer = await imgRes.arrayBuffer();
              const base64Data = Buffer.from(buffer).toString('base64');
              base64Icon = `data:${contentType};base64,${base64Data}`;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch extracted favicon from ${iconUrl}:`, e.message);
        }
      }

      if (!base64Icon) {
        try {
          const fallbackUrl = `${origin}/favicon.ico`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const imgRes = await fetch(fallbackUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (imgRes.ok) {
            const contentType = imgRes.headers.get('content-type') || 'image/x-icon';
            if (contentType.startsWith('image/')) {
              const buffer = await imgRes.arrayBuffer();
              const base64Data = Buffer.from(buffer).toString('base64');
              base64Icon = `data:${contentType};base64,${base64Data}`;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch fallback favicon.ico for ${domain}:`, e.message);
        }
      }

      if (!base64Icon) {
        try {
          const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const gRes = await fetch(googleFaviconUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (gRes.ok) {
            const contentType = gRes.headers.get('content-type') || 'image/png';
            if (contentType.startsWith('image/')) {
              const buffer = await gRes.arrayBuffer();
              const base64Data = Buffer.from(buffer).toString('base64');
              base64Icon = `data:${contentType};base64,${base64Data}`;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch google favicon for ${domain}:`, e.message);
        }
      }

      if (!base64Icon) {
        const firstLetter = (domain.replace('www.', '') || 'W').charAt(0).toUpperCase();
        return `letter:${firstLetter}`;
      }

      return base64Icon;
    } catch (err) {
      console.error('get-site-icon IPC error:', err);
      return 'letter:?';
    }
  });
}

module.exports = { registerIpcHandlers };
