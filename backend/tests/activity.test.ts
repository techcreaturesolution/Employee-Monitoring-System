import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import { ActivityLog } from '../src/modules/activity/activity.model';

describe('Activity Integration Tests', () => {
  let tenantId: mongoose.Types.ObjectId;
  let adminId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Clean collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await ActivityLog.deleteMany({});

    // Create a tenant
    const tenant = await Tenant.create({
      name: 'Activity Test Co',
      email: 'admin_act@example.com',
      plan: 'enterprise'
    });
    tenantId = tenant._id as mongoose.Types.ObjectId;

    // Create admin
    const admin = await User.create({
      name: 'Act Admin',
      email: 'admin_act@example.com',
      password: 'StrongPass!2026',
      role: 'company_admin',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    adminId = admin._id as mongoose.Types.ObjectId;

    // Create employee
    const employee = await User.create({
      name: 'Act Employee',
      email: 'emp_act@example.com',
      password: 'StrongPass!2026',
      role: 'employee',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    employeeId = employee._id as mongoose.Types.ObjectId;

    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin_act@example.com', password: 'StrongPass!2026' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app).post('/api/auth/login').send({ email: 'emp_act@example.com', password: 'StrongPass!2026' });
    employeeToken = empRes.body.data.accessToken;
  });

  afterAll(async () => {
    // handled by setup.ts
  });

  it('employee can log activity via normal api', async () => {
    const res = await request(app)
      .post('/api/activity/log')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        activities: [{
          appName: 'VSCode',
          windowTitle: 'Coding',
          url: '',
          durationMinutes: 10,
          category: 'productive'
        }]
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activity).toBeDefined();
  });

  it('admin can list activity logs', async () => {
    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.activities)).toBe(true);
    expect(res.body.data.activities.length).toBeGreaterThan(0);
  });

  it('admin can get activity summary', async () => {
    const res = await request(app)
      .get('/api/activity/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  it('admin can get keyboard activity', async () => {
    const res = await request(app)
      .get('/api/activity/keyboard')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin can get apps usage', async () => {
    const res = await request(app)
      .get('/api/activity/apps')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
