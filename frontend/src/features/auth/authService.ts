import axiosClient from '../../api/axiosClient'
import type { User } from './authSlice'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string // Thêm trường này để nhận refresh token từ backend khi login
  expiresIn: number
  user: User
}

export const authService = {
  login: (payload: LoginPayload) =>
    axiosClient.post<LoginResponse>('/auth/login', payload).then((res) => res.data),

  me: () => axiosClient.get<User>('/auth/me').then((res) => res.data),

  // Thêm hàm logout để gọi lên backend xóa refreshToken trong CSDL
  logout: () => axiosClient.post('/auth/logout').then((res) => res.data),
}