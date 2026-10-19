import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { refreshAccessToken } from '../../api/axiosClient'
import { tokenStorage } from '../../utils/tokenStorage'
import { authService } from './authService'
import { refreshTokenStorage } from '../../utils/refreshTokenStorage'

export type Role = string 

export interface User { //quy định khuôn mẫu của user (data model)
  id: number
  email: string
  fullName: string
  role: Role
  permissions: string[] //mảng list quyền hạn của user
  isActive: boolean
}

interface AuthState { //
  user: User | null // lưu trữ khuôn mẫu user
  isInitializing: boolean // kiểm tra trạng thái phiên đăng nhập
  loggedOut: boolean // kiểm tra trạng thái đăng xuất chủ động hay bị động
}

const initialState: AuthState = { //trạng thái mặc định của Xác thực
  user: null, //chưa biết ai truy cập 
  isInitializing: true, // kiểm tra token
  loggedOut: false, // người dùng không chủ động bấm nút đăng xuất
}

// Khôi phục phiên: xin access token mới bằng cookie refresh, rồi lấy thông tin user
export const initAuth = createAsyncThunk('auth/init', async (_, { rejectWithValue }) => {
  // Kiểm tra cả access token lẫn refresh token trước khi quyết định gọi API
  const hasAccessToken = tokenStorage.get() !== null
  const hasRefreshToken = refreshTokenStorage.get() !== null

  // Chưa từng đăng nhập hoặc đã clear token thì dừng ngay lập tức, không gọi API
  if (!hasAccessToken && !hasRefreshToken) {
    return rejectWithValue('NO_SESSION')
  }

  try {
    const refreshed = await refreshAccessToken()
    // Backend mới trả sẵn user trong /auth/refresh, backend cũ thì hỏi thêm /auth/me
    return refreshed.user ?? (await authService.me())
  } catch (error) {
    tokenStorage.clear()
    refreshTokenStorage.clear()
    return rejectWithValue(error)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User }>) {
      state.user = action.payload.user
      state.loggedOut = false
    },
    // Người dùng chủ động đăng xuất
    logout(state) {
      state.user = null //set user null
      state.loggedOut = true //user bấm nút đăng xuất
    },
    // Hết phiên (refresh thất bại): khác logout ở chỗ vẫn nhớ trang đang xem để quay lại sau khi đăng nhập
    sessionExpired(state) {
      state.user = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload
        state.isInitializing = false
      })
      .addCase(initAuth.rejected, (state) => {
        state.user = null
        state.isInitializing = false
      })
  },
})

export const { setCredentials, logout, sessionExpired } = authSlice.actions
export default authSlice.reducer