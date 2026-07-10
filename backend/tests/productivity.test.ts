import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import { ActivityLog } from '../src/modules/activity/activity.model';
import { ProductivityKeyword } from '../src/modules/productivity/productivity.model';

describe('Productivity Integration Tests', () => {
  let tenantId: mongoose.Types.ObjectId;
  let adminId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let adminToken: string;
  let employeeToken: string;
  let keywordId: string;

  beforeAll(async () => {
    // Clean collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await ActivityLog.deleteMany({});
    await ProductivityKeyword.deleteMany({});

    // Create a tenant
    const tenant = await Tenant.create({
      name: 'Prod Test Co',
      email: 'admin_prod@example.com',
      plan: 'enterprise'
    });
    tenantId = tenant._id as mongoose.Types.ObjectId;

    // Create admin
    const admin = await User.create({
      name: 'Prod Admin',
      email: 'admin_prod@example.com',
      password: 'StrongPass!2026',
      role: 'company_admin',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    adminId = admin._id as mongoose.Types.ObjectId;

    // Create employee
    const employee = await User.create({
      name: 'Prod Employee',
      email: 'emp_prod@example.com',
      password: 'StrongPass!2026',
      role: 'employee',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    employeeId = employee._id as mongoose.Types.ObjectId;

    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin_prod@example.com', password: 'StrongPass!2026' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app).post('/api/auth/login').send({ email: 'emp_prod@example.com', password: 'StrongPass!2026' });
    employeeToken = empRes.body.data.accessToken;

    // Create some activity logs for productivity calculations
    await ActivityLog.create([
      {
        userId: employeeId,
        tenantId,
        appName: 'VSCode',
        windowTitle: 'Coding',
        url: '',
        durationMinutes: 60,
        category: 'productive',
        startTime: new Date(Date.now() - 3600000)
      },
      {
        userId: employeeId,
        tenantId,
        appName: 'YouTube',
        windowTitle: 'Videos',
        url: 'youtube.com',
        durationMinutes: 30,
        category: 'unproductive',
        startTime: new Date()
      }
    ]);
  });

  afterAll(async () => {
    // handled by setup.ts
  });

  it('admin can create a productivity keyword', async () => {
    const res = await request(app)
      .post('/api/productivity/keywords')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        keyword: 'github',
        category: 'productive',
        type: 'url'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.keyword).toBe('github');
    keywordId = res.body.data._id;
  });

  it('admin can list keywords', async () => {
    const res = await request(app)
      .get('/api/productivity/keywords')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.keywords)).toBe(true);
    expect(res.body.data.keywords.length).toBeGreaterThan(0);
  });

  it('admin can update a keyword', async () => {
    const res = await request(app)
      .put(`/api/productivity/keywords/${keywordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'unproductive'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('unproductive');
  });

  it('employee can get their own productivity stats', async () => {
    const res = await request(app)
      .get('/api/productivity/stats')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.productive).toBeDefined();
    expect(Array.isArray(res.body.data.topApps)).toBe(true);
  });

  it('admin can get employee productivity summary', async () => {
    const res = await request(app)
      .get(`/api/productivity/employee/${employeeId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();
  });

  it('admin can delete a keyword', async () => {
    const res = await request(app)
      .delete(`/api/productivity/keywords/${keywordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
