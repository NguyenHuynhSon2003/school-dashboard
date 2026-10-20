import { useState } from 'react'
import { Form, Input, Modal, Select, Switch, message } from 'antd'
import { isAxiosError } from 'axios'
import { useAppSelector } from '../../app/hooks'
import { userService } from './userService'
import type { RoleOption } from '../roles/roleService'
import type { UserFormValues, UserRecord } from './userTypes'

interface Props {
  user: UserRecord | null // null = thêm mới
  roles: RoleOption[]
  onClose: () => void
  onSaved: () => void
}

export default function UserFormModal({ user, roles, onClose, onSaved }: Props) {
  const me = useAppSelector((state) => state.auth.user)
  const [form] = Form.useForm<UserFormValues>()
  const [saving, setSaving] = useState(false)

  const isEdit = user !== null
  const isSelf = user !== null && me?.id === user.id

  // Staff không được chọn vai trò ADMIN (dựa trên tên role thực tế từ DB)
  const roleOptions = roles
    .filter((r) => me?.role === 'ADMIN' || r.name !== 'ADMIN')
    .map((r) => ({
      value: r.name,
      label: r.name,
    }))

  const handleOk = async () => {
    let values: UserFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setSaving(true)
    try {
      if (user) {
        await userService.update(user.id, {
          fullName: values.fullName,
          phone: values.phone,
          role: values.role,
          isActive: values.isActive,
        })
        message.success('Đã cập nhật người dùng')
      } else {
        const { role, ...rest } = values
        const roleId = roles.find((r) => r.name === role)?.id
        if (!roleId) {
          message.error('Vai trò không hợp lệ hoặc chưa tải xong, vui lòng thử lại')
          setSaving(false)
          return
        }
        await userService.create({ ...rest, roleId })
        message.success('Đã thêm người dùng')
      }
      onSaved()
    } catch (err) {
      const data = isAxiosError(err) ? err.response?.data : undefined
      if (isAxiosError(err) && err.response?.status === 409) {
        form.setFields([{ name: 'email', errors: [data?.message ?? 'Email đã tồn tại'] }])
      } else {
        message.error(data?.message ?? 'Không lưu được người dùng')
      }
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Sửa người dùng' : 'Thêm người dùng'}
      okText="Lưu"
      cancelText="Hủy"
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={saving}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          user
            ? {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone ?? '',
                role: user.role,
                isActive: user.isActive,
              }
            : { role: 'STUDENT', isActive: true }
        }
      >
        <Form.Item
          label="Họ tên"
          name="fullName"
          rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input disabled={isEdit} />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[{ pattern: /^0\d{9}$/, message: 'Gồm 10 chữ số, bắt đầu bằng 0' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Vai trò" name="role" rules={[{ required: true, message: 'Chọn vai trò' }]}>
          <Select options={roleOptions} disabled={isSelf} placeholder="Chọn vai trò cho tài khoản" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, message: 'Tối thiểu 8 ký tự' },
            ]}
          >
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item label="Hoạt động" name="isActive" valuePropName="checked">
          <Switch disabled={isSelf} />
        </Form.Item>
      </Form>
    </Modal>
  )
}