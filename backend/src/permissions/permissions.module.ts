import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './permission.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionsController } from './permissions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}