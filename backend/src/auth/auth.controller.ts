import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from '../users/dto/login.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';
import { getPermissionsByRole } from './permissions.helper.js';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user lấy từ JwtStrategy sau khi giải mã token
    const userId = req.user.userId || req.user.sub;
    const user = await this.usersService.findOne(userId);
    const roleName = user.role?.name;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: roleName,
      permissions: getPermissionsByRole(roleName),
      isActive: user.isActive,
    };
  }
}