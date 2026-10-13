import { useEffect, useState } from 'react'
import {
  Card,
  Empty,
  Flex,
  Grid,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS } from '../../utils/constants'
import { timetableService } from './timetableService'
import type { Lesson, TimetableOwner, TimetableResponse } from './timetableTypes'

const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu']
const PERIOD_TIMES = [
  '07:30–08:15',
  '08:20–09:05',
  '09:20–10:05',
  '10:10–10:55',
  '11:00–11:45',
]

// 1 = Thứ Hai ... 7 = Chủ Nhật
const TODAY_DOW = (() => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
})()

interface Row {
  period: number
  byDay: Record<number, Lesson | undefined>
}

interface Result {
  key: string // yêu cầu nào đã tạo ra kết quả này
  data: TimetableResponse | null
}

function LessonCell({ lesson, forTeacher }: { lesson: Lesson; forTeacher: boolean }) {
  return (
    <div>
      <div style={{ fontWeight: 500 }}>{lesson.subject}</div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {forTeacher ? lesson.className : lesson.teacherName} · {lesson.room}
      </Typography.Text>
    </div>
  )
}

function DayList({ items, forTeacher }: { items: Lesson[]; forTeacher: boolean }) {
  return (
    <Flex vertical gap={12}>
      {DAYS.map((name, i) => {
        const day = i + 1
        const dayItems = items.filter((l) => l.dayOfWeek === day)
        return (
          <Card
            key={day}
            size="small"
            title={
              <Space>
                {name}
                {TODAY_DOW === day && <Tag color="blue">Hôm nay</Tag>}
              </Space>
            }
          >
            {dayItems.length === 0 ? (
              <Typography.Text type="secondary">Không có tiết học</Typography.Text>
            ) : (
              <Flex vertical gap={8}>
                {dayItems.map((l) => (
                  <Flex key={l.id} gap={12}>
                    <div style={{ width: 96, flex: 'none' }}>
                      <div style={{ fontWeight: 500 }}>Tiết {l.period}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {PERIOD_TIMES[l.period - 1]}
                      </Typography.Text>
                    </div>
                    <LessonCell lesson={l} forTeacher={forTeacher} />
                  </Flex>
                ))}
              </Flex>
            )}
          </Card>
        )
      })}
    </Flex>
  )
}

export default function TimetablePage() {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false

  const { has } = usePermission()
  const canReadAll = has(PERMISSIONS.TIMETABLE_READ)

  const [people, setPeople] = useState<TimetableOwner[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [result, setResult] = useState<Result | null>(null)

  // Admin/Staff phải chọn một người mới có lịch để xem; Teacher/Student luôn xem lịch của mình
  const shouldFetch = canReadAll ? selectedId !== undefined : true
  const requestKey = canReadAll ? String(selectedId) : 'own'
  const loading = shouldFetch && result?.key !== requestKey
  const data = shouldFetch ? (result?.data ?? null) : null

  // Danh sách người để chọn (chỉ khi có quyền xem của mọi người)
  useEffect(() => {
    if (!canReadAll) return
    let ignore = false

    timetableService
      .people()
      .then((list) => {
        if (!ignore) setPeople(list)
      })
      .catch(() => {
        if (!ignore) message.error('Không tải được danh sách người dùng')
      })

    return () => {
      ignore = true
    }
  }, [canReadAll])

  // Tải thời khóa biểu
  useEffect(() => {
    if (!shouldFetch) return
    let ignore = false

    timetableService
      .get({ userId: canReadAll ? selectedId : undefined })
      .then((res) => {
        if (!ignore) setResult({ key: requestKey, data: res })
      })
      .catch(() => {
        if (ignore) return
        setResult({ key: requestKey, data: null })
        message.error('Không tải được thời khóa biểu')
      })

    return () => {
      ignore = true
    }
  }, [shouldFetch, canReadAll, selectedId, requestKey])

  const personOptions = [
    {
      label: 'Giáo viên',
      options: (people ?? [])
        .filter((p) => p.role === 'TEACHER')
        .map((p) => ({ value: p.id, label: p.fullName })),
    },
    {
      label: 'Học sinh',
      options: (people ?? [])
        .filter((p) => p.role === 'STUDENT')
        .map((p) => ({ value: p.id, label: `${p.fullName} (${p.className})` })),
    },
  ]

  const forTeacher = data?.owner.role === 'TEACHER'

  const rows: Row[] = PERIOD_TIMES.map((_, idx) => ({
    period: idx + 1,
    byDay: Object.fromEntries(
      (data?.items ?? []).filter((l) => l.period === idx + 1).map((l) => [l.dayOfWeek, l]),
    ),
  }))

  const columns: TableColumnsType<Row> = [
    {
      title: 'Tiết',
      key: 'period',
      width: 110,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>Tiết {r.period}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {PERIOD_TIMES[r.period - 1]}
          </Typography.Text>
        </div>
      ),
    },
    ...DAYS.map((name, i): TableColumnsType<Row>[number] => {
      const day = i + 1
      const highlight = TODAY_DOW === day ? { style: { background: token.colorPrimaryBg } } : {}
      return {
        title: (
          <Space size={4}>
            {name}
            {TODAY_DOW === day && (
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                Hôm nay
              </Tag>
            )}
          </Space>
        ),
        key: `day-${day}`,
        onHeaderCell: () => highlight,
        onCell: () => highlight,
        render: (_, r) => {
          const lesson = r.byDay[day]
          return lesson ? (
            <LessonCell lesson={lesson} forTeacher={forTeacher} />
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          )
        },
      }
    }),
  ]

  return (
    <>
      <Typography.Title level={3}>
        {canReadAll ? 'Thời khóa biểu' : 'Thời khóa biểu của tôi'}
      </Typography.Title>

      {canReadAll && (
        <Select
          showSearch
          allowClear
          placeholder="Chọn giáo viên hoặc học sinh"
          optionFilterProp="label"
          options={personOptions}
          value={selectedId}
          onChange={(value?: number) => setSelectedId(value)}
          loading={people === null}
          style={{ width: 360, maxWidth: '100%', marginBottom: 16 }}
        />
      )}

      {!shouldFetch ? (
        <Empty description="Chọn một người để xem thời khóa biểu" />
      ) : (
        <Spin spinning={loading}>
          <div style={{ minHeight: 200 }}>
            {data && (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Typography.Text strong>{data.owner.fullName}</Typography.Text>
                  <Tag color={forTeacher ? 'green' : 'orange'}>{data.owner.role}</Tag>
                  {data.owner.className && <Tag>Lớp {data.owner.className}</Tag>}
                </Space>

                {isMobile ? (
                  <DayList items={data.items} forTeacher={forTeacher} />
                ) : (
                  <Table<Row>
                    rowKey="period"
                    bordered
                    pagination={false}
                    columns={columns}
                    dataSource={rows}
                    scroll={{ x: 760 }}
                  />
                )}
              </>
            )}
          </div>
        </Spin>
      )}
    </>
  )
}