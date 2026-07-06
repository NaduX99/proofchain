import { writeFileSync } from 'fs';
import { join } from 'path';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';

import {
  createAuthenticatedE2eContext,
} from './helpers/e2e-app.helper';

describe('Evidence API', () => {
  let app: INestApplication;
  let server: Server;
  let accessToken: string;

  const evidenceId =
    process.env.E2E_EVIDENCE_ID;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/evidence/:evidenceId/files should return files list', async () => {
    if (!evidenceId) {
      return;
    }

    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const response =
      await request(server)
        .get(`/api/evidence/${evidenceId}/files`)
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('POST /api/evidence/:evidenceId/files should block dangerous file type', async () => {
    if (!evidenceId) {
      return;
    }

    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const filePath =
      join(__dirname, 'dangerous-test.js');

    writeFileSync(
      filePath,
      'console.log("dangerous file");',
    );

    const response =
      await request(server)
        .post(`/api/evidence/${evidenceId}/files`)
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .attach('file', filePath);

    expect(response.status).toBe(400);
    expect(
      JSON.stringify(response.body),
    ).toContain('File type is not allowed');
  });

  it('POST /api/evidence/:evidenceId/files should allow txt upload', async () => {
    if (!evidenceId) {
      return;
    }

    const context =
      await createAuthenticatedE2eContext();

    app = context.app;
    server = context.server;
    accessToken = context.accessToken;

    const filePath =
      join(__dirname, 'sample-evidence.txt');

    writeFileSync(
      filePath,
      `ProofChain e2e test evidence file ${Date.now()}`,
    );

    const response =
      await request(server)
        .post(`/api/evidence/${evidenceId}/files`)
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        )
        .attach('file', filePath);

    expect([201, 400, 409]).toContain(response.status);

    if (response.status === 201) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    }
  });
});