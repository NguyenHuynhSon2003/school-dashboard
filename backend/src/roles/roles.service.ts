import {  BadRequestException, ConflictException, ForbiddenException,Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { PermissionsService } from '../permissions/permissions.service.js';


const NAME_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/;
const ADMIN_ROLE = 'ADMIN';
const ADMIN_REQUIRED = ['role:read', 'role:update'];

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  private toItem(role: Role) {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? '',
      permissions: (role.permissions ?? []).map((p) => p.code),
      userCount: role.users ? role.users.length : 0,
    };
  }

  private async findItem(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { users: true, permissions: true } as any,
    });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    return this.toItem(role);
  }

  private normalizeName(raw: unknown): string {
    const name = String(raw ?? '').trim().toUpperCase();
    if (!NAME_PATTERN.test(name)) {
      throw new BadRequestException('Tên vai trò gồm 2-30 ký tự: chữ, số hoặc dấu _ (bắt đầu bằng chữ)');
    }
    return name;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const existing = await this.roleRepository.findOne({ where: { name } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Tên vai trò đã tồn tại');
    }
  }

  // Thêm vai trò kèm quyền: { name, description, permissions: ["user:read", ...] }
  async create(dto: any) {
    const name = this.normalizeName(dto?.name);
    await this.assertNameFree(name);

    const saved = await this.roleRepository.save(
      this.roleRepository.create({ name, description: String(dto?.description ?? '').trim() }),
    );

    if (Array.isArray(dto?.permissions) && dto.permissions.length > 0) {
      try {
        await this.permissionsService.setRolePermissions(saved.id, dto.permissions);
      } catch (err) {
        // Mã quyền sai thì không để lại vai trò "mồ côi"
        await this.roleRepository.delete(saved.id);
        throw err;
      }
    }
    return this.findItem(saved.id);
  }

  async findAll(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      relations: { users: true, permissions: true } as any,
      order: { id: 'ASC' },
    });
    return roles.map((role) => this.toItem(role));
  }
  // Chỉ trả các role mà người gọi được phép gán (quyền của role ⊆ quyền của mình)
  async findAssignable(currentPermissions: string[]) {
    const roles = await this.roleRepository.find({
      relations: { permissions: true } as any,
      order: { id: 'ASC' },
    });
    return roles
      .filter((r) =>
        this.permissionsService.coversAll(currentPermissions, (r.permissions ?? []).map((p) => p.code)),
      )
      .map((r) => ({ id: r.id, name: r.name }));
  }  

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  // Sửa tên, mô tả và quyền trong một lần (PATCH /roles/:id)
  async update(id: number, dto: any) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');

    const isAdmin = role.name.toUpperCase() === ADMIN_ROLE;
    const newName = dto?.name === undefined ? role.name : this.normalizeName(dto.name);
    const permissions: string[] | undefined = Array.isArray(dto?.permissions) ? dto.permissions : undefined;

    if (isAdmin) {
      if (newName !== ADMIN_ROLE) {
        throw new ForbiddenException('Không thể đổi tên vai trò ADMIN');
      }
      if (permissions && !ADMIN_REQUIRED.every((c) => permissions.includes(c))) {
        throw new ForbiddenException('ADMIN phải luôn giữ quyền xem và sửa vai trò');
      }
    }
    if (newName !== role.name) await this.assertNameFree(newName, id);

    // Quyền trước (có thể bị từ chối), rồi mới đổi tên/mô tả để không bị cập nhật dở dang
    if (permissions) await this.permissionsService.setRolePermissions(id, permissions);

    const patch: Partial<Role> = { name: newName };
    if (dto?.description !== undefined) patch.description = String(dto.description).trim();
    await this.roleRepository.update(id, patch);

    return this.findItem(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({ where: { id }, relations: { users: true } as any });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    if (role.name.toUpperCase() === ADMIN_ROLE) {
      throw new ForbiddenException('Không thể xóa vai trò ADMIN');
    }
    const count = role.users?.length ?? 0;
    if (count > 0) {
      throw new ConflictException(`Vai trò đang có ${count} người dùng, hãy chuyển họ sang vai trò khác trước`);
    }
    await this.roleRepository.delete(id);
    return { message: 'Đã xóa vai trò' };
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