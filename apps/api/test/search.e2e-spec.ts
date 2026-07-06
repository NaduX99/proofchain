import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';

import {
  createAuthenticatedE2eContext,
} from './helpers/e2e-app.helper';

describe('Search API', () => {
  let app: INestApplication;
  let server: Server;
  let accessToken: string;

  beforeEach(async () => {
    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/search/evidence should work', async () => {
    const response =
      await request(server)
        .get('/api/search/evidence?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
  });

  it('GET /api/search/investigations should work', async () => {
    const response =
      await request(server)
        .get('/api/search/investigations?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
  });

  it('GET /api/search/custody-events should work', async () => {
    const response =
      await request(server)
        .get('/api/search/custody-events?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
  });

  it('GET /api/search/transfer-requests should work', async () => {
    const response =
      await request(server)
        .get('/api/search/transfer-requests?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
  });

  it('GET /api/search/audit-logs should work for admin or return 403 for non-admin', async () => {
    const response =
      await request(server)
        .get('/api/search/audit-logs?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        );

    expect([200, 403]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    }
  });
});