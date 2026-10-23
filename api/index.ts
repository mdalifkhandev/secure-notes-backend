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
  try {
    if (!isReady) {
      if (!initPromise) {
        initPromise = bootstrap();
      }
      await initPromise;
    }
    return server(req, res);
  } catch (error: any) {
    console.error('Vercel Serverless Function Error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Serverless Function Initialization Failed',
      error: error?.message || 'Internal Server Error',
      hint: !process.env.MONGODB_URI
        ? 'CRITICAL: MONGODB_URI is missing in Vercel Environment Variables. Go to Project Settings -> Environment Variables and add MONGODB_URI.'
        : undefined,
    });
  }
}
