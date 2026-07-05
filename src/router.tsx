import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout/index.tsx';
import Home from './pages/Home/index.tsx';
import MemberList from './pages/MemberList/index.tsx';
import MemberEdit from './pages/MemberEdit/index.tsx';
import RelationEdit from './pages/RelationEdit/index.tsx';

export const router = createBrowserRouter([
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
