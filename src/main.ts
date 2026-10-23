import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    if (process.env.VERCEL) {
      await app.init();
      cachedApp = app;
    } else {
      const port = process.env.PORT ?? 5000;
      await app.listen(port);
      console.log(`🚀 NestJS Backend server is running on: http://localhost:${port}`);
      console.log(`📡 Health Check Endpoint: http://localhost:${port}/health`);
      cachedApp = app;
    }
  }
  return cachedApp;
}

// Local / standalone server boot
if (!process.env.VERCEL) {
  void bootstrap();
}

// Vercel Serverless Function export handler
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const server = app.getHttpAdapter().getInstance();
  return server(req, res);
}
