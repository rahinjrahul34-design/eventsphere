const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Ticket = require('../src/models/Ticket');

describe('Ticket routes', () => {
  let attendeeToken;
  let attendeeId;
  let ticket;

  beforeAll(async () => {
    await connectDB();

    const organizerRes = await request(app).post('/api/auth/register').send({
      name: 'Ticket Organizer',
      email: `ticket-organizer-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'organizer',
    });

    const attendeeRes = await request(app).post('/api/auth/register').send({
      name: 'Ticket Attendee',
      email: `ticket-attendee-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'attendee',
    });

    attendeeToken = attendeeRes.body.data.token;
    attendeeId = attendeeRes.body.data.user._id;

    const event = await Event.create({
      title: 'Ticket Route Event',
      slug: `ticket-route-event-${Date.now()}`,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      capacity: 100,
      organizer: organizerRes.body.data.user._id,
      status: 'published',
      visibility: 'public',
    });

    const registration = await Registration.create({
      event: event._id,
      user: attendeeId,
      ticketType: { name: 'General', price: 0 },
      status: 'confirmed',
      amountPaid: 0,
    });

    ticket = await Ticket.create({
      code: 'TKT-ROUTE-001',
      event: event._id,
      registration: registration._id,
      user: attendeeId,
      attendeeName: 'Ticket Attendee',
      status: 'valid',
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({ email: /ticket-(organizer|attendee)/i });
    await Event.deleteMany({ slug: /ticket-route-event/i });
    await Registration.deleteMany({ user: attendeeId });
    await Ticket.deleteMany({ code: 'TKT-ROUTE-001' });
    await disconnectDB();
  });

  it('should return a ticket by Mongo ObjectId for the detail page route', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(String(ticket._id));
    expect(res.body.data.code).toBe(ticket.code);
  });
});
