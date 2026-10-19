import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../permissions/permissions.guard.js';
import { RequirePermissions } from '../permissions/require-permissions.decorator.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('role:create')
  create(@Body() createRoleDto: any) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Put(':id')
  @RequirePermissions('role:update')
  update(@Param('id') id: string, @Body() updateRoleDto: any) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  // Ma trận: lấy quyền đã tick của 1 role
  @Get(':id/permissions')
  @RequirePermissions('role:read')
  getPermissions(@Param('id') id: string) {
    return this.rolesService.getPermissions(+id);
  }

  // Ma trận: lưu quyền đã tick của 1 role. Body: { "permissions": ["user:read", ...] }
  @Put(':id/permissions')
  @RequirePermissions('role:update')
  updatePermissions(@Param('id') id: string, @Body() body: { permissions: string[] }) {
    return this.rolesService.updatePermissions(+id, body?.permissions);
  }
}