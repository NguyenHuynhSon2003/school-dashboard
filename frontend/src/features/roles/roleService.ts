import axiosClient from '../../api/axiosClient'

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

export const roleService = {
  list: () => axiosClient.get<RoleItem[]>('/roles').then((res) => res.data),
  permissions: () =>
    axiosClient.get<PermissionGroup[]>('/permissions').then((res) => res.data),
  create: (payload: RolePayload) =>
    axiosClient.post<RoleItem>('/roles', payload).then((res) => res.data),
  update: (id: number, payload: RolePayload) =>
    axiosClient.patch<RoleItem>(`/roles/${id}`, payload).then((res) => res.data),
  remove: (id: number) =>
    axiosClient.delete(`/roles/${id}`).then(() => undefined),
}