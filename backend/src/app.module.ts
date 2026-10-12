import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from './roles/roles.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',      // Thay username của bạn nếu khác
      password: '123456', // Thay password MySQL của bạn
      database: 'mobifone_lap',
      autoLoadEntities: true,
      synchronize: false,    // Để false vì bạn đã tự tạo bảng roles và users bằng câu lệnh SQL
    }),
    RolesModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}