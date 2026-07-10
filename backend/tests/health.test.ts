/// <reference types="jest" />
import request from 'supertest';
import { app } from '../src/app';

describe('Health Integration Tests', () => {
  it('returns health check status', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBeDefined();
    expect(res.body.data.redis).toBeDefined();
  });
});
