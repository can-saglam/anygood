// Preload script for Electron IPC communication
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFocusQuickAdd: (callback) => {
    ipcRenderer.on('focus-quick-add', (event, ...args) => {
      if (callback) {
        callback();
      }
    });
  },
  triggerHaptic: (intensity) => {
    ipcRenderer.send('trigger-haptic', intensity);
  },
  fetchURLMetadata: async (url) => {
    return await ipcRenderer.invoke('fetch-url-metadata', url);
  }
});
