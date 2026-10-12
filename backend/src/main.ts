import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Kích hoạt Validation toàn cục cho DTO
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}
bootstrap();
