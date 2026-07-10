/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';
import mongoose from 'mongoose';

describe('Tenant Integration Tests', () => {
  let superAdminToken = '';
  let tenantId = '';

  const superAdmin = {
    name: 'Super Admin',
    email: 'superadmin_tenant@example.com',
    password: 'StrongPass!2026',
    role: 'super_admin',
    isEmailVerified: true
  };

  beforeAll(async () => {
    // Manually insert a super admin
    const user = new User(superAdmin);
    await user.save();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password });
    
    console.log('LOGIN RES BODY:', loginRes.body);
    superAdminToken = loginRes.body.data.accessToken;
  });

  it('super admin can create a tenant', async () => {
    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        companyName: 'Test Tenant Co',
        companyEmail: 'tenant_co@example.com',
        adminName: 'Admin Tenant',
        plan: 'enterprise'
      });
    
    console.log('TENANT RES BODY', res.body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tenant.name).toBe('Test Tenant Co');
    tenantId = res.body.data.tenant._id;
  });

  it('super admin can list all tenants', async () => {
    const res = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.tenants).toBeDefined();
    expect(Array.isArray(res.body.data.tenants)).toBe(true);
    expect(res.body.data.tenants.length).toBeGreaterThan(0);
  });

  it('super admin can get a specific tenant', async () => {
    const res = await request(app)
      .get(`/api/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(tenantId);
  });

  it('super admin can update a tenant', async () => {
    const res = await request(app)
      .put(`/api/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        plan: 'enterprise'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('enterprise');
  });

  it('super admin can delete a tenant', async () => {
    const res = await request(app)
      .delete(`/api/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    
    expect(res.status).toBe(200);
    
    // Verify it is deactivated
    const dbTenant = await Tenant.findById(tenantId);
    expect(dbTenant?.status).toBe('suspended');
  });

  it('regular user cannot access tenant routes', async () => {
    // Create regular user
    await request(app).post('/api/auth/register').send({
      name: 'Reg User',
      companyName: 'Reg Co',
      email: 'reg_user@example.com',
      password: 'StrongPass!2026'
    });
    
    await User.updateOne({ email: 'reg_user@example.com' }, { $set: { isEmailVerified: true } });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reg_user@example.com', password: 'StrongPass!2026' });
    
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(403);
  });
});
