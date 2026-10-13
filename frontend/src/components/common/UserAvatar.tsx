import { useMemo } from 'react'
import { Avatar } from 'antd'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'

interface Props {
  seed: string
  src?: string | null
  size?: number
}

export default function UserAvatar({ seed, src, size = 32 }: Props) {
  // Cùng một seed (email) luôn ra cùng một hình
  const fallback = useMemo(() => createAvatar(adventurer, { seed }).toDataUri(), [seed])

  return <Avatar size={size} src={src ?? fallback} />
}