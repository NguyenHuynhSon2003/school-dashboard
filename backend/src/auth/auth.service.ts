import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { getPermissionsByRole } from './permissions.helper.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Sai email hoặc mật khẩu',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'Tài khoản của bạn đã bị khóa',
      });
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Sai email hoặc mật khẩu',
      });
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const roleName = user.role?.name;
    const permissions = getPermissionsByRole(roleName);

    const payload = { email: user.email, sub: user.id, role: roleName };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 900, // 15 phút theo đề xuất
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: roleName,
        permissions: permissions,
        isActive: user.isActive,
      },
    };
  }
}