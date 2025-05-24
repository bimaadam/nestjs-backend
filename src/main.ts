import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ini baru bener
  app.use(cookieParser());

  app.enableCors({
    origin: 'https://ajt-admin-dashboard.vercel.app',
    credentials: true,
  });

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
