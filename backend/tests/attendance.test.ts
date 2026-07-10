/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';
import { Tenant } from '../src/modules/tenant/tenant.model';

describe('Attendance Integration Tests', () => {
  let employeeToken = '';

  const adminUser = {
    name: 'Admin Attendance User',
    companyName: 'Att Test Co',
    email: 'admin_att@example.com',
    password: 'StrongPass!2026',
  };

  const newEmployee = {
    name: 'Att Employee',
    email: 'att_emp@example.com',
    role: 'employee',
    department: 'Engineering',
  };

  beforeAll(async () => {
    // Register admin
    await request(app).post('/api/auth/register').send(adminUser);
    await User.updateOne({ email: adminUser.email }, { $set: { isEmailVerified: true } });
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    const adminToken = adminLoginRes.body.data.accessToken;

    // Set geofence for the tenant
    const userObj = await User.findOne({ email: adminUser.email });
    await Tenant.updateOne(
      { _id: userObj!.tenantId },
      {
        $set: {
          'settings.enableGeofencing': true,
          'settings.requireLocationForPunch': true,
          'settings.officeLocations': [{
            name: 'HQ',
            latitude: 40.7128,
            longitude: -74.0060,
            radiusMeters: 100
          }]
        }
      }
    );

    // Create employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newEmployee);

    // Login employee
    await User.updateOne({ email: newEmployee.email }, { $set: { isEmailVerified: true } });
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newEmployee.email, password: empRes.body.data.tempPassword });
    employeeToken = empLoginRes.body.data.accessToken;
  });

  it('rejects punch-in outside geofence', async () => {
    const res = await request(app)
      .post('/api/attendance/punch-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        workMode: 'office',
        location: { latitude: 34.0522, longitude: -118.2437 } // Far away (LA)
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/geofence/i);
  });

  it('allows punch-in inside geofence', async () => {
    const res = await request(app)
      .post('/api/attendance/punch-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        workMode: 'office',
        location: { latitude: 40.7128, longitude: -74.0060 } // Exactly at HQ
      });

    expect(res.status).toBe(201);
    expect(res.body.data.punchIn).toBeDefined();
    expect(res.body.data.punchIn.isInsideGeofence).toBe(true);
  });

  it('rejects double punch-in', async () => {
    const res = await request(app)
      .post('/api/attendance/punch-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        workMode: 'office',
        location: { latitude: 40.7128, longitude: -74.0060 }
      });

    expect(res.status).toBe(400);
  });

  it('allows punch-out', async () => {
    const res = await request(app)
      .post('/api/attendance/punch-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        location: { latitude: 40.7128, longitude: -74.0060 }
      });

    expect(res.status).toBe(200);
    expect(res.body.data.punchOut).toBeDefined();
  });
});
