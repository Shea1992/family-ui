import { lazy } from 'react';
import { createHashRouter } from 'react-router-dom';
import { Layout } from './components/Layout/index.tsx';

// 路由懒加载 - 首屏只加载 Home，其他页面按需加载
const Home = lazy(() => import('./pages/Home/index.tsx'));
const MemberList = lazy(() => import('./pages/MemberList/index.tsx'));
const MemberEdit = lazy(() => import('./pages/MemberEdit/index.tsx'));
const RelationEdit = lazy(() => import('./pages/RelationEdit/index.tsx'));

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'members',
        element: <MemberList />,
      },
      {
        path: 'members/new',
        element: <MemberEdit />,
      },
      {
        path: 'members/:id/edit',
        element: <MemberEdit />,
      },
      {
        path: 'relations',
        element: <RelationEdit />,
      },
    ],
  },
]);
