import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
 
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
 
  // Kích hoạt Validation toàn cục cho DTO
  app.useGlobalPipes(new ValidationPipe());
 
  // Tiền tố chung cho mọi route, khớp với baseURL của frontend (/api/v1)
  app.setGlobalPrefix(config.get<string>('API_PREFIX') ?? 'api/v1');
 
  // Cho phép frontend (máy khác) gọi API
  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
 
  const port = Number(config.get('PORT') ?? 3000);
  // '0.0.0.0' để máy khác trong mạng nội bộ truy cập được, không chỉ localhost
  await app.listen(port, '0.0.0.0');
console.log(`Backend đang chạy tại http://localhost:${port}/${config.get('API_PREFIX') ?? 'api/v1'}`);
}
bootstrap();