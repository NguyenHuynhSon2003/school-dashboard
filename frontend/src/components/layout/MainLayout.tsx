import { useState } from 'react'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Tag, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import { usePermission } from '../../hooks/usePermission'
import { appRoutes } from '../../routes/routeConfig'
import { tokenStorage } from '../../utils/tokenStorage'
import { authService } from '../../features/auth/authService'
import type { MessageResponse } from '../../api/types'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const dispatch = useAppDispatch() //gửi các hành động lên Redux store
  const navigate = useNavigate() //điểu hướng trang
  const location = useLocation() //URL
  const user = useAppSelector((state) => state.auth.user) //lấy tt user
  const { hasAny } = usePermission() // kiểm tra quyền hạn

  const screens = Grid.useBreakpoint() //grid của thư viện Ant
  const isMobile = screens.lg === false 

  //Hook quản lý trạng thái hiển thị thanh điều hướng
  const [collapsed, setCollapsed] = useState(false)  
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Chỉ giữ các mục mà user có quyền
  const menuItems: MenuProps['items'] = appRoutes
    .filter((r) => !r.permissions || hasAny(r.permissions)) // sàng lọc trang mà tài khoản xem đc
    .map((r) => ({ key: r.path, icon: r.icon, label: r.label })) // dịch lại path của router sang key

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
    setDrawerOpen(false)
  }

  const handleLogout = async () => {
    let text = 'Đăng xuất thành công'
    try {
      const res: MessageResponse | undefined = await authService.logout()
      if (res?.message) text = res.message
    } catch {
      // lỗi mạng cũng không sao, vẫn đăng xuất phía trình duyệt
    }
    tokenStorage.clear()
    dispatch(logout())
    message.success(text)
  }

  const userMenu: MenuProps = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh'  }}>
      {!isMobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
          <div
            style={{
              height: 48,
              margin: 8,
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {collapsed ? 'SD' : 'School Dashboard'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
      )}

      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
          />

          <Dropdown menu={userMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              {!isMobile && <span>{user?.fullName}</span>}
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {user?.role}
              </Tag>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: isMobile ? 8 : 16 }}>
          <div style={{ background: '#fff', padding: isMobile ? 12 : 24, borderRadius: 8, minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      <Drawer
        title="School Dashboard"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>
    </Layout>
  )
}