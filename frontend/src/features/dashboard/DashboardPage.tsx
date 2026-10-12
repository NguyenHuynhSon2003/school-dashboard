import { Typography } from 'antd'
import { useAppSelector } from '../../app/hooks'

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Typography.Paragraph>Xin chào, {user?.fullName}</Typography.Paragraph>
    </>
  )
}