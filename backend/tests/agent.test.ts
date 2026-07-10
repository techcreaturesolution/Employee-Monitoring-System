import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import { Attendance } from '../src/modules/attendance/attendance.model';
import { ActivityLog } from '../src/modules/activity/activity.model';
import { Screenshot } from '../src/modules/screenshot/screenshot.model';

describe('Agent Integration Tests', () => {
  let tenantId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let agentKey: string;

  beforeAll(async () => {
    // Clean collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Attendance.deleteMany({});
    await ActivityLog.deleteMany({});
    await Screenshot.deleteMany({});

    // Create a tenant
    const tenant = await Tenant.create({
      name: 'Agent Test Co',
      email: 'admin_agent@example.com',
      plan: 'enterprise',
      settings: {
        screenshotInterval: 10,
        trackApps: true,
        trackUrls: true,
        blurScreenshots: false,
        workStartTime: '09:00',
        workEndTime: '17:00',
        idleTimeThreshold: 5,
        autoStopTracking: true,
      }
    });
    tenantId = tenant._id as mongoose.Types.ObjectId;

    agentKey = 'agent_key_' + new mongoose.Types.ObjectId().toHexString();

    // Create an employee with agent key
    const employee = await User.create({
      name: 'Agent Employee',
      email: 'emp_agent@example.com',
      password: 'StrongPass!2026',
      role: 'employee',
      tenantId,
      agentKey,
      status: 'active',
      isEmailVerified: true
    });
    employeeId = employee._id as mongoose.Types.ObjectId;
  });

  afterAll(async () => {
    // handled by setup.ts
  });

  it('agent can send heartbeat', async () => {
    const res = await request(app)
      .post('/api/agent/heartbeat')
      .set('x-agent-key', agentKey);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await User.findById(employeeId);
    expect(user?.isOnline).toBe(true);
    expect(user?.lastActive).toBeDefined();
  });

  it('agent can get config', async () => {
    const res = await request(app)
      .get('/api/agent/config')
      .set('x-agent-key', agentKey);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.screenshotInterval).toBe(10);
    expect(res.body.data.trackApps).toBe(true);
  });

  it('agent can punch in', async () => {
    const res = await request(app)
      .post('/api/agent/punch-in')
      .set('x-agent-key', agentKey)
      .send({
        ip: '127.0.0.1',
        location: { latitude: 40.7128, longitude: -74.0060, address: 'NY' }
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.punchIn).toBeDefined();
    expect(res.body.data.status).toBe('present');
  });

  it('agent can get status', async () => {
    const res = await request(app)
      .get('/api/agent/status')
      .set('x-agent-key', agentKey);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPunchedIn).toBe(true);
    expect(res.body.data.punchInTime).toBeDefined();
  });

  it('agent can log activity', async () => {
    const res = await request(app)
      .post('/api/agent/activity')
      .set('x-agent-key', agentKey)
      .send({
        activities: [
          {
            appName: 'vscode',
            windowTitle: 'agent.test.ts - Employee-Monitoring-System',
            startTime: new Date().toISOString(),
            durationMinutes: 5,
          }
        ]
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);

    const logs = await ActivityLog.find({ userId: employeeId });
    expect(logs.length).toBe(1);
    expect(logs[0].category).toBe('productive'); // VS Code should be productive
  });

  it('agent can sync activities and idle time', async () => {
    const res = await request(app)
      .post('/api/agent/sync')
      .set('x-agent-key', agentKey)
      .send({
        activities: [
          {
            appName: 'Slack',
            windowTitle: 'General Channel',
            startTime: new Date().toISOString(),
            durationMinutes: 2,
          }
        ],
        idleTimeMinutes: 10
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const attendance = await Attendance.findOne({ userId: employeeId });
    expect(attendance?.idleMinutes).toBe(10);
  });

  it('agent can upload a screenshot', async () => {
    const res = await request(app)
      .post('/api/agent/screenshot')
      .set('x-agent-key', agentKey)
      .field('activeApp', 'Chrome')
      .field('windowTitle', 'StackOverflow')
      .attach('screenshot', Buffer.from('fake image content'), 'test.png');
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imageUrl).toBeDefined();

    const screenshots = await Screenshot.find({ userId: employeeId });
    expect(screenshots.length).toBe(1);
  });

  it('agent can punch out', async () => {
    const res = await request(app)
      .post('/api/agent/punch-out')
      .set('x-agent-key', agentKey)
      .send({
        ip: '127.0.0.1'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.punchOut).toBeDefined();
    
    const user = await User.findById(employeeId);
    expect(user?.isOnline).toBe(false);
  });
});
