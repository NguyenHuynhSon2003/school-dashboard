import { useEffect, useState } from 'react'
import { Card, Col, Empty, Flex, Row, Space, Statistic, Tag, Typography, message } from 'antd'
import { LockOutlined, ReadOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useAppSelector } from '../../app/hooks'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS } from '../../utils/constants'
import { timetableService } from '../timetable/timetableService'
import type { TimetableResponse } from '../timetable/timetableTypes'
import { userService } from '../users/userService'

import type { UserStats } from '../users/userTypes'


// khai báo ngày giờ thực tế
const TODAY_TEXT = new Date().toLocaleDateString('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// interface Stats { // dữ liệu hiển thị ở trang tổng quan
//   total: number
//   students: number
//   teachers: number
//   locked: number
// }

// ===== Admin và Staff: thẻ thống kê =====
function AdminStats() {

  // undefined = đang tải, null = lỗi
  const [stats, setStats] = useState<UserStats | null | undefined>(undefined)


  useEffect(() => {
    let ignore = false


    // Một request duy nhất thay cho 4 lần gọi danh sách người dùng
    userService
      .stats()

      .then((data) => {
        if (!ignore) setStats(data)
      })
      .catch(() => {
        if (ignore) return
        setStats(null)
        message.error('Không tải được số liệu thống kê')
      })

    return () => {
      ignore = true
    }
  }, [])

  const items = [
    { title: 'Tổng người dùng', value: stats?.total, icon: <TeamOutlined /> },
    { title: 'Học sinh', value: stats?.students, icon: <UserOutlined /> },
    { title: 'Giáo viên', value: stats?.teachers, icon: <ReadOutlined /> },
    { title: 'Tài khoản bị khóa', value: stats?.locked, icon: <LockOutlined /> },
  ]

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={12} md={6} key={item.title}>
          <Card loading={stats === undefined}>
            <Statistic title={item.title} value={item.value ?? '—'} prefix={item.icon} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}

// ===== Teacher và Student: tiết học hôm nay =====
interface LessonsState {
  data: TimetableResponse | null // null = lỗi
  now: Date // thời điểm lấy dữ liệu
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function MyLessons() {
  const [state, setState] = useState<LessonsState | null>(null)

  useEffect(() => {
    let ignore = false

    timetableService
      .get({})
      .then((data) => {
        if (!ignore) setState({ data, now: new Date() })
      })
      .catch(() => {
        if (ignore) return
        setState({ data: null, now: new Date() })
        message.error('Không tải được thời khóa biểu')
      })

    return () => {
      ignore = true
    }
  }, [])

  const data = state?.data ?? null
  const now = state?.now
  const dayOfWeek = now ? (now.getDay() === 0 ? 7 : now.getDay()) : 0
  const minutes = now ? now.getHours() * 60 + now.getMinutes() : 0

  const today = data ? data.items.filter((l) => l.dayOfWeek === dayOfWeek) : []
  // Tiết đầu tiên chưa kết thúc: hoặc đang diễn ra, hoặc là tiết tiếp theo
  const nextIndex = today.findIndex((l) => toMinutes(l.endTime) > minutes)
  const forTeacher = data?.owner.role === 'TEACHER'

  return (
    <Card title="Tiết học hôm nay" loading={state === null}>
      {data === null ? (
        <Empty description="Không tải được thời khóa biểu" />
      ) : today.length === 0 ? (
        <Empty description="Hôm nay không có tiết học" />
      ) : (
        <Flex vertical gap={12}>
          {today.map((lesson, i) => {
            const ended = nextIndex === -1 || i < nextIndex
            const ongoing = i === nextIndex && toMinutes(lesson.startTime) <= minutes

            return (
              <Flex key={lesson.id} gap={16} align="center" style={{ opacity: ended ? 0.5 : 1 }}>
                <div style={{ width: 110, flex: 'none' }}>
                  <div style={{ fontWeight: 500 }}>Tiết {lesson.period}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {lesson.startTime}–{lesson.endTime}
                  </Typography.Text>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{lesson.subject}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {forTeacher ? `Lớp ${lesson.className}` : lesson.teacherName} · Phòng{' '}
                    {lesson.room}
                  </Typography.Text>
                </div>
                {ongoing && <Tag color="green">Đang diễn ra</Tag>}
                {i === nextIndex && !ongoing && <Tag color="blue">Tiếp theo</Tag>}
              </Flex>
            )
          })}
        </Flex>
      )}
    </Card>
  )
}

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user)
  const { has } = usePermission()

  return (
    <>
      <Flex vertical gap={4} style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Xin chào, {user?.fullName}
        </Typography.Title>
        <Space wrap>
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {user?.role}
          </Tag>
          <Typography.Text type="secondary">{TODAY_TEXT}</Typography.Text>
        </Space>
      </Flex>

      {has(PERMISSIONS.USER_READ) && <AdminStats />}
      {has(PERMISSIONS.TIMETABLE_READ_OWN) && <MyLessons />}
    </>
  )
}