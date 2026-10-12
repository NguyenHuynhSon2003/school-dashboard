import axiosClient from '../../api/axiosClient'
import type { UserListParams, UserListResponse } from './userTypes'

export const userService = {
  list: (params: UserListParams) =>
    axiosClient.get<UserListResponse>('/users', { params }).then((res) => res.data),

  remove: (id: number) => axiosClient.delete(`/users/${id}`).then(() => undefined),
}