// Preload script for Electron IPC communication
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFocusQuickAdd: (callback) => {
    ipcRenderer.on('focus-quick-add', callback);
  }
});
