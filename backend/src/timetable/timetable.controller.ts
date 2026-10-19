import { Controller, Get, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../permissions/permissions.guard.js';
import { RequirePermissions } from '../permissions/require-permissions.decorator.js';
import { TimetableService } from './timetable.service.js';

@Controller('timetable')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('people')
  @RequirePermissions('timetable:read')
  async getPeople() {
    return this.timetableService.getPeopleList();
  }

  @Get()
  async getTimetable(@Query('userId') userId: string, @Query('weekStart') weekStart: string, @Request() req: any) {
    const user = req.user;
    const permissions: string[] = user.permissions ?? [];
    let targetUserId = user.id;

    if (permissions.includes('timetable:read')) {
      // Có quyền xem của mọi người: bắt buộc truyền userId
      if (!userId) {
        throw new BadRequestException('Thiếu tham số userId');
      }
      targetUserId = Number(userId);
    } else if (permissions.includes('timetable:read_own')) {
      // Chỉ được xem lịch của chính mình
      if (userId && Number(userId) !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem thời khóa biểu của người khác');
      }
    } else {
      throw new ForbiddenException('Bạn không có quyền xem thời khóa biểu');
    }

    return this.timetableService.getTimetableByUserId(targetUserId, weekStart);
  }
}