import { useEffect, useState } from 'react'
import { roleService, type RoleOption } from './roleService'

export function useAssignableRoles() {
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let ignore = false
    roleService
      .assignable()
      .then((data) => { if (!ignore) setRoles(data) })
      .catch(() => { if (!ignore) setFailed(true) })
    return () => { ignore = true }
  }, [])

  return { roles, failed }
}