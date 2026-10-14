import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { getPermissionsByRole } from '../auth/permissions.helper.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

 async create(createRoleDto: any): Promise<Role> {
    const role = this.roleRepository.create(createRoleDto);
    const savedRole = await this.roleRepository.save(role);
    return Array.isArray(savedRole) ? savedRole[0] : savedRole;
  }

 async findAll(): Promise<any[]> {
   const roles = await this.roleRepository.find({
      relations: {
        users: true,
      } as any,
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: getPermissionsByRole(role.name),
      userCount: role.users ? role.users.length : 0,
    }));
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async update(id: number, updateRoleDto: any): Promise<Role> {
    await this.roleRepository.update(id, updateRoleDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
  }
}