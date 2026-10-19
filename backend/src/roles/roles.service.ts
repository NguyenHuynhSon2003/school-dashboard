import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { PermissionsService } from '../permissions/permissions.service.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  // Khi thêm role mới có thể chọn luôn quyền: { name, description, permissions: ["user:read", ...] }
  async create(createRoleDto: any): Promise<any> {
    const { permissions, ...roleData } = createRoleDto ?? {};
    const saved = await this.roleRepository.save(this.roleRepository.create(roleData as Partial<Role>));
    const role = Array.isArray(saved) ? saved[0] : saved;

    let granted: string[] = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      try {
        granted = await this.permissionsService.setRolePermissions(role.id, permissions);
      } catch (err) {
        // Mã quyền sai thì không để lại role "mồ côi"
        await this.roleRepository.delete(role.id);
        throw err;
      }
    }
    return { id: role.id, name: role.name, description: role.description, permissions: granted };
  }

  async findAll(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      relations: { users: true, permissions: true } as any,
      order: { id: 'ASC' },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: (role.permissions ?? []).map((p) => p.code),
      userCount: role.users ? role.users.length : 0,
    }));
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async update(id: number, updateRoleDto: any): Promise<Role> {
    // Chỉ cho sửa name/description; quyền sửa qua updatePermissions
    const { name, description } = updateRoleDto ?? {};
    await this.roleRepository.update(id, { name, description });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
  }

  async getPermissions(id: number): Promise<string[]> {
    await this.findOne(id);
    return this.permissionsService.getCodesByRoleId(id);
  }

  async updatePermissions(id: number, codes: string[]) {
    const permissions = await this.permissionsService.setRolePermissions(id, codes);
    return { id, permissions };
  }
}