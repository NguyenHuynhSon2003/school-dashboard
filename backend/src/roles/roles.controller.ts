
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, HttpCode, Patch, Req } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../permissions/permissions.guard.js';
import { RequirePermissions } from '../permissions/require-permissions.decorator.js';


@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Body: { name, description, permissions: [...] }
  @Post()
  @RequirePermissions('role:create')
  create(@Body() dto: any) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

    // Danh sách role được phép gán, dùng cho form người dùng (Staff không có role:read)
  @Get('assignable')
  @RequirePermissions('user:read')
  findAssignable(@Req() req: any) {
    return this.rolesService.findAssignable(req.user?.permissions ?? []);
  }

  @Get(':id')
  @RequirePermissions('role:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  // Frontend gọi PATCH với { name, description, permissions }
  @Patch(':id')
  @RequirePermissions('role:update')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.rolesService.update(+id, dto);
  }

  @Delete(':id')
  // @HttpCode(204)
  @RequirePermissions('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  @Get(':id/permissions')
  @RequirePermissions('role:read')
  getPermissions(@Param('id') id: string) {
    return this.rolesService.getPermissions(+id);
  }

  // Chỉ đổi quyền, không đụng tên/mô tả. Body: { "permissions": [...] }
  @Put(':id/permissions')
  @RequirePermissions('role:update')
  updatePermissions(@Param('id') id: string, @Body() body: { permissions: string[] }) {
    return this.rolesService.updatePermissions(+id, body?.permissions);
  }
}