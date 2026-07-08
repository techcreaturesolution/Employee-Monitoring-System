const { queueActivity, getUnsyncedActivities, markAsSynced, getApiUrl, queueScreenshot, getUnuploadedScreenshots, markScreenshotAsUploaded, getToken, getAgentKey } = require('./storage.cjs');
const { app } = require('electron');
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
    this.locationInterval = 10 * 60 * 1000; // 10 minutes

    this.activityTimer = null;
    this.screenshotTimer = null;
    this.syncTimer = null;
    this.heartbeatTimer = null;
    this.idleTimer = null;
    this.locationTimer = null;

    // Paths are resolved in init() after app is ready
    this.tempDir = null;
    this.offlineScreenshotsDir = null;

    this.apiBaseUrl = getApiUrl();
    this.token = getToken() || null;
    this.agentKey = getAgentKey() || null;

    this.accumulatedIdleSeconds = 0;
    this.isUserIdle = false;
    this.isOnBreak = false;

    // Memory buffer for activities to avoid constant SQLite writes
    this.activityBuffer = [];
    this.lastActivityLog = null;
    this.activityStartTime = new Date();
  }

  /**
   * Must be called once from app.on('ready', ...) in main.cjs.
   * Anything that touches powerMonitor, app.getPath(), or BrowserWindow
   * must live here — Electron forbids those APIs before the ready event.
   */
  init() {
    // Resolve app paths (only valid after ready)
    this.tempDir = path.join(app.getPath('temp'), 'ems-agent');
    this.offlineScreenshotsDir = path.join(app.getPath('userData'), 'offline-screenshots');

    if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
    if (!fs.existsSync(this.offlineScreenshotsDir)) fs.mkdirSync(this.offlineScreenshotsDir, { recursive: true });

    // powerMonitor is only accessible after app is ready
    const { powerMonitor } = require('electron');
    this.powerMonitor = powerMonitor;
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

  handle401() {
    console.log('[Agent] Received 401 Unauthorized from backend. Clearing tokens and stopping agent...');
    const storage = require('./storage.cjs');
    storage.clearTokens();
    this.token = null;
    this.agentKey = null;
    this.stop();
    
    // Notify the renderer window
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('force-logout');
    }
  }

  setBreakStatus(isOnBreak) {
    const wasOnBreak = this.isOnBreak;
    this.isOnBreak = isOnBreak;
    if (isOnBreak && !wasOnBreak) {
      console.log('[Agent] User went on break. Flushing current activity and pausing tracking...');
      this.flushCurrentActivity();
      this.flushBufferToDb();
    } else if (!isOnBreak && wasOnBreak) {
      console.log('[Agent] User returned from break. Resuming tracking...');
      this.activityStartTime = new Date();
      this.lastActivityLog = null;
    }
  }

  async fetchConfig() {
    if (!this.token) return;
    try {
      this.apiBaseUrl = getApiUrl();
      const res = await axios.get(`${this.apiBaseUrl}/agent/config`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'x-agent-key': this.agentKey || ''
        },
        timeout: 5000
      });
      if (res.data && res.data.success && res.data.data) {
        const serverConfig = res.data.data;
        if (serverConfig.screenshotInterval) {
          const newInterval = serverConfig.screenshotInterval * 60 * 1000;
          if (newInterval !== this.screenshotInterval) {
            console.log(`[Agent] Updating screenshot interval from ${this.screenshotInterval / 60000}m to ${serverConfig.screenshotInterval}m`);
            this.screenshotInterval = newInterval;
            if (this.screenshotTimer) {
              clearInterval(this.screenshotTimer);
              this.screenshotTimer = setInterval(() => this.captureScreenshot(), this.screenshotInterval);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Agent] Failed to fetch config:', e.message);
      if (e.response && e.response.status === 401) {
        this.handle401();
      }
    }
  }

  // ── Wait for backend to be reachable before starting timers ──────────────────
  async waitForBackend(maxAttempts = 5, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await axios.get(`${this.apiBaseUrl}/health`, { timeout: 3000 });
        console.log(`[Agent] Backend reachable on attempt ${attempt}`);
        return true;
      } catch (err) {
        if (attempt < maxAttempts) {
          console.log(`[Agent] Backend not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }
    console.warn('[Agent] Backend unreachable after all retries — will keep retrying on each sync cycle');
    return false;
  }

  start() {
    console.log('Agent starting background tasks...');
    this.stop(); // Clear any existing intervals first to avoid duplicate timers
    this.activityStartTime = new Date();
    this.lastActivityLog = null;
    
    // Wait for backend to be ready before firing heartbeats/sync
    // (avoids ECONNREFUSED flood during initial app startup)
    this.waitForBackend(5, 2000).then(async () => {
      await this.fetchConfig();
      this.activityTimer = setInterval(() => this.trackActivity(), this.activityInterval);
      this.screenshotTimer = setInterval(() => this.captureScreenshot(), this.screenshotInterval);
      this.syncTimer = setInterval(() => this.syncData(), this.syncInterval);
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
      this.idleTimer = setInterval(() => this.checkIdle(), this.idleInterval);
      
      this.trackLocation(); // run once immediately
      this.locationTimer = setInterval(() => this.trackLocation(), this.locationInterval);
    });
  }

  stop() {
    if (this.activityTimer) { clearInterval(this.activityTimer); this.activityTimer = null; }
    if (this.screenshotTimer) { clearInterval(this.screenshotTimer); this.screenshotTimer = null; }
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.idleTimer) { clearInterval(this.idleTimer); this.idleTimer = null; }
    if (this.locationTimer) { clearInterval(this.locationTimer); this.locationTimer = null; }
    
    this.flushCurrentActivity();
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
      const idleTime = this.powerMonitor.getSystemIdleTime();
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
      // Periodically refresh config on heartbeat
      await this.fetchConfig();

      this.apiBaseUrl = getApiUrl();
      const status = this.isOnBreak ? 'break' : (this.isUserIdle ? 'idle' : 'working');
      await axios.post(`${this.apiBaseUrl}/agent/heartbeat`, {
        status,
        version: '1.2.0',
        internet: true,
        battery: 100 // default or mock value
      }, {
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'x-agent-key': this.agentKey || ''
        },
        timeout: 5000,
      });
    } catch (e) {
      if (e.response && e.response.status === 401) {
        this.handle401();
      } else if (e.code !== 'ECONNREFUSED') {
        console.error('Heartbeat failed', e.message);
      } else {
        console.warn('[Agent] Heartbeat skipped — backend not reachable (offline mode)');
      }
    }
  }

  /**
   * Reverse-geocode lat/lng via Nominatim (OpenStreetMap) to get an accurate
   * city name. IP geolocation APIs often return the ISP-registered metro city
   * (e.g. "Ahmedabad") instead of the actual city (e.g. "Gandhinagar").
   * Nominatim resolves by actual coordinates, giving the correct district/city.
   */
  async reverseGeocodeNominatim(latitude, longitude) {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          timeout: 5000,
          headers: { 'User-Agent': 'EMS-DesktopAgent/1.0' }
        }
      );
      if (res.data && res.data.address) {
        const a = res.data.address;
        // Prefer the most specific city-level field available
        const city =
          a.city ||
          a.town ||
          a.village ||
          a.county ||
          a.state_district ||
          a.state ||
          '';
        const parts = [city, a.state, a.country].filter(Boolean);
        return parts.join(', ') || res.data.display_name || '';
      }
    } catch (e) {
      console.warn('[Agent] Nominatim reverse-geocode failed:', e.message);
    }
    return null;
  }

  setLastKnownLocation(coords) {
    this.lastKnownLocation = coords;
    this.lastKnownLocationTime = Date.now();
  }

  async fetchIPLocation() {
    let coords = null;
    let directAddress = null; // city string returned directly by the API (may already be precise)

    // Priority 1: Use precise OS-level location from renderer if fresh (< 15 minutes old)
    if (this.lastKnownLocation && (Date.now() - this.lastKnownLocationTime < 15 * 60 * 1000)) {
      coords = this.lastKnownLocation;
    }

    if (!coords) {
      // Priority 2: ipinfo.io — provides city field directly from BGP routing tables
      // and tends to be far more accurate than freeipapi for Indian cities.
      try {
        const res = await axios.get('https://ipinfo.io/json', {
          timeout: 5000,
          headers: { 'Accept': 'application/json' }
        });
        if (res.data && res.data.loc) {
          const [lat, lon] = res.data.loc.split(',').map(Number);
          if (lat && lon) {
            coords = { latitude: lat, longitude: lon };
            // Build a human-readable address from the fields ipinfo returns
            const city = res.data.city || '';
            const region = res.data.region || '';
            const country = res.data.country || '';
            if (city) directAddress = [city, region, country].filter(Boolean).join(', ');
          }
        }
      } catch (err) {
        console.warn('[Agent] ipinfo.io failed, trying ip-api.com...');
      }

      // Priority 3: ip-api.com as second fallback (also returns city)
      if (!coords) {
        try {
          const res = await axios.get('https://ip-api.com/json/?fields=status,lat,lon,city,regionName,country', { timeout: 5000 });
          if (res.data && res.data.status === 'success') {
            coords = { latitude: res.data.lat, longitude: res.data.lon };
            if (res.data.city) {
              directAddress = [res.data.city, res.data.regionName, res.data.country].filter(Boolean).join(', ');
            }
          }
        } catch (err2) {
          console.error('[Agent] All IP location services failed:', err2.message);
        }
      }
    }

    if (!coords) return null;

    // Final step: Nominatim reverse-geocoding gives the most precise local address
    // (correctly identifies Gandhinagar vs Ahmedabad using actual GPS coordinates)
    const nominatimAddress = await this.reverseGeocodeNominatim(coords.latitude, coords.longitude);

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      // Prefer Nominatim (most accurate) → directAddress from API → generic fallback
      address: nominatimAddress || directAddress || 'IP Location'
    };
  }

  async trackLocation() {
    if (!this.token) return;
    try {
      console.log('[Agent] Fetching live location...');
      const locationData = await this.fetchIPLocation();
      if (locationData) {
        console.log('[Agent] Current Location resolved:', locationData);
        this.apiBaseUrl = getApiUrl();
        await axios.post(`${this.apiBaseUrl}/location/track`, {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: 100,
          address: locationData.address,
          source: 'agent',
          batteryLevel: 100,
          networkType: 'WiFi'
        }, {
          headers: { 
            'Authorization': `Bearer ${this.token}`,
            'x-agent-key': this.agentKey || ''
          },
          timeout: 5000
        });
        console.log('[Agent] Location tracked successfully');
      }
    } catch (e) {
      console.error('[Agent] Location tracking failed:', e.message);
    }
  }

  async trackActivity() {
    if (this.isOnBreak) return;
    try {
      const activeWin = (await import('active-win')).default;
      const win = await activeWin();
      if (!win) return;
      
      const currentAppName = win.owner?.name || 'Unknown';
      const currentWindowTitle = win.title || '';
      
      // Detect activity change
      const activityChanged = 
        !this.lastActivityLog ||
        this.lastActivityLog.appName !== currentAppName ||
        this.lastActivityLog.windowTitle !== currentWindowTitle;
      
      if (activityChanged && this.lastActivityLog) {
        // Calculate actual duration of PREVIOUS activity
        const now = new Date();
        const durationMinutes = (now.getTime() - this.activityStartTime.getTime()) / (1000 * 60);
        
        const completedActivity = {
          ...this.lastActivityLog,
          durationMinutes: Math.round(durationMinutes * 100) / 100,  // Round to 2 decimals
          endTime: new Date().toISOString()
        };
        
        this.activityBuffer.push(completedActivity);
        this.activityStartTime = new Date();
      }
      
      // Store current activity for next comparison
      this.lastActivityLog = {
        appName: currentAppName,
        windowTitle: currentWindowTitle,
        url: win.url || '',
        startTime: this.activityStartTime.toISOString(),
        category: this.isUserIdle ? 'idle' : 'productive'
      };
      
    } catch (e) {
      console.error('Failed to track activity', e);
    }
  }

  flushCurrentActivity() {
    if (this.lastActivityLog && this.activityStartTime) {
      const now = new Date();
      const durationMinutes = (now.getTime() - this.activityStartTime.getTime()) / (1000 * 60);
      
      const finalActivity = {
        ...this.lastActivityLog,
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        endTime: now.toISOString()
      };
      
      this.activityBuffer.push(finalActivity);
      this.lastActivityLog = null;
      this.activityStartTime = now;
    }
  }

  async captureScreenshot() {
    if (!this.token) return;
    if (this.isUserIdle) {
      console.log('Skipping screenshot capture because employee is idle');
      return;
    }
    if (this.isOnBreak) {
      console.log('Skipping screenshot capture because employee is on break');
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
      if (e.response && e.response.status === 401) {
        this.handle401();
        return;
      }
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
      
      this.flushCurrentActivity();
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
      if (e.response && e.response.status === 401) {
        this.handle401();
        return;
      }
      // Distinguish offline from real error
      if (e.code === 'ECONNREFUSED') {
        console.warn('[Agent] Activity sync skipped — backend offline, buffering to disk');
      } else {
        console.error('Activity sync failed, saving memory buffer to disk:', e.message);
      }
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
            },
            timeout: 30000, // 30-second timeout so one slow upload doesn't block the queue
          });

          if (res.data.success) {
            if (fs.existsSync(s.filePath)) fs.unlinkSync(s.filePath);
            await markScreenshotAsUploaded([s.id]);
          } else {
            // Server responded but flagged failure — skip this one and continue
            console.warn(`Screenshot ${s.id} rejected by server, skipping.`);
          }
        } catch (uploadErr) {
          if (uploadErr.response && uploadErr.response.status === 401) {
            this.handle401();
            break;
          }
          const isNetworkDown = uploadErr.code && 
            ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'ENOTFOUND'].includes(uploadErr.code);
          if (isNetworkDown) {
            // Server/network is down — stop retrying entire batch until next sync cycle
            console.error(`Network error uploading screenshot ${s.id}, pausing queue:`, uploadErr.message);
            break;
          }
          // Server error (4xx/5xx) — skip this screenshot and continue with the rest
          console.error(`Failed to upload queued screenshot ${s.id} (will retry next cycle):`, uploadErr.message);
        }
      }
    } catch (e) {
      console.error('Offline screenshot sync failed:', e.message);
    }
  }
}

module.exports = new AgentService();
