import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { refreshAccessToken } from '../../api/axiosClient'
import { tokenStorage } from '../../utils/tokenStorage'
import { authService } from './authService'

export type Role = 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT'

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
  permissions: string[]
  isActive: boolean
}

interface AuthState {
  user: User | null
  isInitializing: boolean
  loggedOut: boolean
}

const initialState: AuthState = {
  user: null,
  // Luôn thử khôi phục phiên khi mở app (access token chỉ nằm trong bộ nhớ nên F5 là mất)
  isInitializing: true,
  loggedOut: false,
}

// Khôi phục phiên: xin access token mới bằng cookie refresh, rồi lấy thông tin user
export const initAuth = createAsyncThunk('auth/init', async () => {
  try {
    await refreshAccessToken()
    return await authService.me()
  } catch (error) {
    tokenStorage.clear()
    throw error
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
      state.user = null
      state.loggedOut = true
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