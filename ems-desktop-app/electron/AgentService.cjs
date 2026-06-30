const { queueActivity, getUnsyncedActivities, markAsSynced, getApiUrl, queueScreenshot, getUnuploadedScreenshots, markScreenshotAsUploaded } = require('./storage.cjs');
const { app, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

class AgentService {
  constructor() {
    this.screenshotInterval = 5 * 60 * 1000; // 5 minutes
    this.activityInterval = 5 * 1000;        // 5 seconds
    this.syncInterval = 30 * 1000;           // 30 seconds
    this.heartbeatInterval = 30 * 1000;      // 30 seconds
    this.idleInterval = 5000;                // 5 seconds

    this.activityTimer = null;
    this.screenshotTimer = null;
    this.syncTimer = null;
    this.heartbeatTimer = null;
    this.idleTimer = null;
    
    this.tempDir = path.join(app.getPath('temp'), 'ems-agent');
    this.offlineScreenshotsDir = path.join(app.getPath('userData'), 'offline-screenshots');
    
    if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
    if (!fs.existsSync(this.offlineScreenshotsDir)) fs.mkdirSync(this.offlineScreenshotsDir, { recursive: true });
    
    this.apiBaseUrl = getApiUrl();
    this.token = null;
    this.agentKey = null;
    
    this.accumulatedIdleSeconds = 0;
    this.isUserIdle = false;
    
    // Memory buffer for activities to avoid constant SQLite writes
    this.activityBuffer = [];

    // Register Power Monitor events for Sleep / Hibernate / Lock
    powerMonitor.on('suspend', () => {
      console.log('System suspending, pausing tracking...');
      this.stop();
    });
    powerMonitor.on('lock-screen', () => {
      console.log('Screen locked, pausing tracking...');
      this.stop();
    });
    powerMonitor.on('resume', () => {
      console.log('System resumed, resuming tracking...');
      if (this.token) this.start();
    });
    powerMonitor.on('unlock-screen', () => {
      console.log('Screen unlocked, resuming tracking...');
      if (this.token) this.start();
    });
  }

  setToken(token, agentKey) {
    this.token = token;
    this.agentKey = agentKey;
  }

  start() {
    console.log('Agent starting background tasks...');
    this.stop(); // Clear any existing intervals first to avoid duplicate timers
    
    this.activityTimer = setInterval(() => this.trackActivity(), this.activityInterval);
    this.screenshotTimer = setInterval(() => this.captureScreenshot(), this.screenshotInterval);
    this.syncTimer = setInterval(() => this.syncData(), this.syncInterval);
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
    this.idleTimer = setInterval(() => this.checkIdle(), this.idleInterval);
  }

  stop() {
    if (this.activityTimer) { clearInterval(this.activityTimer); this.activityTimer = null; }
    if (this.screenshotTimer) { clearInterval(this.screenshotTimer); this.screenshotTimer = null; }
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.idleTimer) { clearInterval(this.idleTimer); this.idleTimer = null; }
    
    // Flush remaining buffered memory activities to SQLite before stopping
    this.flushBufferToDb();
  }

  async flushBufferToDb() {
    if (this.activityBuffer.length === 0) return;
    const toFlush = [...this.activityBuffer];
    this.activityBuffer = [];
    console.log(`Flushing ${toFlush.length} activities to local database`);
    for (const act of toFlush) {
      await queueActivity(act).catch(err => console.error('Failed to flush activity:', err));
    }
  }

  async checkIdle() {
    try {
      const idleTime = powerMonitor.getSystemIdleTime();
      const thresholdSeconds = 300; // 5 minutes threshold
      
      const wasIdle = this.isUserIdle;
      const nowIdle = idleTime >= thresholdSeconds;
      
      if (nowIdle) {
        this.accumulatedIdleSeconds += 5;
      }
      
      // ONLY notify BrowserWindow renderer if active state actually changed!
      if (wasIdle !== nowIdle) {
        this.isUserIdle = nowIdle;
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('idle-status-changed', {
            isIdle: nowIdle,
            idleSeconds: idleTime
          });
        }
      }

      // If transition from idle back to active, sync accumulated idle time
      if (wasIdle && !nowIdle && this.accumulatedIdleSeconds > 0) {
        const idleMins = Math.round(this.accumulatedIdleSeconds / 60);
        this.accumulatedIdleSeconds = 0;
        if (idleMins > 0) {
          this.apiBaseUrl = getApiUrl();
          await axios.post(`${this.apiBaseUrl}/agent/sync`, {
            activities: [],
            idleTimeMinutes: idleMins
          }, {
            headers: { 
              'Authorization': `Bearer ${this.token}`,
              'x-agent-key': this.agentKey || ''
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Idle check failed', e);
    }
  }

  async sendHeartbeat() {
    if (!this.token) return;
    try {
      this.apiBaseUrl = getApiUrl();
      const status = this.isUserIdle ? 'idle' : 'working';
      await axios.post(`${this.apiBaseUrl}/agent/heartbeat`, {
        status,
        version: '1.2.0',
        internet: true,
        battery: 100 // default or mock value
      }, {
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'x-agent-key': this.agentKey || ''
        }
      });
    } catch (e) {
      console.error('Heartbeat failed', e.message);
    }
  }

  async trackActivity() {
    try {
      const activeWin = (await import('active-win')).default;
      const win = await activeWin();
      if (!win) return;
      
      const activity = {
        appName: win.owner?.name || 'Unknown',
        windowTitle: win.title || '',
        url: win.url || '',
        startTime: new Date().toISOString(),
        durationMinutes: this.activityInterval / 60000,
        category: this.isUserIdle ? 'idle' : 'productive' // base classification
      };
      
      // Store in memory queue to prevent constant disk I/O
      this.activityBuffer.push(activity);
    } catch (e) {
      console.error('Failed to track activity', e);
    }
  }

  async captureScreenshot() {
    if (!this.token) return;
    if (this.isUserIdle) {
      console.log('Skipping screenshot capture because employee is idle');
      return;
    }
    
    let filepath = '';
    let filename = '';
    let win = null;
    try {
      const activeWin = (await import('active-win')).default;
      win = await activeWin();
      
      // Save initially as jpg instead of png to match compressed format
      filename = `screenshot_${Date.now()}.jpg`;
      filepath = path.join(this.tempDir, filename);
      
      const screenshot = require('screenshot-desktop');
      const imgBuffer = await screenshot();
      
      // Compress using sharp to 1280x720 JPEG quality 75%
      let finalBuffer = imgBuffer;
      try {
        const sharp = require('sharp');
        finalBuffer = await sharp(imgBuffer)
          .jpeg({ quality: 75 })
          .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
      } catch (sharpErr) {
        console.error('Sharp compression failed, writing raw screenshot:', sharpErr.message);
      }
      
      fs.writeFileSync(filepath, finalBuffer);
      
      const formData = new FormData();
      formData.append('screenshot', fs.createReadStream(filepath), filename);
      formData.append('activeApp', win?.owner?.name || 'Unknown');
      formData.append('windowTitle', win?.title || '');

      this.apiBaseUrl = getApiUrl(); // refresh url
      await axios.post(`${this.apiBaseUrl}/agent/screenshot`, formData, {
        headers: { 
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.token}`,
          'x-agent-key': this.agentKey || ''
        }
      });
      fs.unlinkSync(filepath);
    } catch (e) {
      console.error('Failed to capture screenshot, queueing offline:', e.message);
      if (filepath && fs.existsSync(filepath)) {
        try {
          const offlinePath = path.join(this.offlineScreenshotsDir, filename);
          fs.renameSync(filepath, offlinePath);
          await queueScreenshot(offlinePath, win?.owner?.name || 'Unknown', win?.title || '');
        } catch (dbErr) {
          console.error('Failed to queue offline screenshot:', dbErr);
        }
      }
    }
  }

  async syncData() {
    if (!this.token) return;
    
    // 1. Sync Activities (flush memory queue first)
    try {
      const localUnsynced = await getUnsyncedActivities();
      const localParsed = localUnsynced.map(r => JSON.parse(r.data));
      
      // Merge memory buffer into sync payload
      const buffered = [...this.activityBuffer];
      const mergedActivities = [...localParsed, ...buffered];
      
      if (mergedActivities.length > 0) {
        this.apiBaseUrl = getApiUrl();
        const res = await axios.post(`${this.apiBaseUrl}/agent/sync`, {
          activities: mergedActivities
        }, {
          headers: { 
            'Authorization': `Bearer ${this.token}`,
            'x-agent-key': this.agentKey || ''
          }
        });

        if (res.data.success) {
          // Clear successfully synced memory buffer
          this.activityBuffer = this.activityBuffer.filter(a => !buffered.includes(a));
          // Mark local db items as synced
          if (localUnsynced.length > 0) {
            await markAsSynced(localUnsynced.map(a => a.id));
          }
        } else {
          // Sync failed, write memory buffer to SQLite to ensure it is cached
          await this.flushBufferToDb();
        }
      }
    } catch (e) {
      console.error('Activity sync failed, saving memory buffer to disk:', e.message);
      await this.flushBufferToDb();
    }

    // 2. Sync Offline Screenshots
    try {
      const unuploaded = await getUnuploadedScreenshots();
      for (const s of unuploaded) {
        if (!fs.existsSync(s.filePath)) {
          await markScreenshotAsUploaded([s.id]);
          continue;
        }
        
        try {
          const filename = path.basename(s.filePath);
          const formData = new FormData();
          formData.append('screenshot', fs.createReadStream(s.filePath), filename);
          formData.append('activeApp', s.appName || 'Unknown');
          formData.append('windowTitle', s.windowTitle || '');

          this.apiBaseUrl = getApiUrl();
          const res = await axios.post(`${this.apiBaseUrl}/agent/screenshot`, formData, {
            headers: { 
              ...formData.getHeaders(),
              'Authorization': `Bearer ${this.token}`,
              'x-agent-key': this.agentKey || ''
            }
          });

          if (res.data.success) {
            fs.unlinkSync(s.filePath);
            await markScreenshotAsUploaded([s.id]);
          }
        } catch (uploadErr) {
          console.error(`Failed to upload queued screenshot ${s.id}:`, uploadErr.message);
          break; // Stop syncing remaining if network is still down
        }
      }
    } catch (e) {
      console.error('Offline screenshot sync failed:', e.message);
    }
  }
}

module.exports = new AgentService();
