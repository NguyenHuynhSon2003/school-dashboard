import type { ReactNode } from 'react'
import { usePermission } from '../../hooks/usePermission'
import type { Permission } from '../../utils/constants'
import ForbiddenPage from '../common/ForbiddenPage'

interface Props {
  permissions?: Permission[]
  children: ReactNode
}

export default function PermissionRoute({ permissions, children }: Props) {
  const { hasAny } = usePermission()

  // Trang có yêu cầu quyền mà user không có quyền nào trong danh sách thì chặn
  if (permissions && !hasAny(permissions)) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}