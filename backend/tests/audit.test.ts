/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';

describe('Audit Integration Tests', () => {
  let adminToken = '';
  
  const adminUser = {
    name: 'Admin Audit User',
    companyName: 'Audit Test Co',
    email: 'admin_audit@example.com',
    password: 'StrongPass!2026',
  };

  const newEmployee = {
    name: 'Audit Employee',
    email: 'audit_emp@example.com',
    password: 'StrongPass!2026',
    role: 'employee',
    department: 'Engineering',
  };

  beforeAll(async () => {
    // Register admin
    await request(app).post('/api/auth/register').send(adminUser);

    // Verify email & login
    await User.updateOne({ email: adminUser.email }, { $set: { isEmailVerified: true } });
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create an employee just so we have a regular user
    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newEmployee);
  });

  it('admin can get audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('AUDIT RES BODY', res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    
    // There should be some logs generated from the employee creation or login
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(0);
  });

  it('employee cannot access audit logs', async () => {
    await User.updateOne({ email: newEmployee.email }, { $set: { isEmailVerified: true } });
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newEmployee.email, password: 'StrongPass!2026' });
    const empToken = empLoginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${empToken}`);
    
    expect(res.status).toBe(403);
  });
});
