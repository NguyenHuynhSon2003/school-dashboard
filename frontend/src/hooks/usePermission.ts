import { useAppSelector } from '../app/hooks'
import type { Permission } from '../utils/constants'

export function usePermission() {
  const user = useAppSelector((state) => state.auth.user)
  const permissions = user?.permissions ?? []

  const has = (permission: Permission) => permissions.includes(permission)
  const hasAny = (list: Permission[]) => list.some(has)

  return { has, hasAny }
}