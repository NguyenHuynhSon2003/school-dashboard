import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { isAxiosError } from 'axios'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { setCredentials } from './authSlice'
import { authService } from './authService'
import type { LoginPayload } from './authService'
import { tokenStorage } from '../../utils/tokenStorage'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  // Đã đăng nhập rồi thì không cần ở trang login nữa
  if (user) {
    return <Navigate to={from} replace />
  }

  const onFinish = async (values: LoginPayload) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.login(values)
      tokenStorage.set(data.accessToken)
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        setError(err.response.data?.message ?? 'Đăng nhập thất bại')
      } else {
        setError('Không kết nối được máy chủ')
      }
      setLoading(false)
    }
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

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form<LoginPayload> layout="vertical" onFinish={onFinish}>
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

          <Button type="primary" htmlType="submit" block loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}