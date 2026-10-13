import { useState } from 'react'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Tag } from 'antd'
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
import { authService } from '../../features/auth/authService' // Đảm bảo đường dẫn import service của bạn đúng

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const { hasAny } = usePermission()

  const screens = Grid.useBreakpoint()
  const isMobile = screens.lg === false

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Chỉ giữ các mục mà user có quyền
  const menuItems: MenuProps['items'] = appRoutes
    .filter((r) => !r.permissions || hasAny(r.permissions))
    .map((r) => ({ key: r.path, icon: r.icon, label: r.label }))

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
    setDrawerOpen(false)
  }

  const handleLogout = async () => {
    try {
      // Gọi API lên backend để xóa refreshToken trong CSDL
      await authService.logout()
    } catch (error) {
      console.error('Lỗi khi đăng xuất ở backend:', error)
    } finally {
      // Dọn dẹp token ở client và chuyển về trang đăng nhập
      tokenStorage.clear()
      localStorage.removeItem('refreshToken')
      dispatch(logout())
      navigate('/login')
    }
  }

  const userMenu: MenuProps = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
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

        <Content style={{ margin: isMobile ? 8 : 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', padding: isMobile ? 12 : 24, borderRadius: 8, minHeight: 360, width: '100%', flex: 1 }}>
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