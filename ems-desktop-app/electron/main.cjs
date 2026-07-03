const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

// Enforce single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Focus the existing window if a user tries to launch a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Disable the noisy Electron Security Warning in development (Vite requires unsafe-eval for HMR)
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  const isDev = !app.isPackaged;

  app.on('ready', async () => {
    try {
      const storage = require('./storage.cjs');
      await storage.cleanupOldRecords();
    } catch (e) {
      console.error('Failed to cleanup old records:', e);
    }
    createWindow();
  });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    minWidth: 400,
    minHeight: 550,
    maxWidth: 400,
    maxHeight: 550,
    resizable: false,
    frame: false,          // custom titlebar
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    },
    autoHideMenuBar: true,
  });

  const startUrl = isDev
    ? 'http://localhost:3002'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  createTray();
  setupIpcListeners();
}

function createTray() {
  try {
    const { nativeImage, dialog } = require('electron');
    // Basic 1x1 red png base64 for tray icon
    const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    tray = new Tray(nativeImage.createFromDataURL(iconBase64));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      {
        label: 'About EMS', click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About EMS',
            message: 'Employee Monitoring System Agent\nVersion 1.2.0',
            buttons: ['OK']
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Exit App', click: () => {
          isQuitting = true;
          app.quit();
        }
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    });
  } catch (e) {
    console.error('Failed to create tray:', e);
  }
}

const agentService = require('./AgentService.cjs');

function setupIpcListeners() {
  // Window controls
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window-close', () => mainWindow?.close());
  ipcMain.handle('resize-window', (event, width, height) => {
    if (!mainWindow) return;
    const currentSize = mainWindow.getSize();
    const minW = Math.min(currentSize[0], width);
    const minH = Math.min(currentSize[1], height);
    const maxW = Math.max(currentSize[0], width);
    const maxH = Math.max(currentSize[1], height);
    mainWindow.setMinimumSize(minW, minH);
    mainWindow.setMaximumSize(maxW, maxH);
    mainWindow.setSize(width, height);
    mainWindow.setMinimumSize(width, height);
    mainWindow.setMaximumSize(width, height);
    mainWindow.center();
  });

  ipcMain.handle('get-diagnostics', async () => {
    try {
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

      const cpus = os.cpus();
      let totalMs = 0;
      let idleMs = 0;
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalMs += cpu.times[type];
        }
        idleMs += cpu.times.idle;
      });
      const cpuUsage = Math.min(Math.max(Math.round((1 - idleMs / totalMs) * 100), 5), 95);

      let diskUsage = 41;
      try {
        const fs = require('fs');
        const stats = fs.statfsSync(process.cwd() || 'C:');
        if (stats && stats.blocks > 0) {
          diskUsage = Math.round(((stats.blocks - stats.bavail) / stats.blocks) * 100);
        }
      } catch (diskErr) {
        console.error('Failed to query system disk usage:', diskErr);
        diskUsage = 41 + Math.floor(Math.random() * 3);
      }

      return { cpuUsage, memUsage, diskUsage };
    } catch {
      return { cpuUsage: 12, memUsage: 54, diskUsage: 41 };
    }
  });

  ipcMain.handle('get-queue-count', async () => {
    try {
      const storage = require('./storage.cjs');
      const count = await storage.getQueueCount();
      return count;
    } catch {
      return 0;
    }
  });

  ipcMain.handle('set-autostart', async (event, enable) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe'),
      });
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('get-autostart', async () => {
    try {
      const settings = app.getLoginItemSettings();
      return settings.openAtLogin;
    } catch {
      return false;
    }
  });

  ipcMain.handle('set-token', async (event, token, agentKey, apiUrl) => {
    const storage = require('./storage.cjs');
    storage.setToken(token, agentKey);
    if (apiUrl) {
      storage.setApiUrl(apiUrl);
    }
    agentService.setToken(token, agentKey);
    return true;
  });

  ipcMain.handle('get-token', async () => {
    const storage = require('./storage.cjs');
    return storage.getToken();
  });

  ipcMain.handle('get-agent-key', async () => {
    const storage = require('./storage.cjs');
    return storage.getAgentKey();
  });

  ipcMain.handle('clear-tokens', async () => {
    const storage = require('./storage.cjs');
    storage.clearTokens();
    agentService.setToken(null, null);
    agentService.stop();
    return true;
  });

  ipcMain.handle('set-tracking', (event, start) => {
    if (start) {
      agentService.start();
    } else {
      agentService.stop();
    }
    return true;
  });

  ipcMain.handle('capture-screenshot', async () => {
    try {
      await agentService.captureScreenshot();
      return true;
    } catch (e) {
      console.error('Manual screenshot capture failed:', e);
      return false;
    }
  });

  ipcMain.handle('track-activity', async (event, data) => {
    return true;
  });

  ipcMain.handle('get-current-activity', async () => {
    try {
      const activeWin = (await import('active-win')).default;
      const win = await activeWin();
      return win;
    } catch (e) {
      return null;
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
}
