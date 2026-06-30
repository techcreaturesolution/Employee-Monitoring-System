const electronStore = require('electron-store');
const Store = electronStore.default || electronStore;
const path = require('path');
const { app } = require('electron');
const sqlite3 = require('sqlite3').verbose();

// ============ SECURE TOKEN STORAGE ============
const tokenStore = new Store({
  name: 'ems-tokens',
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-key-change-in-production',
});

// ============ SQLITE DATABASE FOR OFFLINE QUEUE ============
const dbPath = path.join(app.getPath('userData'), 'ems-data.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS screenshot_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filePath TEXT NOT NULL,
      appName TEXT,
      windowTitle TEXT,
      uploaded INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_synced ON activity_queue(synced)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded ON screenshot_queue(uploaded)`);
});

// ============ TOKEN MANAGEMENT ============
module.exports = {
  // Token storage
  setToken: (token, agentKey) => {
    tokenStore.set('accessToken', token);
    tokenStore.set('agentKey', agentKey);
  },

  getToken: () => tokenStore.get('accessToken'),
  getAgentKey: () => tokenStore.get('agentKey'),

  clearTokens: () => {
    tokenStore.delete('accessToken');
    tokenStore.delete('agentKey');
  },

  setApiUrl: (url) => tokenStore.set('apiUrl', url),
  getApiUrl: () => tokenStore.get('apiUrl') || 'http://127.0.0.1:5000/api',

  // Activity queue
  queueActivity: (activity) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO activity_queue (data, synced) VALUES (?, ?)',
        [JSON.stringify(activity), 0],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  getUnsyncedActivities: () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM activity_queue WHERE synced = 0 ORDER BY createdAt ASC LIMIT 100',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  markAsSynced: (ids) => {
    if (!ids || ids.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      db.run(`UPDATE activity_queue SET synced = 1 WHERE id IN (${placeholders})`, ids, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },

  cleanupOldRecords: () => {
    return new Promise((resolve, reject) => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      db.run(
        'DELETE FROM activity_queue WHERE synced = 1 AND createdAt < ?',
        [cutoff],
        (err) => { if (err) reject(err); else resolve(); }
      );
    });
  },

  getQueueCount: () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM activity_queue WHERE synced = 0', (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  },

  queueScreenshot: (filePath, appName, windowTitle) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO screenshot_queue (filePath, appName, windowTitle, uploaded) VALUES (?, ?, ?, 0)',
        [filePath, appName, windowTitle],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  getUnuploadedScreenshots: () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM screenshot_queue WHERE uploaded = 0 ORDER BY createdAt ASC LIMIT 10',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  markScreenshotAsUploaded: (ids) => {
    if (!ids || ids.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      db.run(`UPDATE screenshot_queue SET uploaded = 1 WHERE id IN (${placeholders})`, ids, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
};
