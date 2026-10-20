import { useEffect, useState } from 'react'
import { roleService } from './roleService'
import type { RoleItem } from './roleService'

// Hook tải danh sách vai trò một lần khi component được vẽ lần đầu
export function useRoles() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let ignore = false
    roleService
      .list()
      .then((data) => {
        if (!ignore) setRoles(data)
      })
      .catch(() => {
        if (!ignore) setFailed(true) // ví dụ không có quyền role:read
      })
    return () => {
      ignore = true
    }
  }, [])

  return { roles, failed }
}