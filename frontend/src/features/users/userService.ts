import axiosClient from '../../api/axiosClient'
import type {
  UserFormValues,
  UserListParams,
  UserListResponse,
  UserRecord,
} from './userTypes'

export const userService = {
  list: (params: UserListParams) =>
    axiosClient.get<UserListResponse>('/users', { params }).then((res) => res.data),

  create: (payload: UserFormValues) =>
    axiosClient.post<UserRecord>('/users', payload).then((res) => res.data),

  update: (id: number, payload: Partial<UserFormValues>) =>
    axiosClient.put<UserRecord>(`/users/${id}`, payload).then((res) => res.data),

  remove: (id: number) => axiosClient.delete(`/users/${id}`).then(() => undefined),
}