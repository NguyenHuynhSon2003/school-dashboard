import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'YOUR_SECRET_KEY_CHANGE_THIS'),
        // Giây; 900 = 15 phút, khớp với expiresIn trả về trong login()
        signOptions: { expiresIn: Number(config.get('JWT_EXPIRES_IN', 900)) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}