import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import helmet from 'helmet';
import {
  json,
  urlencoded,
} from 'express';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app =
    await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4000',
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
    credentials: true,
  });

  app.use(
    json({
      limit: '2mb',
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      limit: '2mb',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config =
    new DocumentBuilder()
      .setTitle('ProofChain API')
      .setDescription(
        'Digital evidence integrity and chain-of-custody API',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description:
            'Paste accessToken only',
          in: 'header',
        },
        'access-token',
      )
      .build();

  const document =
    SwaggerModule.createDocument(
      app,
      config,
    );

  SwaggerModule.setup(
    'api/docs',
    app,
    document,
  );

  const port =
    Number(process.env.PORT ?? 4000);

  await app.listen(port);

  console.log(
    `ProofChain API running on http://localhost:${port}/api`,
  );
  console.log(
    `Swagger docs running on http://localhost:${port}/api/docs`,
  );
}

void bootstrap();