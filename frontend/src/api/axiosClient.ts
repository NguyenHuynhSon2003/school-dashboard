import axios from 'axios'
import { tokenStorage } from '../utils/tokenStorage'

const axiosClient = axios.create({
  // Lấy từ file .env của frontend (VITE_API_URL), không có thì dùng localhost
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Tự gắn token vào mọi request nếu đang có token.
// Dùng tokenStorage để cùng một nơi lưu/đọc token với LoginPage và authSlice.
axiosClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

export default axiosClient