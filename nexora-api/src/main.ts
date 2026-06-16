import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get('PORT', 3001);
  await app.listen(port);
}
bootstrap();
