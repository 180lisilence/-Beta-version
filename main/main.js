const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// 数据存储路径：用户数据目录下的 workbench-data.json
const DATA_FILE = path.join(app.getPath('userData'), 'workbench-data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: '个人工作台',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload.js')
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // ---------- IPC 处理器 ----------
  ipcMain.handle('load-workbench', async () => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      if (err.code === 'ENOENT') return { success: true, data: null };
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-workbench', async (event, data) => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export-backup', async (event, data) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '导出备份文件',
      defaultPath: `workbench-backup-${new Date().toISOString().slice(0,10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});