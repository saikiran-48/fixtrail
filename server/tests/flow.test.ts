import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { Ticket } from '../src/models/ticket.js';
import { TicketEvent } from '../src/models/ticketEvent.js';
import { User } from '../src/models/user.js';
import { Counter } from '../src/models/counter.js';

// The end-to-end story from the test build:
// resident raises a ticket -> staff takes it -> staff works it with updates ->
// staff resolves -> resident confirms with a rating and review.

const app = createApp();

const resident = { name: 'Kiran', email: 'kiran@example.com', role: 'resident' as const };
const rohit = { name: 'Rohit', email: 'rohit@example.com', role: 'staff' as const };
const otherResident = { name: 'Priya', email: 'priya@example.com', role: 'resident' as const };
const otherStaff = { name: 'Arjun', email: 'arjun@example.com', role: 'staff' as const };

const plumbingTicket = {
  category: 'plumbing',
  priority: 'urgent',
  description: 'Kitchen tap leaking under the sink, water on the floor',
  location: { type: 'flat', label: 'Block A, Flat 304' },
};

let memoryServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    await connectDb(uri);
  } else {
    memoryServer = await MongoMemoryServer.create();
    await connectDb(memoryServer.getUri());
  }
}, 120_000);

afterAll(async () => {
  await disconnectDb();
  await memoryServer?.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Ticket.deleteMany({}),
    TicketEvent.deleteMany({}),
    Counter.deleteMany({}),
  ]);
});

// Each user gets their own agent, so cookies never mix between sessions.
async function login(user: typeof resident) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(user);
  expect(res.status).toBe(200);
  return agent;
}

describe('login by email and role', () => {
  it('creates an account on first login and returns the user', async () => {
    const res = await request(app).post('/api/auth/login').send(resident);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Kiran', email: 'kiran@example.com', role: 'resident' });
    expect(res.headers['set-cookie'][0]).toMatch(/ft_session=.*HttpOnly/);
  });

  it('refuses a role that does not match the email', async () => {
    await login(resident);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...resident, role: 'staff' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROLE_MISMATCH');
  });

  it('returns the current user from /me and rejects anonymous calls', async () => {
    const agent = await login(resident);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user.role).toBe('resident');

    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });
});

