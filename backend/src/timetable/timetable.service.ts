import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private readonly mockLessons = [
    { id: 1, dayOfWeek: 1, period: 1, startTime: '07:30', endTime: '08:15', subject: 'Toán học', className: '10A1', teacherId: 3, teacherName: 'Lê Văn Cường', room: 'A101' },
    { id: 2, dayOfWeek: 1, period: 2, startTime: '08:20', endTime: '09:05', subject: 'Ngữ văn', className: '10A1', teacherId: 7, teacherName: 'Nguyễn Thị Lan', room: 'A101' },
    { id: 3, dayOfWeek: 2, period: 1, startTime: '07:30', endTime: '08:15', subject: 'Tiếng Anh', className: '10A2', teacherId: 8, teacherName: 'Trần Văn Nam', room: 'A102' },
  ];

  async getPeopleList() {
    const users = await this.userRepository.find({
      relations: { role: true },
    });

    const filteredUsers = users.filter((user) => {
      const roleName = user.role?.name;
      return roleName === 'TEACHER' || roleName === 'STUDENT';
    });

    return filteredUsers.map((user) => {
      const roleName = user.role?.name;
      return {
        id: user.id,
        fullName: user.fullName,
        role: roleName,
        className: roleName === 'STUDENT' ? (user.id % 2 === 0 ? '10A1' : '10A2') : null,
      };
    });
  }

  async getTimetableByUserId(targetUserId: number, weekStart?: string) {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const roleName = targetUser.role?.name;
    const userClassName = roleName === 'STUDENT' ? (targetUser.id % 2 === 0 ? '10A1' : '10A2') : null;

    const items = this.mockLessons.filter((lesson) => {
      if (roleName === 'TEACHER') {
        return lesson.teacherId === targetUser.id;
      }
      if (roleName === 'STUDENT') {
        return lesson.className === userClassName;
      }
      return true;
    });

    return {
      weekStart: weekStart || '2026-10-12',
      owner: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        role: roleName,
        className: userClassName,
      },
      items,
    };
  }
}