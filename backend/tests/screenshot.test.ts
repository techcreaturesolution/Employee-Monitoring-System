import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import { Screenshot } from '../src/modules/screenshot/screenshot.model';
import fs from 'fs';
import path from 'path';

describe('Screenshot Integration Tests', () => {
  let tenantId: mongoose.Types.ObjectId;
  let adminId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let adminToken: string;
  let employeeToken: string;
  let screenshotId: string;

  beforeAll(async () => {
    // Clean collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Screenshot.deleteMany({});

    // Create a tenant
    const tenant = await Tenant.create({
      name: 'Screenshot Test Co',
      email: 'admin_ss@example.com',
      plan: 'enterprise'
    });
    tenantId = tenant._id as mongoose.Types.ObjectId;

    // Create admin
    const admin = await User.create({
      name: 'SS Admin',
      email: 'admin_ss@example.com',
      password: 'StrongPass!2026',
      role: 'company_admin',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    adminId = admin._id as mongoose.Types.ObjectId;

    // Create employee
    const employee = await User.create({
      name: 'SS Employee',
      email: 'emp_ss@example.com',
      password: 'StrongPass!2026',
      role: 'employee',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    employeeId = employee._id as mongoose.Types.ObjectId;

    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin_ss@example.com', password: 'StrongPass!2026' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app).post('/api/auth/login').send({ email: 'emp_ss@example.com', password: 'StrongPass!2026' });
    employeeToken = empRes.body.data.accessToken;
  });

  afterAll(async () => {
    // handled by setup.ts
  });

  it('employee can upload a screenshot', async () => {
    const res = await request(app)
      .post('/api/screenshots/upload')
      .set('Authorization', `Bearer ${employeeToken}`)
      .field('activeApp', 'Chrome')
      .field('windowTitle', 'Google Docs')
      .field('productivityTag', 'productive')
      .attach('screenshot', Buffer.from('fake image content'), 'test_screenshot.png');
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.screenshot).toBeDefined();
    expect(res.body.data.screenshot.activeApp).toBe('Chrome');
    screenshotId = res.body.data.screenshot._id;
  });

  it('admin can list screenshots', async () => {
    const res = await request(app)
      .get('/api/screenshots')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.screenshots)).toBe(true);
    expect(res.body.data.screenshots.length).toBeGreaterThan(0);
  });

  it('employee can get their own screenshots timeline', async () => {
    const res = await request(app)
      .get('/api/screenshots/view/timeline')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  it('admin can get a single screenshot', async () => {
    const res = await request(app)
      .get(`/api/screenshots/${screenshotId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.screenshot._id).toBe(screenshotId);
  });

  it('admin can get screenshot filters', async () => {
    const res = await request(app)
      .get('/api/screenshots/view/filters')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.employees)).toBe(true);
  });

  it('admin can get screenshot grid', async () => {
    const res = await request(app)
      .get('/api/screenshots/view/grid')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.screenshots)).toBe(true);
  });

  it('admin can delete a screenshot', async () => {
    const res = await request(app)
      .delete(`/api/screenshots/${screenshotId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const check = await request(app)
      .get(`/api/screenshots/${screenshotId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(check.status).toBe(404);
  });
});
