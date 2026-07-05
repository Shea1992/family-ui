import React, { Suspense } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Spin } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  PlusOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../hooks/useResponsive';

const { Header, Content, Footer } = AntLayout;

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">家族图谱</Link>,
    },
    {
      key: '/members',
      icon: <TeamOutlined />,
      label: <Link to="/members">成员列表</Link>,
    },
    {
      key: '/relations',
      icon: <ShareAltOutlined />,
      label: <Link to="/relations">关系管理</Link>,
    },
  ];

  // 当前选中的 tab key
  const selectedKey = (() => {
    if (location.pathname === '/') return '/';
    if (location.pathname.startsWith('/members')) return '/members';
    if (location.pathname.startsWith('/relations')) return '/relations';
    return '/';
  })();

  // 底部 tab 项配置
  const bottomTabs = [
    { key: '/', iconType: 'home', label: '图谱' },
    { key: '/members', iconType: 'team', label: '成员' },
    { key: '/relations', iconType: 'relation', label: '关系' },
  ];

  const renderTabIcon = (type: string, color: string) => {
    const iconStyle = { fontSize: 20, color };
    switch (type) {
      case 'home': return <HomeOutlined style={iconStyle} />;
      case 'team': return <TeamOutlined style={iconStyle} />;
      case 'relation': return <ShareAltOutlined style={iconStyle} />;
      default: return null;
    }
  };

  if (isMobile) {
    // ====== 移动端布局：顶栏标题 + 底部 Tab 导航 ======
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        {/* 简化顶栏：只显示标题和添加按钮 */}
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 10,
            padding: '0 12px',
            height: 48,
            lineHeight: '48px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 'bold' }}>
            🏠 家族图谱
          </h1>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => navigate('/members/new')}
          >
            添加
          </Button>
        </Header>

        <Content style={{ padding: 0, background: '#f0f2f5', flex: 1, overflow: 'auto' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <Spin size="large" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </Content>

        {/* 底部 Tab 导航栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: 56,
            background: '#fff',
            borderTop: '1px solid #eee',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          {bottomTabs.map((tab) => {
            const isActive = selectedKey === tab.key;
            const color = isActive ? '#1677ff' : '#999';
            return (
              <Link
                key={tab.key}
                to={tab.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  height: '100%',
                  textDecoration: 'none',
                  color,
                  transition: 'color 0.2s',
                  gap: 2,
                }}
              >
                {renderTabIcon(tab.iconType, color)}
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </AntLayout>
    );
  }

  // ====== 桌面端布局：顶部横向菜单 ======
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1
            style={{
              margin: 0,
              marginRight: 48,
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            🏠 家族图谱
          </h1>
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ borderBottom: 'none' }}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/members/new')}
        >
          添加成员
        </Button>
      </Header>

      <Content style={{ padding: 0, background: '#f0f2f5' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        }>
          <Outlet />
        </Suspense>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff' }}>
        家族图谱 App ©2024 Created with ❤️
      </Footer>
    </AntLayout>
  );
};
