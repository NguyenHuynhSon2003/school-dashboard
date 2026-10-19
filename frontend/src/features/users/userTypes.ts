import type { Role } from '../auth/authSlice'

export interface UserRecord {
  id: number
  email: string
  fullName: string
  phone: string | null
  role: Role
  isActive: boolean
  createdAt: string
  avatarUrl: string | null
}

export interface UserListParams {
  page: number
  pageSize: number
  search?: string
  role?: Role
  isActive?: boolean
}

export interface UserListResponse {
  items: UserRecord[]
  page: number
  pageSize: number
  total: number
}

export interface UserFormValues {
  fullName: string
  email: string
  phone?: string
  role: Role
  password?: string
  isActive: boolean
}