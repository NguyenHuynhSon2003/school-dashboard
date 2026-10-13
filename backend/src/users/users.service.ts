import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: any): Promise<any> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    // Kiểm tra quyền: Staff không được tạo user có role ADMIN (roleId 1)
    if (currentUser && currentUser.role === 'STAFF' && Number(createUserDto.roleId) === 1) {
      throw new ForbiddenException('Staff không có quyền tạo tài khoản ADMIN');
    }

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

  // Hỗ trợ phân trang và tìm kiếm theo tên, email hoặc số điện thoại (Contract v3)
  async findAllPaginated(page: number = 1, pageSize: number = 10, search?: string): Promise<any> {
    const skip = (page - 1) * pageSize;
    
    const queryOptions: any = {
      relations: { role: true },
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    };

    if (search) {
      queryOptions.where = [
        { email: Like(`%${search}%`) },
        { fullName: Like(`%${search}%`) },
        { phone: Like(`%${search}%`) },
      ];
    }

    const [users, total] = await this.userRepository.findAndCount(queryOptions);

    const items = users.map(user => {
      const { passwordHash, ...result } = user;
      return {
        ...result,
        role: user.role ? user.role.name : null, // Đảm bảo trả về chuỗi role name (ADMIN, STAFF...) nếu frontend cần
      };
    });

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: number): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: true } as any,
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với ID: ${id}`);
    }
    const { passwordHash, ...result } = user;
    return {
      ...result,
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

    // 1. Không tự đổi role hoặc tự khóa chính mình
    if (currentUser.id === id) {
      if (
        updateUserDto.isActive === false || 
        (updateUserDto.roleId && Number(updateUserDto.roleId) !== targetUser.roleId)
      ) {
        throw new ForbiddenException('Bạn không thể tự khóa hoặc tự đổi role của chính mình');
      }
    }

    // 2. Staff không được sửa user là ADMIN, hoặc gán role ADMIN
    if (currentUser.role === 'STAFF') {
      if (targetUser.role?.name === 'ADMIN' || (updateUserDto.roleId && Number(updateUserDto.roleId) === 1)) {
        throw new ForbiddenException('Staff không có quyền thao tác với tài khoản hoặc phân quyền ADMIN');
      }
    }

    // Cập nhật các trường được truyền lên
    if (updateUserDto.fullName !== undefined) targetUser.fullName = updateUserDto.fullName;
    if (updateUserDto.phone !== undefined) targetUser.phone = updateUserDto.phone;
    if (updateUserDto.roleId !== undefined) targetUser.roleId = Number(updateUserDto.roleId);
    if (updateUserDto.isActive !== undefined) targetUser.isActive = updateUserDto.isActive;
    if (updateUserDto.avatarUrl !== undefined) targetUser.avatarUrl = updateUserDto.avatarUrl;

    await this.userRepository.save(targetUser);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: any): Promise<void> {
    // Không cho phép tự xóa chính mình
    if (currentUser.id === id) {
      throw new ForbiddenException('Bạn không thể xóa chính mình');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với ID: ${id}`);
    }
    await this.userRepository.remove(user);
  }

  // Trong users.service.ts
async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
  // Nếu bạn dùng TypeORM:
  await this.userRepository.update(userId, { refreshToken });
}
}