describe('the full ticket journey', () => {
  it('resident raises a plumbing ticket and staff take it through to a rated close', async () => {
    const kiran = await login(resident);
    const staff = await login(rohit);

    // 1. Resident raises the ticket.
    const created = await kiran.post('/api/tickets').send(plumbingTicket);
    expect(created.status).toBe(201);
    const ticket = created.body.ticket;
    expect(ticket).toMatchObject({ ref: 'FT-0001', status: 'open', category: 'plumbing' });
    expect(ticket.slaDueAt).toBeNull(); // the timer starts when staff take it

    // 2. Staff see it in the queue.
    const queue = await staff.get('/api/tickets');
    expect(queue.body.tickets.map((t: { id: string }) => t.id)).toContain(ticket.id);

    // 3. Staff take it: status moves to assigned and the SLA timer starts.
    const assigned = await staff.post(`/api/tickets/${ticket.id}/assign`);
    expect(assigned.status).toBe(200);
    expect(assigned.body.ticket).toMatchObject({
      status: 'assigned',
      assignee: { name: 'Rohit' },
      slaHours: 4, // plumbing + urgent
    });
    expect(assigned.body.ticket.slaDueAt).not.toBeNull();

    // 4. Another staff member cannot take the same ticket.
    const otherAgent = await login(otherStaff);
    const taken = await otherAgent.post(`/api/tickets/${ticket.id}/assign`);
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('ALREADY_ASSIGNED');

    // 5. Staff start work, add tracker milestones, then resolve.
    const started = await staff.post(`/api/tickets/${ticket.id}/status`).send({ status: 'in_progress' });
    expect(started.body.ticket.status).toBe('in_progress');

    const milestone = await staff
      .post(`/api/tickets/${ticket.id}/updates`)
      .send({ message: 'Replacement washer ordered' });
    expect(milestone.status).toBe(200);

    const resolved = await staff
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'resolved', note: 'Washer replaced, tap tested' });
    expect(resolved.body.ticket.status).toBe('resolved');

    // 6. Resident comes back later and sees the tracker and the timeline.
    const kiranLater = await login(resident);
    const detail = await kiranLater.get(`/api/tickets/${ticket.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.ticket.status).toBe('resolved');
    const notes = detail.body.ticket.timeline.map((e: { type: string; note: string | null }) => [e.type, e.note]);
    expect(notes).toContainEqual(['note', 'Replacement washer ordered']);
    expect(notes).toContainEqual(['status', 'Washer replaced, tap tested']);

    // 7. Resident confirms with a rating and a review. The ticket closes.
    const confirmed = await kiranLater
      .post(`/api/tickets/${ticket.id}/confirm`)
      .send({ rating: 5, review: 'Fixed the same day. Very polite.' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.ticket).toMatchObject({
      status: 'closed',
      rating: 5,
      review: 'Fixed the same day. Very polite.',
    });

    // 8. A closed ticket cannot be confirmed twice.
    const again = await kiranLater.post(`/api/tickets/${ticket.id}/confirm`).send({ rating: 1 });
    expect(again.status).toBe(409);
  });

  it('lets the resident reopen a resolved ticket, which goes back to the assignee', async () => {
    const kiran = await login(resident);
    const staff = await login(rohit);
    const { body } = await kiran.post('/api/tickets').send(plumbingTicket);
    const id = body.ticket.id;

    await staff.post(`/api/tickets/${id}/assign`);
    await staff.post(`/api/tickets/${id}/status`).send({ status: 'in_progress' });
    await staff.post(`/api/tickets/${id}/status`).send({ status: 'resolved' });

    const reopened = await kiran.post(`/api/tickets/${id}/reopen`).send({ reason: 'Still dripping at night' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.ticket).toMatchObject({ status: 'assigned', reopenCount: 1 });
  });

  it('keeps residents, and other staff, away from tickets that are not theirs', async () => {
    const kiran = await login(resident);
    const priya = await login(otherResident);
    const rohitAgent = await login(rohit);
    const arjun = await login(otherStaff);

    const { body } = await kiran.post('/api/tickets').send(plumbingTicket);
    const id = body.ticket.id;

    // Another resident cannot see it, and the response does not confirm it exists.
    const priyaView = await priya.get(`/api/tickets/${id}`);
    expect(priyaView.status).toBe(404);

    // Another resident's list is empty.
    const priyaList = await priya.get('/api/tickets');
    expect(priyaList.body.tickets).toHaveLength(0);

    // Once Rohit takes it, Arjun cannot see it in the queue or open it.
    await rohitAgent.post(`/api/tickets/${id}/assign`);
    const arjunList = await arjun.get('/api/tickets');
    expect(arjunList.body.tickets).toHaveLength(0);
    const arjunView = await arjun.get(`/api/tickets/${id}`);
    expect(arjunView.status).toBe(404);
  });

  it('blocks staff from confirming a ticket on the resident\'s behalf', async () => {
    const kiran = await login(resident);
    const staff = await login(rohit);
    const { body } = await kiran.post('/api/tickets').send(plumbingTicket);
    const id = body.ticket.id;

    await staff.post(`/api/tickets/${id}/assign`);
    await staff.post(`/api/tickets/${id}/status`).send({ status: 'in_progress' });
    await staff.post(`/api/tickets/${id}/status`).send({ status: 'resolved' });

    const res = await staff.post(`/api/tickets/${id}/confirm`).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects skipping a step on the tracker', async () => {
    const kiran = await login(resident);
    const staff = await login(rohit);
    const { body } = await kiran.post('/api/tickets').send(plumbingTicket);
    const id = body.ticket.id;

    await staff.post(`/api/tickets/${id}/assign`);
    // Resolving straight from assigned skips work in progress.
    const res = await staff.post(`/api/tickets/${id}/status`).send({ status: 'resolved' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('validates input and rejects unknown fields', async () => {
    const kiran = await login(resident);

    const extra = await kiran.post('/api/tickets').send({ ...plumbingTicket, status: 'closed' });
    expect(extra.status).toBe(400);

    const badRating = await login(resident);
    const { body } = await badRating.post('/api/tickets').send(plumbingTicket);
    const res = await badRating.post(`/api/tickets/${body.ticket.id}/confirm`).send({ rating: 9 });
    expect(res.status).toBe(400);
  });
});
