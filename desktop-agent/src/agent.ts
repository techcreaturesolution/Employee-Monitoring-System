import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface AgentConfig {
  agentKey: string;
  apiBaseUrl: string;
  screenshotInterval: number;
  heartbeatInterval: number;
}

interface ActivityEntry {
  appName: string;
  windowTitle: string;
  url: string;
  startTime: string;
  durationMinutes: number;
  category: string;
}

export class AgentService {
  private config: AgentConfig;
  private api: AxiosInstance;
  private screenshotTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private activityBuffer: ActivityEntry[] = [];
  private running = false;
  private tempDir: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.tempDir = path.join(os.tmpdir(), 'ems-agent');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    this.api = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        'x-agent-key': config.agentKey,
      },
      timeout: 30000,
    });
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('[Agent] Starting...');

    try {
      const configRes = await this.api.get('/config');
      const serverConfig = configRes.data.data;
      console.log('[Agent] Server config received:', serverConfig);

      if (serverConfig.screenshotInterval) {
        this.config.screenshotInterval = serverConfig.screenshotInterval;
      }
    } catch (error) {
      console.warn('[Agent] Could not fetch server config, using defaults');
    }

    await this.sendHeartbeat();

    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatInterval * 60 * 1000
    );

    this.screenshotTimer = setInterval(
      () => this.captureAndUpload(),
      this.config.screenshotInterval * 60 * 1000
    );

    setInterval(() => this.flushActivities(), 5 * 60 * 1000);

    console.log('[Agent] Running. Press Ctrl+C to stop.');
  }

  stop(): void {
    this.running = false;
    if (this.screenshotTimer) clearInterval(this.screenshotTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.flushActivities();
    console.log('[Agent] Stopped.');
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await this.api.post('/heartbeat');
      console.log('[Agent] Heartbeat sent');
    } catch (error) {
      console.error('[Agent] Heartbeat failed:', (error as Error).message);
    }
  }

  private async captureAndUpload(): Promise<void> {
    if (!this.running) return;

    try {
      console.log('[Agent] Capturing screenshot...');

      const filename = `screenshot_${Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);

      let captured = false;
      try {
        const screenshot = await import('screenshot-desktop');
        const imgBuffer = await screenshot.default();
        fs.writeFileSync(filepath, imgBuffer);
        captured = true;
      } catch {
        const placeholderBuffer = Buffer.alloc(100, 0);
        fs.writeFileSync(filepath, placeholderBuffer);
        captured = true;
        console.log('[Agent] Screenshot module unavailable, using placeholder');
      }

      if (captured && fs.existsSync(filepath)) {
        const formData = new FormData();
        formData.append('screenshot', fs.createReadStream(filepath), filename);
        formData.append('activeApp', await this.getActiveApp());
        formData.append('windowTitle', await this.getWindowTitle());
        formData.append('productivityTag', 'neutral');

        await this.api.post('/screenshot', formData, {
          headers: { ...formData.getHeaders() },
        });

        console.log('[Agent] Screenshot uploaded');

        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.error('[Agent] Screenshot capture/upload failed:', (error as Error).message);
    }
  }

  private async getActiveApp(): Promise<string> {
    try {
      const activeWin = await import('active-win');
      const win = await activeWin.default();
      return win?.owner?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private async getWindowTitle(): Promise<string> {
    try {
      const activeWin = await import('active-win');
      const win = await activeWin.default();
      return win?.title || '';
    } catch {
      return '';
    }
  }

  trackActivity(entry: ActivityEntry): void {
    this.activityBuffer.push(entry);
  }

  private async flushActivities(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    try {
      const activities = [...this.activityBuffer];
      this.activityBuffer = [];

      await this.api.post('/activity', { activities });
      console.log(`[Agent] Flushed ${activities.length} activity entries`);
    } catch (error) {
      console.error('[Agent] Activity flush failed:', (error as Error).message);
    }
  }

  async punchIn(): Promise<void> {
    try {
      await this.api.post('/punch-in', {
        ip: '',
        location: { latitude: 0, longitude: 0, address: 'Desktop Agent' },
      });
      console.log('[Agent] Punched in');
    } catch (error) {
      console.error('[Agent] Punch in failed:', (error as Error).message);
    }
  }

  async punchOut(): Promise<void> {
    try {
      await this.api.post('/punch-out', {
        ip: '',
        location: { latitude: 0, longitude: 0, address: 'Desktop Agent' },
      });
      console.log('[Agent] Punched out');
    } catch (error) {
      console.error('[Agent] Punch out failed:', (error as Error).message);
    }
  }
}
