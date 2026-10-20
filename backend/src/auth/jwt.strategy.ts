import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PermissionsService } from '../permissions/permissions.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Phải trùng với secret trong AuthModule (cùng đọc JWT_SECRET từ .env)
      secretOrKey: config.get<string>('JWT_SECRET', 'YOUR_SECRET_KEY_CHANGE_THIS'),
    });
  }

  async validate(payload: any) {
    // Đọc quyền từ DB mỗi request nên sửa ma trận có hiệu lực ngay, không phải chờ token hết hạn
    const permissions = await this.permissionsService.getCodesByRoleName(payload.role);
    return {
      id: payload.sub, // UsersService so sánh currentUser.id nên cần trường này
      userId: payload.sub, // giữ lại vì AuthController đang đọc req.user.userId
      email: payload.email,
      role: payload.role,
      permissions,
    };
  }
}