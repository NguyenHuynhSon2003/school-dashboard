import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from './roles/roles.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TimetableModule } from './timetable/timetable.module.js'; // 1. Import module timetable

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'mobifone_lap'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    RolesModule,
    UsersModule,
    AuthModule,
    TimetableModule, // 2. Thêm vào đây để nhận diện route /timetable
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}