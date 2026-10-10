import http from 'http';
import request from 'supertest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketIO, emitMatchProgress, emitBookingUpdate } from '../src/realtime/socket';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryNotificationStore, notificationService } from '../src/modules/notifications/notification.service';

describe('Real-Time Updates & Notifications (Milestone 8)', () => {
  const app = createApp();
  let server: http.Server;
  let port: number;
  let clientToken: string;
  let clientUserId: string;

  beforeAll((done) => {
    inMemoryAuthStore.clear();
    inMemoryNotificationStore.clear();

    server = http.createServer(app);
    initSocketIO(server);

    server.listen(0, async () => {
      const address = server.address() as any;
      port = address.port;

      // Register test client
      const res = await request(app).post('/api/auth/register').send({
        name: 'Realtime Tester',
        email: 'realtime@tester.com',
        password: 'Password123!',
        role: 'CLIENT'
      });
      clientToken = res.body.data.tokens.accessToken;
      clientUserId = res.body.data.user.id;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('Socket connection should succeed with valid JWT token', (done) => {
    const socket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: clientToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (err: any) => {
      done(err);
    });
  });

  it('Socket connection should be rejected without valid token', (done) => {
    const socket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: 'invalid-token-here' },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      socket.disconnect();
      done(new Error('Socket connected unexpectedly without valid credentials'));
    });

    socket.on('connect_error', (err: any) => {
      expect(err.message).toContain('Authentication error');
      socket.disconnect();
      done();
    });
  });

  it('Client socket should receive live match:progress events in per-user room', (done) => {
    const socket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: clientToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      emitMatchProgress({
        userId: clientUserId,
        queryId: 'q-101',
        step: 'ranking',
        progress: 75,
        message: 'Ranking candidates with ML model'
      });
    });

    socket.on('match:progress', (data: any) => {
      expect(data).toHaveProperty('step', 'ranking');
      expect(data).toHaveProperty('progress', 75);
      expect(data.queryId).toBe('q-101');
      socket.disconnect();
      done();
    });
  });

  it('Client socket should receive booking:update events', (done) => {
    const socket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: clientToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      emitBookingUpdate({
        clientId: clientUserId,
        expertId: 'exp-99',
        bookingId: 'book-777',
        status: 'CONFIRMED',
        scheduledAt: '2026-11-20T10:00:00Z',
        message: 'Your consultation has been confirmed by the expert'
      });
    });

    socket.on('booking:update', (data: any) => {
      expect(data).toHaveProperty('status', 'CONFIRMED');
      expect(data.bookingId).toBe('book-777');
      socket.disconnect();
      done();
    });
  });

  it('GET /api/notifications should return user notification history', async () => {
    notificationService.createNotification({
      userId: clientUserId,
      title: 'Consultation Confirmed',
      message: 'Your call with Dr. Alan Turing is set for tomorrow.',
      type: 'BOOKING_CONFIRMED'
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Consultation Confirmed');

    const notifId = res.body.data[0].id;
    const patchRes = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
  });
});
