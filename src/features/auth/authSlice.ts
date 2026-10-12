import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { tokenStorage } from '../../utils/tokenStorage'

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
}

const initialState: AuthState = {
  user: null,
  accessToken: tokenStorage.get(),
}

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
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

