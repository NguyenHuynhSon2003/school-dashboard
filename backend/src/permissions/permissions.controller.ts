import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermissions } from './require-permissions.decorator.js';
import { PermissionsService } from './permissions.service.js';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Trả về các hàng của ma trận (id, code, description, module)
  @Get()
  @RequirePermissions('role:read')
  findAll() {
    return this.permissionsService.findAll();
  }
}