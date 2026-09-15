const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { runSeed } = require('../src/seeders/seed');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

/**
 * End-to-end smoke test for the demo accounts & core flows the README
 * documents: log in with every seeded role (password "Event@123"),
 * reject bad credentials, sign up a brand-new user and log them in, and
 * create an event as the demo organizer.
 */
const DEMO_PASSWORD = 'Event@123';

const DEMO_ACCOUNTS = [
  { email: 'admin@eventsphere.demo', role: 'admin' },
  { email: 'organizer@eventsphere.demo', role: 'organizer' },
  { email: 'attendee@eventsphere.demo', role: 'attendee' },
  { email: 'volunteer@eventsphere.demo', role: 'volunteer' },
  { email: 'speaker@eventsphere.demo', role: 'speaker' },
];

describe('Demo login, sign-in & event creation', () => {
  beforeAll(async () => {
    await connectDB();
    // Seed the full demo dataset so the demo accounts exist.
    await runSeed({ force: true, silent: true });
  }, 180000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('seeds the expected demo users', async () => {
    for (const { email } of DEMO_ACCOUNTS) {
      const user = await User.findOne({ email });
      expect(user).toBeDefined();
    }
  });

  it.each(DEMO_ACCOUNTS)('logs in $email as $role', async ({ email, role }) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe(role);
    // Password must never be returned to the client.
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('repairs stale demo credentials when the database already contains users', async () => {
    const attendee = await User.findOne({ email: 'attendee@eventsphere.demo' }).select('+password');
    attendee.password = 'stale-demo-password';
    await attendee.save();

    await runSeed({ force: false, silent: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'attendee@eventsphere.demo', password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('attendee@eventsphere.demo');
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'attendee@eventsphere.demo', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@eventsphere.demo', password: DEMO_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('registers a brand-new user and can immediately log in', async () => {
    const email = `new.user.${Date.now()}@test.com`;

    const signup = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New Signup', email, password: 'Password123!' });

    expect(signup.status).toBe(201);
    expect(signup.body.success).toBe(true);
    expect(signup.body.data.token).toBeDefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' });

    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email);

    await User.deleteMany({ email });
  });

  it('authenticates /api/auth/me with a demo token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@eventsphere.demo', password: DEMO_PASSWORD });
    const token = login.body.data.token;

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('organizer@eventsphere.demo');
    expect(me.body.data.role).toBe('organizer');
  });

  it('lets the demo organizer create a published event', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@eventsphere.demo', password: DEMO_PASSWORD });
    const token = login.body.data.token;

    const title = `Demo Smoke Event ${Date.now()}`;
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title,
        shortDescription: 'Created by the demo login smoke test.',
        description: 'Verifies the demo organizer can create an event end-to-end.',
        eventType: 'online',
        startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 6).toISOString(),
        capacity: 50,
        price: 0,
        ticketTypes: [
          { name: 'General', price: 0, quantity: 50, description: 'Free entry' },
        ],
        status: 'published',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(title);
    expect(res.body.data.approvalStatus).toBe('approved');
    expect(res.body.data.status).toBe('published');

    await Event.deleteMany({ title });
  });
});
