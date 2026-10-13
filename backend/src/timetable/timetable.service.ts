import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Lấy danh sách người có thể xem lịch (dành cho Admin/Staff chọn)
  async getPeopleList() {
    const users = await this.userRepository.find({
      relations: { role: true },
      where: [{ role: { name: 'TEACHER' } }, { role: { name: 'STUDENT' } }],
    });

    return users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      role: user.role?.name,
      className: user.role?.name === 'STUDENT' ? '10A1' : null, // Có thể thay bằng dữ liệu lớp thực tế nếu có
    }));
  }

  // Lấy thời khóa biểu theo targetUserId
  async getTimetableByUserId(targetUserId: number, weekStart?: string) {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: { role: true },
    });

    return {
      weekStart: weekStart || '2026-10-12',
      owner: {
        id: targetUser?.id,
        fullName: targetUser?.fullName,
        role: targetUser?.role?.name,
        className: targetUser?.role?.name === 'STUDENT' ? '10A1' : null,
      },
      items: [
        {
          id: 101,
          dayOfWeek: 1,
          period: 1,
          startTime: '07:30',
          endTime: '08:15',
          subject: 'Toán học',
          className: '10A1',
          teacherName: 'Nguyễn Văn Thầy',
          room: 'A101',
        },
      ], // Dữ liệu mẫu demo thời khóa biểu
    };
  }
}