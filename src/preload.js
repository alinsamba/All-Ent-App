/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  switchApp: (url, siteId, forceNavigate) => ipcRenderer.send('switch-app', { url, siteId, forceNavigate }),
  openExternalPopup: (url) => ipcRenderer.send('open-external-popup', url),
  toggleSplit: (rightSiteId, enable) => ipcRenderer.send('toggle-split-screen', { rightSiteId, enable }),
  getSplitState: () => ipcRenderer.invoke('get-split-state'),
  showSplitMenu: (bounds) => ipcRenderer.send('show-split-menu', bounds),
  onSplitStateChanged: (callback) => ipcRenderer.on('split-state-changed', (e, state) => callback(state)),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  togglePIP: () => ipcRenderer.send('toggle-pip'),
  onFullscreenChanged: (callback) => ipcRenderer.on('fullscreen-changed', (e, state) => callback(state)),
  onPIPChanged: (callback) => ipcRenderer.on('pip-changed', (e, isPIP) => callback(isPIP)),
  loadExtension: () => ipcRenderer.invoke('load-extension'),
  installWebstoreExtension: (idOrUrl) => ipcRenderer.invoke('install-webstore-extension', idOrUrl),
  removeExtension: (extPath) => ipcRenderer.invoke('remove-extension', extPath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  updateSettings: (settings) => ipcRenderer.send('update-settings', settings),
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (e, settings) => callback(settings)),
  toggleSettingsView: (isOpen) => ipcRenderer.send('toggle-settings-view', isOpen),
  mediaPlayPause: () => ipcRenderer.send('media-play-pause'),
  mediaNext: () => ipcRenderer.send('media-next'),
  mediaPrev: () => ipcRenderer.send('media-prev'),
  navBack: () => ipcRenderer.send('nav-back'),
  navForward: () => ipcRenderer.send('nav-forward'),
  navReload: () => ipcRenderer.send('nav-reload'),
  setVolume: (vol) => ipcRenderer.send('set-volume', vol),
  getSiteIcon: (url) => ipcRenderer.invoke('get-site-icon', url),
  onPageNavigated: (callback) => ipcRenderer.on('page-navigated', (e, url) => callback(url)),
  getLoadedExtensions: () => ipcRenderer.invoke('get-loaded-extensions'),
  openExtensionPopup: (id, popupPath, anchorBounds, placement) => ipcRenderer.invoke('open-extension-popup', { id, popupPath, anchorBounds, placement }),
  showExtensionsMenu: (bounds) => ipcRenderer.send('show-extensions-menu', bounds),
  onShowLoader: (callback) => ipcRenderer.on('show-loader', () => callback()),
  onHideLoader: (callback) => ipcRenderer.on('hide-loader', () => callback()),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (e, theme) => callback(theme))
});
