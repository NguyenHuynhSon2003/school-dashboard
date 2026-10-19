import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
 
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: PermissionsService,
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
 
  // Dựng object user dùng chung cho login và refresh (quyền đọc từ DB)
  async buildUser(user: any) {
    const roleName: string = user.role?.name ?? user.role;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: roleName,
      permissions: await this.permissionsService.getCodesByRoleName(roleName),
      isActive: user.isActive,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl || null,
    };
  }

  async login(user: any) {
    const userInfo = await this.buildUser(user);
    const payload = { email: user.email, sub: user.id, role: userInfo.role };

    // Tạo Access Token (sống ngắn: 15 phút)
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'access-secret-key',
      expiresIn: '15m',
    });

    // Tạo Refresh Token (sống dài: 7 ngày)
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      expiresIn: '7d',
    });

    // Lưu Refresh Token vào Database
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 phút
      user: userInfo,
    };
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      // Giải mã và kiểm tra Refresh Token bằng khóa riêng biệt
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      // includeSecrets = true: cần refreshToken để so sánh
      const user = await this.usersService.findOne(payload.sub, true);
      if (!user || user.refreshToken !== oldRefreshToken) {
        throw new UnauthorizedException('Refresh Token không hợp lệ');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Tài khoản đã bị khóa');
      }

      // Tạo Access Token mới
      const newPayload = { email: user.email, sub: user.id, role: user.role?.name ?? user.role };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET || 'access-secret-key',
        expiresIn: '15m',
      });

      // Trả luôn user (kèm quyền mới nhất) để frontend khỏi gọi thêm /auth/me khi F5
      return { accessToken, expiresIn: 900, user: await this.buildUser(user) };
    } catch (err) {
      throw new UnauthorizedException('Refresh Token đã hết hạn hoặc không hợp lệ');
    }
  }

  async logout(userId: number) {
    // Xóa refresh token trong CSDL khi đăng xuất
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Đăng xuất thành công' };
  }
}