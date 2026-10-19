import { useEffect, useState } from 'react'
import {
  Alert, Button, Checkbox, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tag, Tooltip, Typography, message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS, ROLE_COLORS } from '../../utils/constants'
import { roleService } from './roleService'
import type { PermissionGroup, RoleItem } from './roleService'

// Thứ tự và tên cột của ma trận (cột lấy từ các action có trong danh mục quyền)
const ACTION_ORDER = ['read', 'create', 'update', 'delete', 'read_own', 'manage']
const ACTION_LABELS: Record<string, string> = {
  read: 'Xem',
  create: 'Thêm',
  update: 'Sửa',
  delete: 'Xóa',
  read_own: 'Xem của mình',
  manage: 'Quản lý',
}
const rank = (action: string) => {
  const i = ACTION_ORDER.indexOf(action)
  return i === -1 ? 99 : i
}

function getErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
}

export default function RolePage() {
  const { has } = usePermission()
  const canUpdate = has(PERMISSIONS.ROLE_UPDATE)
  const canCreate = has(PERMISSIONS.ROLE_CREATE)
  const canDelete = has(PERMISSIONS.ROLE_DELETE)
  
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<string[]>([]) // bản nháp quyền của vai trò đang chọn
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<{ name: string; description: string }>()

  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        const [roleList, groupList] = await Promise.all([
          roleService.list(),
          roleService.permissions(),
        ])
        if (ignore) return
        setRoles(roleList)
        setGroups(groupList)
        if (roleList.length > 0) {
          setSelectedId(roleList[0].id)
          setDraft(roleList[0].permissions)
        }
      } catch {
        if (!ignore) setError('Không thể tải dữ liệu vai trò. Vui lòng thử lại.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  const selected = roles.find((r) => r.id === selectedId) ?? null
  const dirty =
    selected !== null &&
    [...draft].sort().join() !== [...selected.permissions].sort().join()

  const handleSelectRole = (id: number) => {
    const role = roles.find((r) => r.id === id)
    if (!role) return
    setSelectedId(id)
    setDraft(role.permissions)
  }

  const toggle = (code: string) => {
    setDraft((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await roleService.update(selected.id, {
        name: selected.name,
        description: selected.description,
        permissions: draft,
      })
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      message.success(`Đã lưu quyền của vai trò ${updated.name}`)
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể lưu, vui lòng thử lại'))
    } finally {
      setSaving(false)
    }
  }
    const handleSubmitRole = async () => {
    let values: { name: string; description: string }
    try {
      values = await form.validateFields()
    } catch {
      return // form còn ô sai, antd đã tự hiện lỗi đỏ
    }

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        const created = await roleService.create({
          name: values.name,
          description: values.description ?? '',
          permissions: [], // vai trò mới chưa có quyền nào, tích ở ma trận rồi Lưu
        })
        setRoles((prev) => [...prev, created])
        setSelectedId(created.id)
        setDraft(created.permissions)
        message.success(`Đã tạo vai trò ${created.name}`)
      } else if (selected) {
        const updated = await roleService.update(selected.id, {
          name: values.name,
          description: values.description ?? '',
          permissions: selected.permissions, // giữ nguyên quyền đã lưu
        })
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        message.success('Đã cập nhật vai trò')
      }
      setModalMode(null)
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể lưu vai trò, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      const res = await roleService.remove(selected.id)
      const rest = roles.filter((r) => r.id !== selected.id)
      setRoles(rest)
      setSelectedId(rest[0]?.id ?? null)
      setDraft(rest[0]?.permissions ?? [])
      message.success(res?.message || 'Đã xóa vai trò')
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể xóa vai trò'))
    }
  }

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

  const actions = Array.from(new Set(groups.flatMap((g) => g.permissions.map((p) => p.action)))).sort(
    (a, b) => rank(a) - rank(b),
  )

  const columns: ColumnsType<PermissionGroup> = [
    { title: 'Tài nguyên', dataIndex: 'label', key: 'resource', width: 200 },
    ...actions.map((action) => ({
      title: ACTION_LABELS[action] ?? action,
      key: action,
      align: 'center' as const,
      render: (_: unknown, group: PermissionGroup) => {
        const perm = group.permissions.find((p) => p.action === action)
        if (!perm) return <span style={{ color: '#bfbfbf' }}>—</span>
        return (
          <Tooltip title={perm.label}>
            <Checkbox
              checked={draft.includes(perm.code)}
              disabled={!canUpdate}
              onChange={() => toggle(perm.code)}
            />
          </Tooltip>
        )
      },
    })),
  ]

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Vai trò & Phân quyền
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Chọn một vai trò rồi tích hoặc bỏ tích các quyền tương ứng, bấm Lưu để áp dụng.
      </Typography.Paragraph>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 240 }}
          value={selectedId}
          onChange={handleSelectRole}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
        />
        {selected && (
          <Tag color={ROLE_COLORS[selected.name] ?? 'default'}>{selected.userCount} người dùng</Tag>
        )}
                {canCreate && (
          <Button icon={<PlusOutlined />} onClick={() => setModalMode('create')}>
            Thêm vai trò
          </Button>
        )}
        {canUpdate && selected && <Button onClick={() => setModalMode('edit')}>Sửa thông tin</Button>}
        {canDelete && selected && selected.name !== 'ADMIN' && (
          <Popconfirm
            title={`Xóa vai trò ${selected.name}?`}
            description="Hành động này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={handleDelete}
          >
            <Button danger>Xóa vai trò</Button>
          </Popconfirm>
        )}
      </Space>

      {selected && (
        <Typography.Paragraph type="secondary">{selected.description}</Typography.Paragraph>
      )}

      <Table<PermissionGroup>
        rowKey="resource"
        columns={columns}
        dataSource={groups}
        pagination={false}
        bordered
        scroll={{ x: 'max-content' }}
      />

      {canUpdate && (
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" disabled={!dirty} loading={saving} onClick={handleSave}>
            Lưu thay đổi
          </Button>
          <Button disabled={!dirty || saving} onClick={() => selected && setDraft(selected.permissions)}>
            Hoàn tác
          </Button>
        </Space>
      )}
            {modalMode && (
        <Modal
          open
          title={modalMode === 'create' ? 'Thêm vai trò' : 'Sửa thông tin vai trò'}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={submitting}
          onOk={handleSubmitRole}
          onCancel={() => setModalMode(null)}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={
              modalMode === 'edit' && selected
                ? { name: selected.name, description: selected.description }
                : { name: '', description: '' }
            }
          >
            <Form.Item
              label="Tên vai trò"
              name="name"
              normalize={(value?: string) => value?.toUpperCase()}
              rules={[
                { required: true, message: 'Vui lòng nhập tên vai trò' },
                { pattern: /^[A-Za-z][A-Za-z0-9_]{1,29}$/, message: '2-30 ký tự: chữ, số hoặc dấu _ (bắt đầu bằng chữ)' },
              ]}
            >
              <Input disabled={modalMode === 'edit' && selected?.name === 'ADMIN'} />
            </Form.Item>
            <Form.Item label="Mô tả" name="description">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  )
  
}