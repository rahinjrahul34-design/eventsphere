const request = require('supertest');
const app = require('../src/app');

describe('Google auth', () => {
  it('returns a validation error when Google sign-in credential is missing', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
