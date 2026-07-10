import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Project Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;
  let projectId: string;

  const adminUser = {
    name: 'Project Admin',
    email: 'admin_proj@example.com',
    password: 'StrongPass!2026',
    role: 'company_admin',
    companyName: 'Project Test Co'
  };

  const employeeUser = {
    name: 'Project Employee',
    email: 'emp_proj@example.com',
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

    // Create Employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(employeeUser);
    
    employeeId = empRes.body.data.id;
    
    await User.updateOne({ email: employeeUser.email }, { $set: { isEmailVerified: true } });
    const empLogin = await request(app).post('/api/auth/login').send({ email: employeeUser.email, password: employeeUser.password });
    employeeToken = empLogin.body.data.accessToken;
  });

  it('admin can create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alpha Project',
        description: 'First test project',
        members: [employeeId]
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alpha Project');
    projectId = res.body.data._id;
  });

  it('employee cannot create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        name: 'Beta Project'
      });
    
    expect(res.status).toBe(403);
  });

  it('anyone can list projects', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.data.projects.length).toBeGreaterThan(0);
  });

  it('admin can update a project', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'archived' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('archived');
  });

  it('employee can add a time entry to a project', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/time-entries`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        description: 'Worked on setup',
        minutes: 120,
        date: new Date().toISOString()
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('can get time entries for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/time-entries`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].description).toBe('Worked on setup');
  });
});
