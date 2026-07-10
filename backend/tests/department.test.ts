/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';

describe('Department Integration Tests', () => {
  let adminToken = '';
  let deptId = '';

  const adminUser = {
    name: 'Admin Dept User',
    companyName: 'Dept Test Co',
    email: 'admin_dept@example.com',
    password: 'StrongPass!2026',
  };

  const newDept = {
    name: 'Sales',
    description: 'Sales Department',
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(adminUser);
    await User.updateOne({ email: adminUser.email }, { $set: { isEmailVerified: true } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = loginRes.body.data.accessToken;
  });

  it('creates a department', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newDept);
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(newDept.name);
    deptId = res.body.data._id;
  });

  it('prevents duplicate department creation', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newDept);
    
    expect(res.status).toBe(409);
  });

  it('lists departments', async () => {
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('updates a department', async () => {
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated Description' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated Description');
  });

  it('deletes a department', async () => {
    const res = await request(app)
      .delete(`/api/departments/${deptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    
    // Check if deleted
    const getRes = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const exists = getRes.body.data.find((d: any) => d._id === deptId);
    expect(exists).toBeUndefined();
  });
});
