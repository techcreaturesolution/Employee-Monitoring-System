import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Manager Integration Tests', () => {
  let adminToken: string;
  let managerId: string;
  let employeeId: string;

  const adminUser = {
    name: 'Manager Admin',
    email: 'admin_manager@example.com',
    password: 'StrongPass!2026',
    role: 'company_admin',
    companyName: 'Manager Test Co'
  };

  const employeeUser = {
    name: 'Manager Test Employee',
    email: 'emp_manager@example.com',
    password: 'StrongPass!2026',
    role: 'employee',
    department: 'Engineering'
  };

  beforeAll(async () => {
    // Register Admin
    await request(app).post('/api/auth/register').send(adminUser);
    await User.updateOne({ email: adminUser.email }, { $set: { isEmailVerified: true } });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.data.accessToken;

    // Create Employee for assign
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(employeeUser);
    
    employeeId = empRes.body.data.id;
  });

  it('admin can create a manager', async () => {
    const res = await request(app)
      .post('/api/managers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Manager One',
        email: 'manager1@example.com',
        password: 'StrongPass!2026',
        department: 'Engineering'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('manager');
    managerId = res.body.data._id;
  });

  it('admin can list managers', async () => {
    const res = await request(app)
      .get('/api/managers')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('admin can assign team to a manager', async () => {
    const res = await request(app)
      .post('/api/managers/assign-team')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        managerId,
        employeeIds: [employeeId]
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin can get manager team', async () => {
    const res = await request(app)
      .get(`/api/managers/team/${managerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.team)).toBe(true);
    expect(res.body.data.team.length).toBe(1);
  });
});
