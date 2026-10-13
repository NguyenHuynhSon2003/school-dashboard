import { Controller, Get, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { TimetableService } from './timetable.service.js';

@Controller('timetable')
@UseGuards(JwtAuthGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('people')
  async getPeople(@Request() req: any) {
    const user = req.user;
    // Kiểm tra quyền timetable:read (ADMIN, STAFF)
    if (!['ADMIN', 'STAFF'].includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh sách này');
    }
    return this.timetableService.getPeopleList();
  }

  @Get()
  async getTimetable(@Query('userId') userId: string, @Query('weekStart') weekStart: string, @Request() req: any) {
    const user = req.user;
    let targetUserId = user.id;

    // Nếu là ADMIN hoặc STAFF: Bắt buộc phải truyền userId
    if (['ADMIN', 'STAFF'].includes(user.role)) {
      if (!userId) {
        throw new BadRequestException('Thiếu tham số userId');
      }
      targetUserId = Number(userId);
    } else {
      // Nếu là TEACHER hoặc STUDENT: Chỉ có quyền xem lịch của chính mình
      if (userId && Number(userId) !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem thời khóa biểu của người khác');
      }
    }

    return this.timetableService.getTimetableByUserId(targetUserId, weekStart);
  }
}