import type { Role } from '../features/auth/authSlice'


export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  TIMETABLE_READ: 'timetable:read',
  TIMETABLE_READ_OWN: 'timetable:read_own',
  TIMETABLE_MANAGE: 'timetable:manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'purple',
  STAFF: 'blue',
  TEACHER: 'green',
  STUDENT: 'orange',
}