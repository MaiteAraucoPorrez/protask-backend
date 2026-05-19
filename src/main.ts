  import { NestFactory } from '@nestjs/core';
  import { ValidationPipe } from '@nestjs/common';
  import { AppModule } from './app.module';
  import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

  //////////////////////////////////////////
  import * as express from 'express';
  import { join } from 'path';
  /////////////////////////////////////////

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix ->
    app.setGlobalPrefix('api');
    ///////////////////////////////////////////
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
    ///////////////////////////////////////////
    // Global validation pipe (DTOs)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,           // Strip unknown properties
        forbidNonWhitelisted: true, // Throw error on unknown properties
        transform: true,           // Auto-transform to DTO types
        transformOptions: {
          enableImplicitConversion: true, // Allow query param type coercion
        },
      }),
    );

    // Global exception filter (same pattern as C# GlobalExceptionFilter)
    app.useGlobalFilters(new GlobalExceptionFilter());

    // CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`ProTask API corriendo en http://localhost:${port}/api`);
  }
  bootstrap();
