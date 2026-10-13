import axiosClient from '../../api/axiosClient'

export interface RoleItem {
  id: number
  name: string
  description: string
  permissions: string[]
  userCount: number
}

export const roleService = {
  list: () => axiosClient.get<RoleItem[]>('/roles').then((res) => res.data),
}