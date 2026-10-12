import { Button, Card, Space, Tag, Typography } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../auth/authSlice'
import { tokenStorage } from '../../utils/tokenStorage'

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = () => {
    tokenStorage.clear()
    dispatch(logout())
  }

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ maxWidth: 480 }}>
        <Typography.Title level={3}>Dashboard</Typography.Title>
        <Space direction="vertical" size="middle">
          <Typography.Text>Xin chào, {user?.fullName}</Typography.Text>
          <Typography.Text>
            Vai trò: <Tag color="blue">{user?.role}</Tag>
          </Typography.Text>
          <Space wrap>
            {user?.permissions.map((p) => (
                <Tag key={p}>{p}</Tag>
            ))}
            </Space>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </Space>
      </Card>
    </div>
  )
}