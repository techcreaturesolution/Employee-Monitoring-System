import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import { LocationLog } from '../src/modules/location/location.model';

describe('Location Integration Tests', () => {
  let tenantId: mongoose.Types.ObjectId;
  let adminId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Clean collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await LocationLog.deleteMany({});

    // Create a tenant
    const tenant = await Tenant.create({
      name: 'Location Test Co',
      email: 'admin_loc@example.com',
      plan: 'enterprise'
    });
    tenantId = tenant._id as mongoose.Types.ObjectId;

    // Create admin
    const admin = await User.create({
      name: 'Loc Admin',
      email: 'admin_loc@example.com',
      password: 'StrongPass!2026',
      role: 'company_admin',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    adminId = admin._id as mongoose.Types.ObjectId;

    // Create employee
    const employee = await User.create({
      name: 'Loc Employee',
      email: 'emp_loc@example.com',
      password: 'StrongPass!2026',
      role: 'employee',
      tenantId,
      status: 'active',
      isEmailVerified: true
    });
    employeeId = employee._id as mongoose.Types.ObjectId;

    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin_loc@example.com', password: 'StrongPass!2026' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app).post('/api/auth/login').send({ email: 'emp_loc@example.com', password: 'StrongPass!2026' });
    employeeToken = empRes.body.data.accessToken;
  });

  afterAll(async () => {
    // handled by setup.ts
  });

  it('employee can track location', async () => {
    const res = await request(app)
      .post('/api/location/track')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.location).toBeDefined();
    expect(res.body.data.location.latitude).toBe(40.7128);
  });

  it('employee can get their own location history', async () => {
    const res = await request(app)
      .get('/api/location/history')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.history)).toBe(true);
    expect(res.body.data.history.length).toBeGreaterThan(0);
  });

  it('admin can get live locations', async () => {
    const res = await request(app)
      .get('/api/location/live')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('admin can get location trail', async () => {
    const res = await request(app)
      .get(`/api/location/trail?userId=${employeeId.toString()}&date=${new Date().toISOString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
