const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workbenchAPI', {
    load: () => ipcRenderer.invoke('load-workbench'),
    save: (data) => ipcRenderer.invoke('save-workbench', data),
    exportBackup: (data) => ipcRenderer.invoke('export-backup', data),
    // 新增 initStore
    initStore: () => ipcRenderer.invoke('init-store')
});