import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Notification Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;
  let notificationId: string;

  const adminUser = {
    name: 'Notify Admin',
    email: 'admin_notify@example.com',
    password: 'StrongPass!2026',
    role: 'company_admin',
    companyName: 'Notify Test Co'
  };

  const employeeUser = {
    name: 'Notify Employee',
    email: 'emp_notify@example.com',
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

  it('admin can create a notification for employee', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: employeeId,
        title: 'Welcome to EMS',
        message: 'Please complete your profile.',
        type: 'system'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Welcome to EMS');
    notificationId = res.body.data._id;
  });

  it('employee can get their notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThan(0);
    expect(res.body.data.notifications[0].read).toBe(false);
  });

  it('employee can mark notification as read', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.read).toBe(true);
  });

  it('employee can mark all notifications as read', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('employee can delete their notification', async () => {
    const res = await request(app)
      .delete(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
