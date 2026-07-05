import React, { Suspense } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Spin } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  PlusOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer } = AntLayout;

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
            selectedKeys={[location.pathname]}
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
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" tip="加载中..." /></div>}>
          <Outlet />
        </Suspense>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff' }}>
        家族图谱 App ©2024 Created with ❤️
      </Footer>
    </AntLayout>
  );
};