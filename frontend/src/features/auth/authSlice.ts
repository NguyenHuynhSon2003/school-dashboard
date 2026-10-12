import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
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
  accessToken: string | null
  isInitializing: boolean
}

const savedToken = tokenStorage.get()

const initialState: AuthState = {
  user: null,
  accessToken: savedToken,
  isInitializing: savedToken !== null,
}

export const initAuth = createAsyncThunk('auth/init', async () => {
  try {
    return await authService.me()
  } catch (error) {
    tokenStorage.clear() // token hỏng hoặc hết hạn thì xóa luôn
    throw error
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: User; accessToken: string }>,
    ) {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
    },
    logout(state) {
      state.user = null
      state.accessToken = null
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
        state.accessToken = null
        state.isInitializing = false
      })
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

