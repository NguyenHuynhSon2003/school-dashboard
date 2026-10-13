import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from '../utils/tokenStorage'

const BASE_URL = '/api/v1'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // để trình duyệt gửi kèm cookie refresh token
})

// Client riêng, không có interceptor, chỉ dùng để gọi refresh (tránh lặp vô hạn)
const refreshClient = axios.create({ baseURL: BASE_URL, withCredentials: true })

// Nơi khởi động đăng ký hàm này để báo cho Redux khi phiên hết hẳn
let onAuthFailure: () => void = () => {}
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler
}

// Promise dùng chung: nhiều request cùng cần refresh thì chỉ gọi API một lần
let refreshPromise: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ accessToken: string; expiresIn: number }>('/auth/refresh')
      .then((res) => {
        tokenStorage.set(res.data.accessToken)
        return res.data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Tự gắn token vào mọi request nếu đang có token
axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// Gặp 401: refresh một lần rồi gọi lại request ban đầu
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) return Promise.reject(error)

    const original = error.config as RetriableConfig
    const url = original.url ?? ''
    // Đăng nhập sai (401) hoặc đăng xuất thì không refresh
    const skip = url.includes('/auth/login') || url.includes('/auth/logout')

    if (error.response?.status !== 401 || original._retry || skip) {
      return Promise.reject(error)
    }

    original._retry = true

    let newToken: string
    try {
      newToken = await refreshAccessToken()
    } catch {
      // Refresh thất bại: phiên đã hết hẳn. Chỉ báo một lần dù nhiều request cùng lỗi
      const hadToken = tokenStorage.get() !== null
      tokenStorage.clear()
      if (hadToken) onAuthFailure()
      return Promise.reject(error)
    }

    original.headers.set('Authorization', `Bearer ${newToken}`)
    return axiosClient(original)
  },
)

export default axiosClient