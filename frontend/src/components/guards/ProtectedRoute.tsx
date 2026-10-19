import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'

export default function ProtectedRoute() {// hàm cho phép chỉ những ai đã đăng nhập mới được xem nội dung bên trong
  const user = useAppSelector((state) => state.auth.user) // biến lấy danh tính user
  const loggedOut = useAppSelector((state) => state.auth.loggedOut) // biến loggedOut từ AuthState
  const location = useLocation() // Hook lấy URL mà user cố truy cập như /users, /roles

  if (!user) {
    // Chủ động đăng xuất thì không nhớ trang cũ, để sau đăng nhập thì vào /dashboard
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location }} />
  }

  return <Outlet />
}