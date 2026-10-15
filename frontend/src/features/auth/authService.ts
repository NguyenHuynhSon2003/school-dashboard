import axiosClient from '../../api/axiosClient'
import { refreshTokenStorage } from '../../utils/refreshTokenStorage'
import type { User } from './authSlice'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string // backend hiện trả trong body; khi đổi sang cookie thì không còn
  expiresIn: number
  user: User
}

export interface RefreshResponse {
  accessToken: string
  expiresIn?: number
}

export const authService = {
  login: (payload: LoginPayload) =>
    axiosClient.post<LoginResponse>('/auth/login', payload).then((res) => {
      if (res.data.refreshToken) refreshTokenStorage.set(res.data.refreshToken)
      return res.data
    }),
    
  me: () => axiosClient.get<User>('/auth/me').then((res) => res.data),

  refresh: () =>
    axiosClient.post<RefreshResponse>('/auth/refresh').then((res) => res.data),

  logout: () =>
    axiosClient
      .post<void>('/auth/logout')
      .then(() => undefined)
      .finally(() => refreshTokenStorage.clear()),
}