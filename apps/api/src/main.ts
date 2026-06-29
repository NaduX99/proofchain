import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Every backend route will begin with /api
  app.setGlobalPrefix('api');

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