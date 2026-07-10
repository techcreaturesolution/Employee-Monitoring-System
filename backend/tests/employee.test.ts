/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';

describe('Employee Integration Tests', () => {
  let adminToken = '';
  let employeeId = '';

  const adminUser = {
    name: 'Admin User',
    companyName: 'Emp Test Co',
    email: 'admin_emp@example.com',
    password: 'StrongPass!2026',
  };

  const newEmployee = {
    name: 'New Employee',
    email: 'employee1@example.com',
    role: 'employee',
    department: 'Engineering',
    designation: 'Developer',
  };

  beforeAll(async () => {
    // Register company admin
    await request(app).post('/api/auth/register').send(adminUser);
    await User.updateOne({ email: adminUser.email }, { $set: { isEmailVerified: true } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = loginRes.body.data.accessToken;
  });

  it('adds a new employee successfully', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newEmployee);
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(newEmployee.email);
    expect(res.body.data.tempPassword).toBeDefined();
    employeeId = res.body.data.id;
  });

  it('prevents adding duplicate employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newEmployee);
    
    expect(res.status).toBe(409);
  });

  it('lists employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.employees).toBeInstanceOf(Array);
    expect(res.body.data.employees.length).toBeGreaterThan(0);
  });

  it('fetches single employee by id', async () => {
    const res = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(newEmployee.email);
  });

  it('updates employee details', async () => {
    const res = await request(app)
      .put(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ designation: 'Senior Developer' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.designation).toBe('Senior Developer');
  });

  it('deactivates an employee', async () => {
    const res = await request(app)
      .delete(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);

    const checkRes = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.body.data.status).toBe('inactive');
  });
});
