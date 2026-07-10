/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';

describe('Permissions Integration Tests', () => {
  let adminToken = '';
  
  const adminUser = {
    name: 'Admin Perm User',
    companyName: 'Perm Test Co',
    email: 'admin_perm@example.com',
    password: 'StrongPass!2026',
  };

  const newEmployee = {
    name: 'Perm Employee',
    email: 'perm_emp@example.com',
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

  it('admin can get company permissions', async () => {
    const res = await request(app)
      .get('/api/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('admin can update permissions for a role', async () => {
    const res = await request(app)
      .put('/api/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'employee',
        module: 'attendance',
        actions: ['read', 'create']
      });
    
    expect(res.status).toBe(200);
    
    const verifyRes = await request(app)
      .get('/api/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const empPerm = verifyRes.body.data.find((p: any) => p.role === 'employee' && p.module === 'attendance');
    expect(empPerm.actions).toContain('create');
  });

  it('admin cannot modify super_admin permissions', async () => {
    const res = await request(app)
      .put('/api/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'super_admin',
        module: 'attendance',
        actions: ['read']
      });
    
    expect(res.status).toBe(403);
  });

  it('regular user cannot access permission routes', async () => {
    await User.updateOne({ email: newEmployee.email }, { $set: { isEmailVerified: true } });
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newEmployee.email, password: 'StrongPass!2026' });
    const empToken = empLoginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/permissions')
      .set('Authorization', `Bearer ${empToken}`);
    
    expect(res.status).toBe(403);
  });
});
