import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableController } from './timetable.controller.js';
import { TimetableService } from './timetable.service.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}