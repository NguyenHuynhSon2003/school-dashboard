import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from './permission.entity.js';
import { Role } from '../roles/entities/role.entity.js';

const RESOURCE_LABELS: Record<string, string> = {
  user: 'Người dùng',
  role: 'Vai trò',
  timetable: 'Thời khóa biểu',
};

export interface PermissionGroupDto {
  resource: string;
  label: string;
  permissions: { code: string; action: string; label: string }[];
}

// Quyền tối thiểu phải luôn còn ở ít nhất 1 role, tránh tự khóa hệ thống
const MANAGE_ROLE_PERMISSION = 'role:update';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.permRepo.find({ order: { module: 'ASC', id: 'ASC' } });
  }

  /** Dạng frontend dùng để vẽ ma trận: mỗi nhóm (user, role, timetable) là một hàng. */
  async findAllGrouped(): Promise<PermissionGroupDto[]> {
    const all = await this.permRepo.find({ order: { id: 'ASC' } });
    const groups = new Map<string, PermissionGroupDto>();
    for (const p of all) {
      if (!groups.has(p.module)) {
        groups.set(p.module, { resource: p.module, label: RESOURCE_LABELS[p.module] ?? p.module, permissions: [] });
      }
      groups.get(p.module)!.permissions.push({
        code: p.code,
        action: p.code.split(':')[1] ?? p.code, // 'user:read' -> 'read' (tiêu đề cột)
        label: p.description ?? p.code,
      });
    }
    return [...groups.values()];
  }

  async getCodesByRoleName(roleName?: string | null): Promise<string[]> {
    if (!roleName) return [];
    const role = await this.roleRepo.findOne({
      where: { name: roleName },
      relations: { permissions: true },
    });
    return role?.permissions?.map((p) => p.code) ?? [];
  }

  async getCodesByRoleId(roleId: number): Promise<string[]> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    return role?.permissions?.map((p) => p.code) ?? [];
  }

  async findRoleIdByName(name: string): Promise<number | undefined> {
    const role = await this.roleRepo.findOne({ where: { name } });
    return role?.id;
  }

  /** Ghi đè toàn bộ quyền của 1 role (khớp với nút "Lưu" của ma trận). */
  async setRolePermissions(roleId: number, codes: string[]): Promise<string[]> {
    if (!Array.isArray(codes)) {
      throw new BadRequestException('permissions phải là một mảng mã quyền');
    }
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

    const unique = [...new Set(codes)];
    const perms = unique.length ? await this.permRepo.find({ where: { code: In(unique) } }) : [];
    if (perms.length !== unique.length) {
      const unknown = unique.filter((c) => !perms.some((p) => p.code === c));
      throw new BadRequestException(`Quyền không tồn tại: ${unknown.join(', ')}`);
    }

    const hadManage = role.permissions.some((p) => p.code === MANAGE_ROLE_PERMISSION);
    if (hadManage && !unique.includes(MANAGE_ROLE_PERMISSION)) {
      const others = await this.roleRepo
        .createQueryBuilder('r')
        .innerJoin('r.permissions', 'p')
        .where('p.code = :code', { code: MANAGE_ROLE_PERMISSION })
        .andWhere('r.id != :id', { id: roleId })
        .getCount();
      if (others === 0) {
        throw new BadRequestException(
          `Phải còn ít nhất một role giữ quyền ${MANAGE_ROLE_PERMISSION} để không bị khóa hệ thống`,
        );
      }
    }

    role.permissions = perms;
    await this.roleRepo.save(role);
    return perms.map((p) => p.code);
  }

  /** Chặn leo thang đặc quyền: chỉ thao tác/gán được role có quyền nằm trong tập quyền của mình. */
  async assertCanAssignRole(currentPermissions: string[], roleId: number): Promise<void> {
    const targetCodes = await this.getCodesByRoleId(roleId);
    if (targetCodes.some((c) => !currentPermissions.includes(c))) {
      throw new ForbiddenException('Bạn không có quyền thao tác với tài khoản hoặc role có quyền cao hơn mình');
    }
  }
}