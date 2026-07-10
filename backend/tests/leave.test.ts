import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Leave Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let leaveId: string;

  const adminUser = {
    name: 'Leave Admin',
    email: 'admin_leave@example.com',
    password: 'StrongPass!2026',
    role: 'company_admin',
    companyName: 'Leave Test Co'
  };

  const employeeUser = {
    name: 'Leave Employee',
    email: 'emp_leave@example.com',
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

  it('employee can apply for leave', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const endOfNextWeek = new Date(nextWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 2);

    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        leaveType: 'casual',
        startDate: nextWeek.toISOString(),
        endDate: endOfNextWeek.toISOString(),
        reason: 'Going out of town for a family event'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leaveType).toBe('casual');
    expect(res.body.data.status).toBe('pending');
    leaveId = res.body.data._id;
  });

  it('employee can get their leaves', async () => {
    const res = await request(app)
      .get('/api/leaves/my')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.leaves)).toBe(true);
    expect(res.body.data.leaves.length).toBeGreaterThan(0);
  });

  it('admin can list all leaves in company', async () => {
    const res = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.leaves)).toBe(true);
    expect(res.body.data.leaves.length).toBeGreaterThan(0);
  });

  it('admin can approve leave', async () => {
    const res = await request(app)
      .put(`/api/leaves/${leaveId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('employee can cancel their own leave', async () => {
    const res = await request(app)
      .delete(`/api/leaves/${leaveId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/cancel/i);
  });
});
