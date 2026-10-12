import { useEffect } from 'react'
import { Spin } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { initAuth } from './features/auth/authSlice'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import ProtectedRoute from './components/guards/ProtectedRoute'

function App() {
  const dispatch = useAppDispatch()
  const isInitializing = useAppSelector((state) => state.auth.isInitializing)

  useEffect(() => {
    if (isInitializing) {
      dispatch(initAuth())
    }
  }, [dispatch, isInitializing])

  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App