import { useEffect } from 'react'
import { Spin } from 'antd'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { initAuth } from './features/auth/authSlice'
import LoginPage from './features/auth/LoginPage'

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

  return <LoginPage />
}

export default App