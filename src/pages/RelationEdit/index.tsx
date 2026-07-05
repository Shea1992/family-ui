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
  Input,
  ColorPicker,
  Divider,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import type { CustomRelationTypeDefinition } from '../../types/relation';
import { exportRelationsToExcel } from '../../services/exportService';

const RelationEdit: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [relationType, setRelationType] = useState<string>('parent-child');

  // 自定义类型弹窗
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customForm] = Form.useForm();

  // 管理自定义类型弹窗
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // 子类型动态新增
  const [pendingSubTypes, setPendingSubTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [newSubTypeValue, setNewSubTypeValue] = useState('');
  const [newSubTypeLabel, setNewSubTypeLabel] = useState('');

  const {
    members,
    relations,
    addRelation,
    deleteRelation,
    getMemberById,
    getAllRelationTypes,
    getRelationTypeColor,
    getRelationTypeLabel,
    getSubTypeLabel,
    getSubTypeOptions,
    addCustomRelationType,
    deleteCustomRelationType,
  } = useFamilyStore();

  // 确保 members 数据是最新的
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [members]);

  // 所有关系类型选项
  const allRelationTypes = React.useMemo(() => getAllRelationTypes(), [getAllRelationTypes, relations]);

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

  // 处理添加自定义关系类型
  const handleAddCustomType = () => {
    const values = customForm.getFieldsValue();
    const typeValue = values.typeValue?.trim();
    const typeLabel = values.typeLabel?.trim();

    if (!typeValue || !typeLabel) {
      message.error('请填写类型标识和显示名称');
      return;
    }

    // 检查类型标识是否已存在
    if (allRelationTypes.some((t) => t.value === typeValue)) {
      message.error('该类型标识已存在');
      return;
    }

    const color = values.color || undefined;

    addCustomRelationType({
      type: typeValue,
      label: typeLabel,
      subTypes: pendingSubTypes,
      ...(color ? { color: typeof color === 'string' ? color : color.toHexString() } : {}),
    });

    message.success('自定义关系类型已添加');
    setCustomModalOpen(false);
    customForm.resetFields();
    setPendingSubTypes([]);
    setNewSubTypeValue('');
    setNewSubTypeLabel('');
  };

  // 添加子类型到待提交列表
  const handleAddSubType = () => {
    if (!newSubTypeValue.trim() || !newSubTypeLabel.trim()) {
      message.error('请填写子类型标识和显示名称');
      return;
    }
    if (pendingSubTypes.some((s) => s.value === newSubTypeValue.trim())) {
      message.error('该子类型标识已存在');
      return;
    }
    setPendingSubTypes([...pendingSubTypes, { value: newSubTypeValue.trim(), label: newSubTypeLabel.trim() }]);
    setNewSubTypeValue('');
    setNewSubTypeLabel('');
  };

  // 导出关系为 Excel
  const handleExport = () => {
    if (relations.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    exportRelationsToExcel(
      relations,
      getMemberById,
      getRelationTypeLabel,
      getSubTypeLabel,
    );
    message.success('导出成功');
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
        <Tag color={getRelationTypeColor(record.type)}>
          {record.subType ? getSubTypeLabel(record.type, record.subType) : getRelationTypeLabel(record.type)}
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

  // 自定义类型管理列表
  const customTypes = allRelationTypes.filter((t) => t.isCustom);

  return (
    <Card
      title="关系管理"
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={relations.length === 0}
          >
            导出Excel
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setManageModalOpen(true)}
          >
            管理类型
          </Button>
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
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                  {member.nickname && ` (${member.nickname})`}
                </Select.Option>
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
              {allRelationTypes.map((t) => (
                <Select.Option key={t.value} value={t.value}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: t.color }} />
                    {t.label}
                    {t.isCustom && <span style={{ color: '#999', fontSize: 11 }}>(自定义)</span>}
                  </span>
                </Select.Option>
              ))}
              <Select.Option value="__divider__" disabled style={{ pointerEvents: 'none', padding: 0 }}>
                <div style={{ borderTop: '1px solid #e8e8e8', margin: '4px 0' }} />
              </Select.Option>
              <Select.Option value="__add_custom__" disabled>
                <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => { setIsModalOpen(false); setCustomModalOpen(true); }} style={{ padding: 0 }}>
                  新增自定义类型
                </Button>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="subType" label="具体关系">
            <Select placeholder="选择具体关系（可选）" allowClear>
              {getSubTypeOptions(relationType).map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
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
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                  {member.nickname && ` (${member.nickname})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增自定义关系类型弹窗 */}
      <Modal
        title="新增自定义关系类型"
        open={customModalOpen}
        onOk={handleAddCustomType}
        onCancel={() => {
          setCustomModalOpen(false);
          customForm.resetFields();
          setPendingSubTypes([]);
          setNewSubTypeValue('');
          setNewSubTypeLabel('');
        }}
        width={520}
      >
        <Form form={customForm} layout="vertical">
          <Form.Item
            name="typeValue"
            label="类型标识（英文，如 in-law）"
            rules={[{ required: true, message: '请输入类型标识' }]}
          >
            <Input placeholder="如：in-law, grandparent, kin" />
          </Form.Item>
          <Form.Item
            name="typeLabel"
            label="显示名称（中文，如 亲家）"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="如：亲家、翁婿、祖孙" />
          </Form.Item>
          <Form.Item name="color" label="连线颜色">
            <ColorPicker format="hex" />
          </Form.Item>
        </Form>

        <Divider orientationMargin={0} style={{ fontSize: 13 }}>子类型（可选）</Divider>

        {pendingSubTypes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {pendingSubTypes.map((st, idx) => (
              <div key={st.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Tag color="blue">{st.label} ({st.value})</Tag>
                <Button size="small" danger type="link" onClick={() => setPendingSubTypes(pendingSubTypes.filter((_, i) => i !== idx))}>删除</Button>
              </div>
            ))}
          </div>
        )}

        <Space>
          <Input
            placeholder="子类型标识"
            value={newSubTypeValue}
            onChange={(e) => setNewSubTypeValue(e.target.value)}
            style={{ width: 130 }}
          />
          <Input
            placeholder="子类型名称"
            value={newSubTypeLabel}
            onChange={(e) => setNewSubTypeLabel(e.target.value)}
            style={{ width: 130 }}
          />
          <Button icon={<PlusOutlined />} onClick={handleAddSubType}>添加</Button>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          如：标识填 father-in-law-son，名称填 岳父-女婿
        </div>
      </Modal>

      {/* 管理自定义关系类型弹窗 */}
      <Modal
        title="管理关系类型"
        open={manageModalOpen}
        onCancel={() => setManageModalOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setManageModalOpen(false)}>关闭</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setManageModalOpen(false);
                setCustomModalOpen(true);
              }}
            >
              新增类型
            </Button>
          </Space>
        }
        width={560}
      >
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>预置类型</h4>
          {allRelationTypes.filter((t) => !t.isCustom).map((t) => (
            <Tag key={t.value} color={t.color} style={{ marginBottom: 4 }}>
              {t.label}
              {t.subTypes.length > 0 && (
                <span style={{ fontSize: 11, opacity: 0.8 }}>
                  （{t.subTypes.map((s) => s.label).join('、')}）
                </span>
              )}
            </Tag>
          ))}
        </div>

        {customTypes.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 8 }}>自定义类型</h4>
            {customTypes.map((t) => {
              const usageCount = relations.filter((r) => r.type === t.value).length;
              return (
                <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                  <div style={{ flex: 1 }}>
                    <Tag color={t.color}>{t.label}</Tag>
                    <span style={{ fontSize: 12, color: '#999' }}>({t.value})</span>
                    {t.subTypes.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {t.subTypes.map((s) => (
                          <Tag key={s.value} style={{ fontSize: 11 }}>{s.label}</Tag>
                        ))}
                      </div>
                    )}
                    {usageCount > 0 && (
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        已有 {usageCount} 条关系使用
                      </div>
                    )}
                  </div>
                  <Popconfirm
                    title={usageCount > 0 ? `删除后 ${usageCount} 条关系也会被删除，确定吗？` : '确定删除该类型吗？'}
                    onConfirm={() => {
                      deleteCustomRelationType(t.value);
                      message.success('已删除');
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        )}

        {customTypes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            暂无自定义类型，点击"新增类型"添加
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default RelationEdit;
