import {
  Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, Request, ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PermissionsGuard } from '../permissions/permissions.guard.js';
import { RequirePermissions } from '../permissions/require-permissions.decorator.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user:create')
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user);
  }

  @Get()
  @RequirePermissions('user:read')
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    // Chuyển đổi 'active'/'locked' hoặc 'true'/'false' từ query string sang kiểu boolean (nếu có)
    let activeBoolean: boolean | undefined = undefined;
    if (isActive !== undefined) {
      activeBoolean = isActive === 'true' || isActive === 'active';
    }

    return this.usersService.findAllPaginated(
      Number(page),
      Number(pageSize),
      search,
      role,
      activeBoolean,
    );
  }

  // Số liệu cho Dashboard. PHẢI đặt trước @Get(':id'), nếu không 'stats' bị hiểu là id
  @Get('stats')
  @RequirePermissions('user:read')
  stats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    // Xem được hồ sơ của chính mình; xem người khác cần user:read
    const permissions: string[] = req.user.permissions ?? [];
    if (req.user.id !== +id && !permissions.includes('user:read')) {
      throw new ForbiddenException('Bạn không có quyền xem người dùng này');
    }
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.update(+id, updateUserDto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(+id, req.user);
  }
}