import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'

export default function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user)
  const loggedOut = useAppSelector((state) => state.auth.loggedOut)
  const location = useLocation()

  if (!user) {
    // Chủ động đăng xuất thì không nhớ trang cũ, để người đăng nhập sau vào /dashboard
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location }} />
  }

  return <Outlet />
}