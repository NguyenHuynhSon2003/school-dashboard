import axiosClient from '../../api/axiosClient'
import type { MessageResponse } from '../../api/types'

export interface RoleItem {
  id: number
  name: string
  description: string
  permissions: string[] // danh sách mã quyền, ví dụ 'user:read'
  userCount: number
}

// Danh mục quyền, dùng để vẽ ma trận: mỗi nhóm là một hàng, mỗi quyền là một ô tích
export interface PermissionItem {
  code: string // 'user:read'
  action: string // 'read' (làm tiêu đề cột)
  label: string
}

export interface PermissionGroup {
  resource: string // 'user'
  label: string // 'Người dùng'
  permissions: PermissionItem[]
}

// Dữ liệu gửi lên khi tạo hoặc sửa vai trò
export interface RolePayload {
  name: string
  description: string
  permissions: string[]
}


export type RoleOption = Pick<RoleItem, 'id' | 'name'>


const FALLBACK_PERMISSIONS: PermissionGroup[] = [
  {
    resource: 'user',
    label: 'Người dùng',
    permissions: [
      { code: 'user:read', action: 'read', label: 'Xem danh sách người dùng' },
      { code: 'user:create', action: 'create', label: 'Thêm người dùng' },
      { code: 'user:update', action: 'update', label: 'Sửa người dùng' },
      { code: 'user:delete', action: 'delete', label: 'Xóa người dùng' },
    ],
  },
  {
    resource: 'role',
    label: 'Vai trò & Phân quyền',
    permissions: [
      { code: 'role:read', action: 'read', label: 'Xem vai trò và ma trận quyền' },
      { code: 'role:create', action: 'create', label: 'Thêm vai trò' },
      { code: 'role:update', action: 'update', label: 'Sửa vai trò và phân quyền' },
      { code: 'role:delete', action: 'delete', label: 'Xóa vai trò' },
    ],
  },
  {
    resource: 'timetable',
    label: 'Thời khóa biểu',
    permissions: [
      { code: 'timetable:read', action: 'read', label: 'Xem thời khóa biểu của mọi người' },
      { code: 'timetable:read_own', action: 'read_own', label: 'Chỉ xem thời khóa biểu của mình' },
      { code: 'timetable:manage', action: 'manage', label: 'Quản lý thời khóa biểu' },
    ],
  },
]

export const roleService = {
  list: () => axiosClient.get<RoleItem[]>('/roles').then((res) => res.data),
  permissions: () =>
    axiosClient.get<PermissionGroup[]>('/permissions').then((res) => res.data).catch(() => FALLBACK_PERMISSIONS),
  create: (payload: RolePayload) =>
    axiosClient.post<RoleItem>('/roles', payload).then((res) => res.data),
  update: (id: number, payload: RolePayload) =>
    axiosClient.patch<RoleItem>(`/roles/${id}`, payload).then((res) => res.data),
  remove: (id: number) =>
    axiosClient.delete<MessageResponse>(`/roles/${id}`).then((res) => res.data),

  assignable: () => axiosClient.get<RoleOption[]>('/roles/assignable').then((res) => res.data),

}