const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setToken: (token, agentKey, apiUrl) => ipcRenderer.invoke('set-token', token, agentKey, apiUrl),
  getToken: () => ipcRenderer.invoke('get-token'),
  getAgentKey: () => ipcRenderer.invoke('get-agent-key'),
  clearTokens: () => ipcRenderer.invoke('clear-tokens'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  trackActivity: (data) => ipcRenderer.invoke('track-activity', data),
  getCurrentActivity: () => ipcRenderer.invoke('get-current-activity'),
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (event, ...args) => callback(...args)),
  onUserIdle: (callback) => ipcRenderer.on('user-idle', () => callback()),
  onIdleStatusChanged: (callback) => ipcRenderer.on('idle-status-changed', (event, data) => callback(data)),
  onForceLogout: (callback) => ipcRenderer.on('force-logout', () => callback()),
  // Window controls (for frameless window)
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow:    () => ipcRenderer.invoke('window-close'),
  resizeWindow:   (width, height) => ipcRenderer.invoke('resize-window', width, height),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  getQueueCount:  () => ipcRenderer.invoke('get-queue-count'),
  setAutoStart:   (enable) => ipcRenderer.invoke('set-autostart', enable),
  getAutoStart:   () => ipcRenderer.invoke('get-autostart'),
  setTracking:    (start) => ipcRenderer.invoke('set-tracking', start),
  setBreak:       (isOnBreak) => ipcRenderer.invoke('set-break', isOnBreak),
});
