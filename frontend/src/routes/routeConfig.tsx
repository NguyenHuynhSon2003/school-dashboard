import type { ReactNode } from 'react'
import {
  CalendarOutlined,
  DashboardOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import DashboardPage from '../features/dashboard/DashboardPage'
import TimetablePage from '../features/timetable/TimetablePage'
import UserPage from '../features/users/UserPage'
import RolePage from '../features/roles/RolePage'
import { PERMISSIONS } from '../utils/constants'
import type { Permission } from '../utils/constants'

export interface AppRoute {
  path: string
  label: string
  icon: ReactNode
  element: ReactNode
  // Cần có ÍT NHẤT MỘT quyền trong danh sách. Bỏ trống = mọi user đã đăng nhập
  permissions?: Permission[]
}

export const appRoutes: AppRoute[] = [
  {
    path: '/dashboard',
    label: 'Tổng quan',
    icon: <DashboardOutlined />,
    element: <DashboardPage />,
  },
  {
    path: '/timetable',
    label: 'Thời khóa biểu',
    icon: <CalendarOutlined />,
    element: <TimetablePage />,
    permissions: [PERMISSIONS.TIMETABLE_READ, PERMISSIONS.TIMETABLE_READ_OWN],
  },
  {
    path: '/users',
    label: 'Người dùng',
    icon: <TeamOutlined />,
    element: <UserPage />,
    permissions: [PERMISSIONS.USER_READ],
  },
  {
    path: '/roles',
    label: 'Vai trò',
    icon: <SafetyOutlined />,
    element: <RolePage />,
    permissions: [PERMISSIONS.ROLE_READ],
  },
]