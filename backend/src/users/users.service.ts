import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: any): Promise<any> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    // Không được tạo user có role nhiều quyền hơn mình (thay cho check STAFF/roleId cứng)
    await this.permissionsService.assertCanAssignRole(currentUser?.permissions ?? [], Number(createUserDto.roleId));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Khởi tạo đối tượng User mới khớp hoàn toàn với Entity
    const newUser = new User();
    newUser.email = createUserDto.email;
    newUser.passwordHash = hashedPassword;
    newUser.fullName = createUserDto.fullName;
    newUser.phone = createUserDto.phone ?? '';
    newUser.roleId = Number(createUserDto.roleId);
    newUser.isActive = createUserDto.isActive ?? true;
    newUser.avatarUrl = createUserDto.avatarUrl ?? null;

    const savedUser = await this.userRepository.save(newUser);
    
    // Trả về thông tin user vừa tạo kèm relation role
    return this.findOne(savedUser.id);
  }

  // Hỗ trợ phân trang và tìm kiếm theo tên, email hoặc số điện thoại
  async findAllPaginated(
    page: number = 1, 
    pageSize: number = 10, 
    search?: string, 
    role?: string, 
    isActive?: boolean
  ): Promise<any> {
    const skip = (page - 1) * pageSize;
    
    // Xây dựng điều kiện query động
    const whereConditions: any = {};

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    if (role) {
      // Lọc theo tên role trong bảng quan hệ roles
      whereConditions.role = { name: role };
    }

    let whereClause: any = whereConditions;

    if (search) {
      // Kết hợp điều kiện lọc với tìm kiếm từ khóa (email, fullName, phone)
      whereClause = [
        { ...whereConditions, email: Like(`%${search}%`) },
        { ...whereConditions, fullName: Like(`%${search}%`) },
        { ...whereConditions, phone: Like(`%${search}%`) },
      ];
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereClause,
      relations: { role: true },
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });

    const items = users.map(user => {
      const { passwordHash, refreshToken, ...result } = user;
      return {
        ...result,
        role: user.role ? user.role.name : null,
      };
    });

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  // includeSecrets = true chỉ dùng nội bộ (AuthService so sánh refresh token), không bao giờ trả ra API
  async findOne(id: number, includeSecrets = false): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: true } as any,
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với ID: ${id}`);
    }
    const { passwordHash, refreshToken, ...result } = user;
    return {
      ...result,
      ...(includeSecrets ? { refreshToken } : {}),
      role: user.role ? user.role.name : null,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { role: true } as any,
    });
  }

 async update(id: number, updateUserDto: UpdateUserDto, currentUser: any): Promise<any> {
    const targetUser = await this.userRepository.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`Không tìm thấy user với ID: ${id}`);
    }

    // Xác định roleId mới (ưu tiên roleId gửi lên, hoặc quy đổi từ role chuỗi)
    let newRoleId = updateUserDto.roleId ? Number(updateUserDto.roleId) : undefined;
    if (!newRoleId && updateUserDto.role) {
      newRoleId = await this.permissionsService.findRoleIdByName(updateUserDto.role);
    }

    // 1. Không tự đổi role hoặc tự khóa chính mình
    if (currentUser && currentUser.id === id) {
      if (
        updateUserDto.isActive === false || 
        (newRoleId !== undefined && newRoleId !== targetUser.roleId)
      ) {
        throw new ForbiddenException('Bạn không thể tự khóa hoặc tự đổi role của chính mình');
      }
    }

    // 2. Không được sửa user hoặc gán role có quyền cao hơn mình
    const myPermissions: string[] = currentUser?.permissions ?? [];
    await this.permissionsService.assertCanAssignRole(myPermissions, targetUser.roleId);
    if (newRoleId !== undefined && newRoleId !== targetUser.roleId) {
      await this.permissionsService.assertCanAssignRole(myPermissions, newRoleId);
    }

    // Cập nhật các trường thông tin nếu có truyền lên
    if (updateUserDto.fullName !== undefined) targetUser.fullName = updateUserDto.fullName;
    if (updateUserDto.phone !== undefined) targetUser.phone = updateUserDto.phone;
    if (updateUserDto.isActive !== undefined) targetUser.isActive = updateUserDto.isActive;
    if (updateUserDto.avatarUrl !== undefined) targetUser.avatarUrl = updateUserDto.avatarUrl;
    
    if (newRoleId !== undefined) {
      targetUser.roleId = newRoleId;
      targetUser.role = { id: newRoleId } as any;
    }

    // Lưu vào CSDL
    await this.userRepository.save(targetUser);

    // Trả về dữ liệu đã được query lại kèm thông tin Role mới nhất
    return this.findOne(id);
  }

  async remove(id: number, currentUser: any): Promise<{ message: string }> {
    // Không cho phép tự xóa chính mình
    if (currentUser.id === id) {
      throw new ForbiddenException('Bạn không thể xóa chính mình');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với ID: ${id}`);
    }
    await this.permissionsService.assertCanAssignRole(currentUser?.permissions ?? [], user.roleId);
    await this.userRepository.remove(user);
    return { message: 'Đã xóa người dùng' };
  }

  // Số liệu cho Dashboard (1 request thay vì 4). Quyền kiểm tra ở controller: user:read
  async getStats() {
    const [total, students, teachers, locked] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: { name: 'STUDENT' } } }),
      this.userRepository.count({ where: { role: { name: 'TEACHER' } } }),
      this.userRepository.count({ where: { isActive: false } }),
    ]);
    return { total, students, teachers, locked };
  }

  // Nơi lưu Refresh Token vào Database
async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {

  await this.userRepository.update(userId, { refreshToken });
}
}