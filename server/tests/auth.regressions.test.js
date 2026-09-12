const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

describe('Regression Suite — Core Auth & Application Features', () => {
  const regUser = {
    name: 'Regression Tester',
    email: 'regression.tester@test.com',
    password: 'SecurePassword123!',
    role: 'attendee',
  };

  let token = '';

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: regUser.email });
  });

  afterAll(async () => {
    await User.deleteMany({ email: regUser.email });
    await disconnectDB();
  });

  it('verifies /api/health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('successfully registers a new attendee', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(regUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(regUser.email);
    token = res.body.data.token;
  });

  it('successfully logs in with registered credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: regUser.email,
        password: regUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  it('authenticates protected route /api/auth/me with Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(regUser.email);
  });

  it('rejects unauthenticated request to /api/auth/me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('allows public event listing /api/events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows public category listing /api/categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
