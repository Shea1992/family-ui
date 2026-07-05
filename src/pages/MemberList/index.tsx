import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Tag, Avatar, Popconfirm, message, List } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import { ImportModal } from '../../components/ImportModal';
import { exportMembersToExcel } from '../../services/exportService';
import { useResponsive } from '../../hooks/useResponsive';
import type { Member } from '../../types/member';

const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const { members, deleteMember, getMemberRelations, getMemberById, getRelationTypeLabel, getSubTypeLabel } = useFamilyStore();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { isMobile } = useResponsive();

  const handleDelete = (id: string) => {
    deleteMember(id);
    message.success('成员已删除');
  };

  const handleExport = () => {
    if (members.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    exportMembersToExcel(
      members,
      getRelationTypeLabel,
      getSubTypeLabel,
      getMemberRelations,
      getMemberById,
    );
    message.success('导出成功');
  };

  const getGenderColor = (gender: string) => {
    if (gender === 'male') return '#1890ff';
    if (gender === 'female') return '#eb2f96';
    return '#722ed1';
  };

  const getGenderLabel = (gender: string) => {
    if (gender === 'male') return '男';
    if (gender === 'female') return '女';
    return '其他';
  };

  // ====== 桌面端：Table 视图 ======
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
          style={{ backgroundColor: getGenderColor(record.gender) }}
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
        <Tag color={gender === 'male' ? 'blue' : gender === 'female' ? 'pink' : 'purple'}>
          {getGenderLabel(gender)}
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

  // ====== 移动端：卡片列表视图 ======
  const renderMobileList = () => (
    <List
      dataSource={members}
      renderItem={(member) => {
        const relCount = getMemberRelations(member.id).length;
        return (
          <List.Item
            style={{ padding: '10px 12px' }}
            actions={[
              <Button
                key="edit"
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/members/${member.id}/edit`)}
              />,
              <Popconfirm
                key="delete"
                title="确定删除该成员吗？"
                description="删除后将同时删除相关关系"
                onConfirm={() => handleDelete(member.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  size={44}
                  src={member.photo}
                  style={{ backgroundColor: getGenderColor(member.gender) }}
                >
                  {member.name.charAt(0)}
                </Avatar>
              }
              title={
                <span>
                  {member.name}
                  {member.nickname && (
                    <span style={{ fontWeight: 'normal', fontSize: 12, color: '#999', marginLeft: 6 }}>
                      ({member.nickname})
                    </span>
                  )}
                </span>
              }
              description={
                <Space size={4} wrap>
                  <Tag color={member.gender === 'male' ? 'blue' : member.gender === 'female' ? 'pink' : 'purple'}>
                    {getGenderLabel(member.gender)}
                  </Tag>
                  {member.birthday && <span style={{ fontSize: 12, color: '#999' }}>{member.birthday}</span>}
                  {member.workplace && <span style={{ fontSize: 12, color: '#999' }}>{member.workplace}</span>}
                  <span style={{ fontSize: 12, color: '#999' }}>{relCount} 条关系</span>
                </Space>
              }
            />
          </List.Item>
        );
      }}
    />
  );

  // ====== 操作按钮 ======
  const actionButtons = isMobile ? (
    <Space size="small" wrap>
      <Button
        size="small"
        icon={<DownloadOutlined />}
        onClick={handleExport}
        disabled={members.length === 0}
      >
        导出
      </Button>
      <Button
        size="small"
        icon={<UploadOutlined />}
        onClick={() => setImportModalOpen(true)}
      >
        导入
      </Button>
      <Button
        size="small"
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/members/new')}
      >
        添加
      </Button>
    </Space>
  ) : (
    <Space>
      <Button
        icon={<DownloadOutlined />}
        onClick={handleExport}
        disabled={members.length === 0}
      >
        导出Excel
      </Button>
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
  );

  return (
    <>
      <Card title="成员列表" extra={actionButtons}>
        {isMobile ? renderMobileList() : (
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
        )}
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
