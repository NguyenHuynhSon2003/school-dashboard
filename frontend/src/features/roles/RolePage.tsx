import { useEffect, useState } from 'react'
import { Alert, Card, Col, Row, Space, Spin, Tag, Typography } from 'antd'
import { ROLE_COLORS } from '../../utils/constants'
import type { Role } from '../auth/authSlice'
import { roleService } from './roleService'
import type { RoleItem } from './roleService'

export default function RolePage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchRoles = async () => {
      try {
        const data = await roleService.list()
        if (!ignore) setRoles(data)
      } catch {
        if (!ignore) setError('Không thể tải danh sách vai trò. Vui lòng thử lại.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchRoles()

    return () => {
      ignore = true
    }
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
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
                  <Tag color={ROLE_COLORS[role.name as Role] ?? 'default'}>
                    {role.userCount} người dùng
                  </Tag>
                </Space>
              }
              style={{ height: '100%' }}
            >
              <Typography.Paragraph type="secondary">{role.description}</Typography.Paragraph>
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