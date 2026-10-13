import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,  type Relation
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

 @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'role_id' })
  roleId: number;

 @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

@ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}