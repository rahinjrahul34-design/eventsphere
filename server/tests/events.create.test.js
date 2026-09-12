const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

describe('Event Creation Flow', () => {
  let organizerToken;
  const organizerEmail = `host_${Date.now()}@example.com`;

  beforeAll(async () => {
    await connectDB();

    // Register a new organizer
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Event Host Pro',
        email: organizerEmail,
        password: 'Password123!',
        role: 'organizer',
        organizationName: 'Global Summit Events'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.organizerStatus).toBe('approved');
    organizerToken = res.body.data.token;
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({ email: organizerEmail });
    await Event.deleteMany({ title: { $in: ['Global Tech Expo 2026', 'Future AI Workshop Draft'] } });
    await disconnectDB();
  });

  it('should allow organizer to create a published event with ticket tiers and custom fields', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Global Tech Expo 2026',
        shortDescription: 'The biggest technology showcase of the year.',
        description: 'The biggest technology showcase of the year with over 100 keynotes, interactive demo booths, and networking zones.',
        category: '64b1f28b7e42d72111111111',
        eventType: 'in-person',
        venue: {
          name: 'Tech Center Hall A',
          address: '100 Innovation Way',
          city: 'San Francisco',
          country: 'United States',
          capacity: 1000
        },
        startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 9).toISOString(),
        ticketTypes: [
          { name: 'Standard Ticket', price: 50, quantity: 200, description: 'General entry' },
          { name: 'VIP Ticket', price: 150, quantity: 50, description: 'VIP lounge & front seats' },
          { name: '', price: 0, quantity: 0 } // empty tier to verify sanitization
        ],
        customRegistrationFields: [
          { label: 'T-Shirt Size', fieldType: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
          { label: '', fieldType: 'text' } // empty field to verify sanitization
        ],
        status: 'published'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('Global Tech Expo 2026');
    expect(res.body.data.ticketTypes.length).toBe(2);
    expect(res.body.data.customRegistrationFields.length).toBe(1);
    expect(res.body.data.customRegistrationFields[0].label).toBe('T-Shirt Size');
  });

  it('should allow organizer to save an event as draft', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Future AI Workshop Draft',
        description: 'An upcoming interactive workshop on frontier AI models and autonomous systems.',
        startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 11).toISOString(),
        status: 'draft',
        eventType: 'online'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
  });
});
