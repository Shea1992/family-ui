import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Tag, Avatar, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import { ImportModal } from '../../components/ImportModal';
import type { Member } from '../../types/member';

const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const { members, deleteMember, getMemberRelations } = useFamilyStore();
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleDelete = (id: string) => {
    deleteMember(id);
    message.success('成员已删除');
  };

  const columns = [
    {
      title: '照片',
      dataIndex: 'photo',
      key: 'photo',
      width: 80,
      render: (photo: string | undefined, record: Member) => (
        <Avatar
          size={48}
          src={photo}
          style={{
            backgroundColor:
              record.gender === 'male'
                ? '#1890ff'
                : record.gender === 'female'
                ? '#eb2f96'
                : '#722ed1',
          }}
        >
          {record.name.charAt(0)}
        </Avatar>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Member) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.nickname && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.nickname}</div>
          )}
        </div>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender: string) => (
        <Tag
          color={
            gender === 'male' ? 'blue' : gender === 'female' ? 'pink' : 'purple'
          }
        >
          {gender === 'male' ? '男' : gender === 'female' ? '女' : '其他'}
        </Tag>
      ),
    },
    {
      title: '生日',
      dataIndex: 'birthday',
      key: 'birthday',
      width: 120,
      render: (birthday: string | undefined) => birthday || '-',
    },
    {
      title: '工作地',
      dataIndex: 'workplace',
      key: 'workplace',
      render: (workplace: string | undefined) => workplace || '-',
    },
    {
      title: '关系数量',
      key: 'relations',
      width: 100,
      render: (_: unknown, record: Member) => {
        const relations = getMemberRelations(record.id);
        return relations.length;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Member) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/members/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该成员吗？"
            description="删除后将同时删除相关关系"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="成员列表"
        extra={
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              批量导入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/members/new')}
            >
              添加成员
            </Button>
          </Space>
        }
      >
      <Table
        columns={columns}
        dataSource={members}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个成员`,
        }}
      />
      </Card>

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          message.success('导入完成');
        }}
      />
    </>
  );
};

export default MemberList;
