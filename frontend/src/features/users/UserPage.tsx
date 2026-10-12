import { useEffect, useState } from 'react'
import {
  Button,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import UserFormModal from './UserFormModal'
import { isAxiosError } from 'axios'
import { useAppSelector } from '../../app/hooks'
import UserAvatar from '../../components/common/UserAvatar'
import { useDebounce } from '../../hooks/useDebounce'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS } from '../../utils/constants'
import type { Role } from '../auth/authSlice'
import { canDeleteUser, canEditUser } from './userRules'
import { userService } from './userService'
import type { UserRecord } from './userTypes'

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'purple',
  STAFF: 'blue',
  TEACHER: 'green',
  STUDENT: 'orange',
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
]

type Status = 'active' | 'locked'

const columns: TableColumnsType<UserRecord> = [
  {
    title: 'Người dùng',
    key: 'user',
    render: (_, u) => (
      <Space>
        <UserAvatar seed={u.email} src={u.avatarUrl} />
        <div>
          <div style={{ fontWeight: 500 }}>{u.fullName}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {u.email}
          </Typography.Text>
        </div>
      </Space>
    ),
  },
  {
    title: 'Điện thoại',
    dataIndex: 'phone',
    key: 'phone',
    responsive: ['md'],
    render: (phone: string | null) => phone ?? '—',
  },
  {
    title: 'Vai trò',
    dataIndex: 'role',
    key: 'role',
    render: (role: Role) => <Tag color={ROLE_COLORS[role]}>{role}</Tag>,
  },
  {
    title: 'Trạng thái',
    dataIndex: 'isActive',
    key: 'isActive',
    render: (active: boolean) =>
      active ? <Tag color="success">Hoạt động</Tag> : <Tag color="error">Đã khóa</Tag>,
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'createdAt',
    key: 'createdAt',
    responsive: ['md'],
    render: (value: string) =>
      new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  },
]

interface ListResult {
  key: string // yêu cầu nào đã tạo ra kết quả này
  items: UserRecord[]
  total: number
}

export default function UserPage() {
  const me = useAppSelector((state) => state.auth.user)
  const { has } = usePermission()
  const canUpdate = has(PERMISSIONS.USER_UPDATE)
  const canDelete = has(PERMISSIONS.USER_DELETE)

  const canCreate = has(PERMISSIONS.USER_CREATE)
  const [modal, setModal] = useState<{ user: UserRecord | null } | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState<Role | undefined>()
  const [status, setStatus] = useState<Status | undefined>()
  const [pageSize, setPageSize] = useState(10)
  const [pageState, setPageState] = useState({ page: 1, sig: '' })
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<ListResult | null>(null)

  const search = useDebounce(searchInput.trim(), 400)

  // Chữ ký của bộ lọc: đổi bộ lọc (hoặc cỡ trang) thì tự về trang 1
  const filterSig = `${search}|${role ?? ''}|${status ?? ''}|${pageSize}`
  const page = pageState.sig === filterSig ? pageState.page : 1

  const requestKey = `${filterSig}|${page}|${reload}`
  // Kết quả đang có không khớp yêu cầu hiện tại nghĩa là đang tải
  const loading = result?.key !== requestKey

  useEffect(() => {
    let ignore = false

    userService
      .list({
        page,
        pageSize,
        search: search || undefined,
        role,
        isActive: status === undefined ? undefined : status === 'active',
      })
      .then((res) => {
        if (!ignore) setResult({ key: requestKey, items: res.items, total: res.total })
      })
      .catch(() => {
        if (ignore) return
        setResult({ key: requestKey, items: [], total: 0 })
        message.error('Không tải được danh sách người dùng')
      })

    return () => {
      ignore = true
    }
  }, [page, pageSize, search, role, status, requestKey])

  const handleDelete = async (u: UserRecord) => {
    try {
      await userService.remove(u.id)
      message.success(`Đã xóa ${u.fullName}`)
      // Vừa xóa dòng cuối của một trang không phải trang đầu thì lùi về trang trước
      if (result && result.items.length === 1 && page > 1) {
        setPageState({ page: page - 1, sig: filterSig })
      }
      setReload((r) => r + 1)
    } catch (err) {
      const text = isAxiosError(err) ? err.response?.data?.message : undefined
      message.error(text ?? 'Không xóa được người dùng')
    }
  }

  const actionColumn: TableColumnsType<UserRecord>[number] = {
    title: 'Thao tác',
    key: 'actions',
    align: 'right',
    render: (_, u) => {
      const showEdit = canUpdate && me !== null && canEditUser(me, u)
      const showDelete = canDelete && me !== null && canDeleteUser(me, u)

      return (
        <Space size={4}>
          {showEdit && (
            <Button
              type="text"
              size="small"
              aria-label="Sửa"
              icon={<EditOutlined />}
              onClick={() => setModal({ user: u })}
            />
          )}
          {showDelete && (
            <Popconfirm
              title="Xóa người dùng?"
              description={`${u.fullName} sẽ bị xóa khỏi hệ thống.`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(u)}
            >
              <Button type="text" size="small" danger aria-label="Xóa" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    },
  }

  const tableColumns = canUpdate || canDelete ? [...columns, actionColumn] : columns

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
            Người dùng
        </Typography.Title>
        {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ user: null })}>
            Thêm người dùng
            </Button>
        )}
        </Flex>

      <Flex wrap gap={8} style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên, email hoặc số điện thoại"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
        />
        <Select
          allowClear
          placeholder="Tất cả vai trò"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(value?: Role) => setRole(value)}
          style={{ width: 160 }}
        />
        <Select
          allowClear
          placeholder="Mọi trạng thái"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value?: Status) => setStatus(value)}
          style={{ width: 160 }}
        />
      </Flex>

      <Table<UserRecord>
        rowKey="id"
        columns={tableColumns}
        dataSource={result?.items ?? []}
        loading={loading}
        locale={{ emptyText: 'Không tìm thấy người dùng phù hợp' }}
        pagination={{
          current: page,
          pageSize,
          total: result?.total ?? 0,
          showSizeChanger: true,
          showTotal: (t, range) => `${range[0]}–${range[1]} trên ${t} người dùng`,
          onChange: (p, ps) => {
            if (ps !== pageSize) {
              setPageSize(ps) // đổi cỡ trang làm chữ ký đổi, trang tự về 1
            } else {
              setPageState({ page: p, sig: filterSig })
            }
          },
        }}
      />
      {modal && (
        <UserFormModal
            key={modal.user?.id ?? 'new'}
            user={modal.user}
            onClose={() => setModal(null)}
            onSaved={() => {
            setModal(null)
            setReload((r) => r + 1)
            }}
        />
        )}
    </>
  )
}