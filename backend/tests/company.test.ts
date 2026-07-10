/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';

describe('Company Integration Tests', () => {
  let adminToken = '';
  
  const adminUser = {
    name: 'Admin Company User',
    companyName: 'Company Test Co',
    email: 'admin_company@example.com',
    password: 'StrongPass!2026',
  };

  const newEmployee = {
    name: 'Company Employee',
    email: 'company_emp@example.com',
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

  it('admin can get company analytics', async () => {
    const res = await request(app)
      .get('/api/company/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workforce.totalEmployees).toBeDefined();
    expect(res.body.data.workforce.totalEmployees).toBeGreaterThanOrEqual(1);
    expect(res.body.data.workforce.activeEmployees).toBeDefined();
    expect(res.body.data.departmentStats).toBeDefined();
    expect(res.body.data.company.name).toBeDefined();
  });

  it('employee cannot access company analytics', async () => {
    await User.updateOne({ email: newEmployee.email }, { $set: { isEmailVerified: true } });
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newEmployee.email, password: 'StrongPass!2026' });
    const empToken = empLoginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/company/analytics')
      .set('Authorization', `Bearer ${empToken}`);
    
    expect(res.status).toBe(403);
  });
});
