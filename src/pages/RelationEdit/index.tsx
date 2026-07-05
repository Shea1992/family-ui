import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Select,
  Form,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import type { RelationType, RelationSubType } from '../../types/relation';
import { COLORS } from '../../constants';

const { Option } = Select;

const RelationEdit: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [relationType, setRelationType] = useState<RelationType>('parent-child');

  const {
    members,
    relations,
    addRelation,
    deleteRelation,
    getMemberById,
  } = useFamilyStore();

  // 确保 members 数据是最新的
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [members]);

  // 获取关系显示文本
  const getRelationTypeText = (type: RelationType, subType?: RelationSubType) => {
    const typeMap: Record<string, string> = {
      'parent-child': '血缘关系',
      'spouse': '婚姻关系',
      'sibling': '兄弟姐妹',
    };

    const subTypeMap: Record<string, string> = {
      'father-son': '父子',
      'father-daughter': '父女',
      'mother-son': '母子',
      'mother-daughter': '母女',
      'husband-wife': '夫妻',
      'brother-brother': '兄弟',
      'brother-sister': '兄妹',
      'sister-sister': '姐妹',
    };

    return subType ? subTypeMap[subType] || subType : typeMap[type] || type;
  };

  // 获取关系颜色
  const getRelationColor = (type: RelationType) => {
    switch (type) {
      case 'parent-child':
        return COLORS.PARENT_CHILD;
      case 'spouse':
        return COLORS.SPOUSE;
      case 'sibling':
        return COLORS.SIBLING;
      default:
        return '#999';
    }
  };

  // 处理添加关系
  const handleAddRelation = (values: any) => {
    if (values.sourceId === values.targetId) {
      message.error('不能选择同一个人');
      return;
    }

    // 检查是否已存在相同关系
    const exists = relations.some(
      (r) =>
        r.sourceId === values.sourceId &&
        r.targetId === values.targetId &&
        r.type === values.type
    );

    if (exists) {
      message.error('该关系已存在');
      return;
    }

    addRelation({
      sourceId: values.sourceId,
      targetId: values.targetId,
      type: values.type,
      subType: values.subType,
    });

    message.success('关系已添加');
    setIsModalOpen(false);
    form.resetFields();
  };

  // 获取关系选项
  const getSubTypeOptions = () => {
    switch (relationType) {
      case 'parent-child':
        return [
          { value: 'father-son', label: '父子' },
          { value: 'father-daughter', label: '父女' },
          { value: 'mother-son', label: '母子' },
          { value: 'mother-daughter', label: '母女' },
        ];
      case 'spouse':
        return [{ value: 'husband-wife', label: '夫妻' }];
      case 'sibling':
        return [
          { value: 'brother-brother', label: '兄弟' },
          { value: 'brother-sister', label: '兄妹' },
          { value: 'sister-sister', label: '姐妹' },
        ];
      default:
        return [];
    }
  };

  const columns = [
    {
      title: '成员 A',
      key: 'source',
      render: (_: unknown, record: typeof relations[0]) => {
        const member = getMemberById(record.sourceId);
        return member ? (
          <span>
            {member.name}
            {member.nickname && (
              <span style={{ color: '#999', marginLeft: 4 }}>
                ({member.nickname})
              </span>
            )}
          </span>
        ) : (
          '未知'
        );
      },
    },
    {
      title: '关系',
      key: 'relation',
      render: (_: unknown, record: typeof relations[0]) => (
        <Tag color={getRelationColor(record.type)}>
          {getRelationTypeText(record.type, record.subType)}
        </Tag>
      ),
    },
    {
      title: '成员 B',
      key: 'target',
      render: (_: unknown, record: typeof relations[0]) => {
        const member = getMemberById(record.targetId);
        return member ? (
          <span>
            {member.name}
            {member.nickname && (
              <span style={{ color: '#999', marginLeft: 4 }}>
                ({member.nickname})
              </span>
            )}
          </span>
        ) : (
          '未知'
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: typeof relations[0]) => (
        <Popconfirm
          title="确定删除该关系吗？"
          onConfirm={() => {
            deleteRelation(record.id);
            message.success('关系已删除');
          }}
          okText="确定"
          cancelText="取消"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="关系管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            disabled={sortedMembers.length < 2}
          >
            添加关系
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
          >
            返回图谱
          </Button>
        </Space>
      }
    >
      {sortedMembers.length < 2 && (
        <div style={{ padding: '20px 0', color: '#999', textAlign: 'center' }}>
          需要至少 2 个成员才能添加关系，请先<Button type="link" onClick={() => navigate('/members')}>添加成员</Button>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={relations}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条关系`,
        }}
        locale={{
          emptyText: '暂无关系，请先添加成员并创建关系',
        }}
      />

      {/* 添加关系弹窗 */}
      <Modal
        title="添加关系"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddRelation}
        >
          <Form.Item
            name="sourceId"
            label="成员 A"
            rules={[{ required: true, message: '请选择成员' }]}
          >
            <Select placeholder="选择成员" showSearch filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }>
              {sortedMembers.map((member) => (
                <Option key={member.id} value={member.id}>
                  {member.name}
                  {member.nickname && ` (${member.nickname})`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select
              placeholder="选择关系类型"
              onChange={(value) => {
                setRelationType(value);
                form.setFieldValue('subType', undefined);
              }}
            >
              <Option value="parent-child">血缘关系（父母-子女）</Option>
              <Option value="spouse">婚姻关系（夫妻）</Option>
              <Option value="sibling">兄弟姐妹</Option>
            </Select>
          </Form.Item>

          <Form.Item name="subType" label="具体关系">
            <Select placeholder="选择具体关系（可选）" allowClear>
              {getSubTypeOptions().map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="targetId"
            label="成员 B"
            rules={[{ required: true, message: '请选择成员' }]}
          >
            <Select placeholder="选择成员" showSearch filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }>
              {sortedMembers.map((member) => (
                <Option key={member.id} value={member.id}>
                  {member.name}
                  {member.nickname && ` (${member.nickname})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default RelationEdit;
