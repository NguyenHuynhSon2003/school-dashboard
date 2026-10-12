import { Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { setCredentials } from './authSlice'
import { tokenStorage } from '../../utils/tokenStorage'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {

  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  const onFinish = (values: LoginForm) => {
    tokenStorage.set('fake-token')
    dispatch(
      setCredentials({
        accessToken: 'fake-token',
        user: {
          id: 1,
          email: values.email,
          fullName: 'Người dùng thử',
          role: 'ADMIN',
          permissions: [],
          isActive: true,
        },
      }),
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Đăng nhập
        </Typography.Title>

        <Form<LoginForm> layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin@school.edu" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Đăng nhập
          </Button>
        </Form>
        {user && (
          <Typography.Text>
            Xin chào, {user.fullName} ({user.email})
          </Typography.Text>
        )}
      </Card>
    </div>
  )
}