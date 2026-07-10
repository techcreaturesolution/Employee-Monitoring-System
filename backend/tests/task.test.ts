import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Task Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let taskId: string;

  const adminUser = {
    name: 'Task Admin',
    email: 'admin_task@example.com',
    password: 'StrongPass!2026',
    role: 'company_admin',
    companyName: 'Task Test Co'
  };

  const employeeUser = {
    name: 'Task Employee',
    email: 'emp_task@example.com',
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
    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(employeeUser);
    
    await User.updateOne({ email: employeeUser.email }, { $set: { isEmailVerified: true } });
    const empLogin = await request(app).post('/api/auth/login').send({ email: employeeUser.email, password: employeeUser.password });
    employeeToken = empLogin.body.data.accessToken;
  });

  it('employee can create a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Complete backend module',
        deadline: '2026-07-20'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Complete backend module');
    expect(res.body.data.done).toBe(false);
    taskId = res.body.data._id;
  });

  it('employee can list their tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('employee can update a task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ done: true });
    
    expect(res.status).toBe(200);
    expect(res.body.data.done).toBe(true);
  });

  it('employee can filter tasks by done status', async () => {
    const res = await request(app)
      .get('/api/tasks?done=true')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].done).toBe(true);
  });
});
