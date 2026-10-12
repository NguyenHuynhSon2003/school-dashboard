import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

  async create(createUserDto: CreateUserDto): Promise<any> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.userRepository.create({
      email: createUserDto.email,
      passwordHash: hashedPassword,
      fullName: createUserDto.fullName,
      phone: createUserDto.phone,
      roleId: createUserDto.roleId,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { passwordHash, ...result } = savedUser;
    return result;
  }

  // Hỗ trợ phân trang và tìm kiếm theo chuẩn mục 4.1 của v2
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
      ];
    }

    const [users, total] = await this.userRepository.findAndCount(queryOptions);

    const items = users.map(user => {
      const { passwordHash, ...result } = user;
      return result;
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
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { role: true } as any,
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<any> {
    await this.findOne(id);
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}