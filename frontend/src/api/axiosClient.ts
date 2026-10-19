import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from '../utils/tokenStorage'
import { refreshTokenStorage } from '../utils/refreshTokenStorage'
import type { User } from '../features/auth/authSlice'

const BASE_URL = '/api/v1'

const axiosClient = axios.create({// liên kết URL gốc với các tên miền khác nhau
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

// Kết quả của /auth/refresh. Backend mới trả kèm user, backend cũ thì không có
export interface RefreshResult {
  accessToken: string
  expiresIn?: number
  user?: User
}

// Promise dùng chung: nhiều request cùng cần refresh thì chỉ gọi API một lần
let refreshPromise: Promise<RefreshResult> | null = null

// lấy accessToken mới từ refreshToken
export function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResult>('/auth/refresh', {
        refreshToken: refreshTokenStorage.get(),
      })
      .then((res) => {
        tokenStorage.set(res.data.accessToken)
        return res.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Tự gắn token vào mọi request nếu đang có token
axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.get() // lấy token hiện tại
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

    // Nếu không phải lỗi 401, hoặc request thuộc diện bỏ qua, thì trả về lỗi luôn
    if (error.response?.status !== 401 || original._retry || skip) {
      return Promise.reject(error)
    }

    original._retry = true

    let newToken: string
    try {
      newToken = (await refreshAccessToken()).accessToken
    } catch (refreshError) {
      // KIỂM TRA LỖI TẠI ĐÂY:
      // Nếu lỗi refresh là do Server chết (502, 503, 504) hoặc mất kết nối mạng, 
      // ta KHÔNG ĐƯỢC xóa token và KHÔNG đá văng người dùng ra trang Login.
      if (axios.isAxiosError(refreshError)) {
        const status = refreshError.response?.status
        const isServerDown = status && status >= 500 && status < 600
        const isNetworkError = !refreshError.response

        if (isServerDown || isNetworkError) {
          // Trả về lỗi server để UI hiển thị thông báo tạm thời, giữ nguyên phiên đăng nhập
          return Promise.reject(refreshError)
        }
      }

      // Trường hợp Refresh Token thực sự hết hạn / bị từ chối (ví dụ 401/403 từ server auth),
      // lúc này mới chính thức coi như phiên đã hết hẳn và đá về trang login.
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