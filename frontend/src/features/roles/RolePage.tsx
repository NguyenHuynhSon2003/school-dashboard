import { useEffect, useState } from 'react'
import { Typography, Card, Tag, Row, Col, Spin, Alert, Space } from 'antd'
import axiosClient from '../../api/axiosClient'

interface RoleItem {
  id: number
  name: string
  description: string
  permissions: string[]
  userCount: number
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'magenta',
  STAFF: 'blue',
  TEACHER: 'green',
  STUDENT: 'orange',
}

export default function RolePage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchRoles = async () => {
      try {
        const res = await axiosClient.get<RoleItem[]>('/roles')
        if (isMounted) {
          setRoles(res.data)
        }
      } catch {
        if (isMounted) {
          setError('Không thể tải danh sách vai trò. Vui lòng thử lại.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRoles()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="Đang tải danh sách vai trò..." />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} showIcon style={{ marginTop: 16 }} />
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Vai trò & Phân quyền
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Danh sách các vai trò trong hệ thống và quyền hạn tương ứng (cấu hình cố định phía server).
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        {roles.map((role) => (
          <Col xs={24} md={12} key={role.id}>
            <Card
              title={
                <Space>
                  <span>{role.name}</span>
                  <Tag color={ROLE_COLORS[role.name] ?? 'default'}>
                    {role.userCount} người dùng
                  </Tag>
                </Space>
              }
              style={{ height: '100%' }}
            >
              <p style={{ color: '#595959', marginBottom: 16 }}>{role.description}</p>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                Danh sách quyền:
              </Typography.Text>
              <Space size={[4, 8]} wrap>
                {role.permissions.map((perm) => (
                  <Tag key={perm} color="geekblue">
                    {perm}
                  </Tag>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}