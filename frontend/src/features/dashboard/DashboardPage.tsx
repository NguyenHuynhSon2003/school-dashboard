import { Card, Tag, Typography } from 'antd'
import { useAppSelector } from '../../app/hooks'

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ maxWidth: 480 }}>
        <Typography.Title level={3}>Dashboard</Typography.Title>
        <Typography.Paragraph>Xin chào, {user?.fullName ?? '(chưa đăng nhập)'}</Typography.Paragraph>
        <Typography.Text>
          Vai trò: {user ? <Tag color="blue">{user.role}</Tag> : '-'}
        </Typography.Text>
      </Card>
    </div>
  )
}