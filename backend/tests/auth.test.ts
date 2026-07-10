/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/employee/employee.model';

describe('Auth Integration Tests', () => {
  const testUser = {
    name: 'Test User',
    companyName: 'Test Co',
    email: 'test@example.com',
    password: 'StrongPass!2026',
  };

  it('registers a new company + admin user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('rejects duplicate company email', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'weak@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    await User.updateOne({ email: testUser.email }, { $set: { isEmailVerified: true } });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    await User.updateOne({ email: testUser.email }, { $set: { isEmailVerified: true } });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});
