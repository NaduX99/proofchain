import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface E2eTestContext {
  app: INestApplication;
  server: Server;
  accessToken: string;
}

export async function createE2eApp(): Promise<INestApplication> {
  const moduleFixture =
    await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

  const app =
    moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
}

export async function loginAndGetToken(
  server: Server,
): Promise<string> {
  const organizationSlug =
    process.env.E2E_ORGANIZATION_SLUG ??
    'proofchain-security-lab';

  const email =
    process.env.E2E_EMAIL ??
    'nadul@example.com';

  const password =
    process.env.E2E_PASSWORD ??
    'Password123';

  const response =
    await request(server)
      .post('/api/auth/login')
      .send({
        organizationSlug,
        email,
        password,
      });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Login failed in e2e test. Status: ${response.status}. Body: ${JSON.stringify(
        response.body,
      )}`,
    );
  }

  const body =
    response.body as LoginResponse;

  return body.data.accessToken;
}

export async function createAuthenticatedE2eContext(): Promise<E2eTestContext> {
  const app =
    await createE2eApp();

  const server =
    app.getHttpServer() as Server;

  const accessToken =
    await loginAndGetToken(server);

  return {
    app,
    server,
    accessToken,
  };
}