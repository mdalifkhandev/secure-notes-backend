import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { AppModule } from '../src/app.module';

const server = express();
let isReady = false;
let initPromise: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

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

  await app.init();
  isReady = true;
}

export default async function handler(req: any, res: any) {
  // Restore original request path when invoked through Vercel rewrites
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-vercel-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string);

  if (matchedPath) {
    req.url = matchedPath;
  } else if (req.url && req.url.startsWith('/api/index')) {
    req.url = req.url.replace(/^\/api\/index/, '') || '/';
  }

  try {
    if (!isReady) {
      if (!initPromise) {
        initPromise = bootstrap().catch((err) => {
          initPromise = null;
          isReady = false;
          throw err;
        });
      }
      await initPromise;
    }

    return new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      server(req, res);
    });
  } catch (error: any) {
    console.error('Vercel Serverless Function Error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Serverless Function Initialization Failed',
      error: error?.message || 'Internal Server Error',
      hint: !process.env.MONGODB_URI
        ? 'CRITICAL: MONGODB_URI is missing in Vercel Environment Variables. Go to Project Settings -> Environment Variables and add MONGODB_URI.'
        : 'Check your MongoDB Atlas Network Access (ensure 0.0.0.0/0 is whitelisted) and database user credentials.',
    });
  }
}
