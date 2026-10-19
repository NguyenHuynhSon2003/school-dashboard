// Access token chỉ giữ trong bộ nhớ: F5 là mất, app lấy lại bằng /auth/refresh
// (refresh token nằm trong httpOnly cookie do backend quản lý, JavaScript không đụng tới)
let accessToken: string | null = null

// Dọn khóa cũ của phiên bản trước (từng lưu access token trong localStorage)
try {
  localStorage.removeItem('accessToken')
} catch {
  // bỏ qua nếu trình duyệt chặn localStorage
}

export const tokenStorage = {
  get: () => accessToken,
  set: (token: string) => {
    accessToken = token
  },
  clear: () => {
    accessToken = null
  },
}