import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';

import {
  createAuthenticatedE2eContext,
  createE2eApp,
  loginAndGetToken,
} from './helpers/e2e-app.helper';

describe('ProofChain Core API', () => {
  let app: INestApplication;
  let server: Server;
  let accessToken: string;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health should return health status', async () => {
    app = await createE2eApp();
    server = app.getHttpServer() as Server;

    const response =
      await request(server)
        .get('/api/health')
        .expect(200);

    expect(response.body).toBeDefined();
  });

  it('POST /api/auth/login should return access token', async () => {
    app = await createE2eApp();
    server = app.getHttpServer() as Server;

    const token =
      await loginAndGetToken(server);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('GET /api/dashboard/summary should reject request without token', async () => {
    app = await createE2eApp();
    server = app.getHttpServer() as Server;

    await request(server)
      .get('/api/dashboard/summary')
      .expect(401);
  });

  it('GET /api/dashboard/summary should return dashboard data with token', async () => {
    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const response =
      await request(server)
        .get('/api/dashboard/summary')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.investigations).toBeDefined();
    expect(response.body.data.evidence).toBeDefined();
  });

  it('GET /api/reports/summary should return report counts', async () => {
    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const response =
      await request(server)
        .get('/api/reports/summary')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(
      typeof response.body.data.totalEvidence,
    ).toBe('number');
  });

  it('GET /api/search/evidence should return paginated result', async () => {
    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const response =
      await request(server)
        .get('/api/search/evidence?page=1&limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toBeDefined();
    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.page).toBe(1);
  });

  it('GET /api/audit-logs should return audit logs for admin or auditor', async () => {
    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const response =
      await request(server)
        .get('/api/audit-logs?limit=10')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        );

    expect([200, 403]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });
});