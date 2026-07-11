const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  switchApp: (url) => ipcRenderer.send('switch-app', url),
  loadExtension: () => ipcRenderer.invoke('load-extension'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  toggleSettingsView: (isOpen) => ipcRenderer.send('toggle-settings-view', isOpen)
});
