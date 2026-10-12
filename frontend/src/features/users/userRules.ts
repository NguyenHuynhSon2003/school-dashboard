import type { User } from '../auth/authSlice'
import type { UserRecord } from './userTypes'

// Staff (role thấp hơn Admin) không được động vào tài khoản Admin
export function canEditUser(actor: User, target: UserRecord) {
  return actor.role === 'ADMIN' || target.role !== 'ADMIN'
}

// Không được tự xóa chính mình
export function canDeleteUser(actor: User, target: UserRecord) {
  return actor.id !== target.id && canEditUser(actor, target)
}