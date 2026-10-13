import axiosClient from '../../api/axiosClient'
import type { User } from './authSlice'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expiresIn: number
  user: User
}

export const authService = {
  login: (payload: LoginPayload) =>
    axiosClient.post<LoginResponse>('/auth/login', payload).then((res) => res.data),

  me: () => axiosClient.get<User>('/auth/me').then((res) => res.data),
}