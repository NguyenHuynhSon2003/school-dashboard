import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'

export default function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()

  if (!user) {
    // Nhớ trang đang định vào để quay lại sau khi đăng nhập
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}