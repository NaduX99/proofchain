import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const swaggerConfig = new DocumentBuilder()
  .setTitle('ProofChain API')
  .setDescription('Digital Evidence Integrity and Chain-of-Custody Platform')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'access-token',
  )
  .build();
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Every backend route will begin with /api
  app.setGlobalPrefix('api');

  // Swagger setup
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Allows the Next.js frontend to call this backend
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Backend will run on port 4000
  await app.listen(4000);

  console.log('ProofChain API running at http://localhost:4000/api');
}

void bootstrap();
