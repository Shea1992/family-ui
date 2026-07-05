import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Drawer,
  Descriptions,
  Button,
  Space,
  Tag,
  Tooltip,
  Input,
  Modal,
  Form,
  Select,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import { ForceGraph } from '../../components/ForceGraph';
import type { MemberNode } from '../../types/member';
import type { RelationLink } from '../../types/relation';
import { COLORS } from '../../constants';

const { Search } = Input;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  // 添加关系弹窗状态
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [relationForm] = Form.useForm();
  const [relationType, setRelationType] = useState<string>('parent-child');

  const {
    members,
    relations,
    selectedMemberId,
    highlightedMemberIds,
    collapsedNodeIds,
    setSelectedMember,
    setHighlightedMembers,
    deleteMember,
    addRelation,
    getMemberRelations,
    searchMembers,
    toggleNodeCollapse,
    expandAll,
    collapseAll,
    getDescendantIds,
    isNodeCollapsed,
    getAllRelationTypes,
    getRelationTypeColor,
    getRelationTypeLabel,
    getSubTypeLabel,
    getSubTypeOptions,
    addCustomRelationType,
  } = useFamilyStore();

  // 计算哪些节点有后代（用于显示展开/折叠按钮）
  const hasChildrenMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    relations.forEach((r) => {
      if (r.type === 'parent-child') {
        map[r.sourceId] = true;
      }
    });
    return map;
  }, [relations]);

  // 获取需要隐藏的节点ID（被折叠节点的所有后代）
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    collapsedNodeIds.forEach((id) => {
      const descendants = getDescendantIds(id);
      descendants.forEach((did) => hidden.add(did));
    });
    return hidden;
  }, [collapsedNodeIds, getDescendantIds]);

  // 转换数据为 D3 格式（过滤掉隐藏的节点）
  const graphData = useMemo(() => {
    const visibleMembers = members.filter((m) => !hiddenNodeIds.has(m.id));
    const visibleMemberIds = new Set(visibleMembers.map((m) => m.id));

    const nodes: MemberNode[] = visibleMembers.map((m) => ({ ...m }));
    const links: RelationLink[] = relations
      .filter((r) => visibleMemberIds.has(r.sourceId) && visibleMemberIds.has(r.targetId))
      .map((r) => ({
        ...r,
        source: r.sourceId,
        target: r.targetId,
      }));
    return { nodes, links };
  }, [members, relations, hiddenNodeIds]);

  // 获取选中成员
  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  // 获取选中成员的关系
  const selectedMemberRelations = useMemo(() => {
    if (!selectedMemberId) return [];
    return getMemberRelations(selectedMemberId);
  }, [selectedMemberId, getMemberRelations]);

  // 处理节点双击（展开/折叠）
  const handleNodeDoubleClick = useCallback(
    (node: MemberNode) => {
      if (hasChildrenMap[node.id]) {
        toggleNodeCollapse(node.id);
      }
    },
    [hasChildrenMap, toggleNodeCollapse]
  );

  // 处理节点点击
  const handleNodeClick = useCallback(
    (node: MemberNode | null) => {
      if (node) {
        setSelectedMember(node.id);
        setDetailOpen(true);
      } else {
        setSelectedMember(null);
        setDetailOpen(false);
      }
    },
    [setSelectedMember]
  );

  // 处理搜索
  const handleSearch = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setHighlightedMembers([]);
        return;
      }
      const results = searchMembers(value);
      setHighlightedMembers(results.map((m) => m.id));
    },
    [searchMembers, setHighlightedMembers]
  );

  // 处理成员删除
  const handleDelete = useCallback(() => {
    if (selectedMemberId) {
      deleteMember(selectedMemberId);
      setDetailOpen(false);
    }
  }, [selectedMemberId, deleteMember]);

  // 所有关系类型选项
  const allRelationTypes = React.useMemo(() => getAllRelationTypes(), [getAllRelationTypes]);

  // 打开添加关系弹窗
  const handleOpenRelationModal = useCallback(() => {
    relationForm.resetFields();
    setRelationType('parent-child');
    setRelationModalOpen(true);
  }, [relationForm]);

  // 提交添加关系
  const handleAddRelation = useCallback((values: any) => {
    if (!selectedMemberId) return;

    if (values.targetId === selectedMemberId) {
      message.error('不能选择自己');
      return;
    }

    // 检查是否已存在相同关系
    const exists = relations.some(
      (r) =>
        ((r.sourceId === selectedMemberId && r.targetId === values.targetId) ||
          (r.sourceId === values.targetId && r.targetId === selectedMemberId)) &&
        r.type === values.type
    );

    if (exists) {
      message.error('该关系已存在');
      return;
    }

    let sourceId = selectedMemberId;
    let targetId = values.targetId;
    let subType: string | undefined;

    if (values.type === 'parent-child') {
      if (values.direction === 'child') {
        sourceId = selectedMemberId;
        targetId = values.targetId;
        const targetMember = members.find((m) => m.id === values.targetId);
        subType = selectedMember?.gender === 'male' ? 'father-son' : 'mother-son';
        if (targetMember?.gender === 'female') {
          subType = selectedMember?.gender === 'male' ? 'father-daughter' : 'mother-daughter';
        }
      } else {
        sourceId = values.targetId;
        targetId = selectedMemberId;
        const targetMember = members.find((m) => m.id === values.targetId);
        subType = targetMember?.gender === 'male' ? 'father-son' : 'mother-son';
        if (selectedMember?.gender === 'female') {
          subType = targetMember?.gender === 'male' ? 'father-daughter' : 'mother-daughter';
        }
      }
    } else if (values.type === 'spouse') {
      subType = 'husband-wife';
    } else {
      // 自定义关系类型，使用表单中的 subType（如果有）
      subType = values.subType;
    }

    addRelation({
      sourceId,
      targetId,
      type: values.type,
      subType,
    });

    message.success('关系已添加');
    setRelationModalOpen(false);
    relationForm.resetFields();
  }, [selectedMemberId, selectedMember, members, relations, addRelation, relationForm]);

  // 获取关系显示文本
  const getRelationText = (relation: typeof selectedMemberRelations[0]) => {
    const isSource = relation.sourceId === selectedMemberId;
    const otherId = isSource ? relation.targetId : relation.sourceId;
    const otherMember = members.find((m) => m.id === otherId);
    if (!otherMember) return null;

    const relationText = relation.subType
      ? getSubTypeLabel(relation.type, relation.subType)
      : getRelationTypeLabel(relation.type);

    return (
      <div key={relation.id}>
        <Tag color={getRelationTypeColor(relation.type)}>{relationText}</Tag>
        {otherMember.name}
        {otherMember.nickname && (
          <span style={{ color: '#999', marginLeft: 8 }}>
            ({otherMember.nickname})
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: 'calc(100vh - 134px)', position: 'relative' }}>
      {/* 搜索栏 */}
      <Card
        size="small"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          width: 300,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        <Search
          placeholder="搜索成员姓名或小名"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          prefix={<SearchOutlined />}
          allowClear
        />
        {highlightedMemberIds.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            找到 {highlightedMemberIds.length} 个结果
          </div>
        )}
      </Card>

      {/* 图例 */}
      <Card
        size="small"
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          background: 'rgba(26,26,46,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
        }}
        styles={{ body: { padding: '10px 14px' } }}
      >
        <Space direction="vertical" size="small">
          <div style={{ color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: COLORS.MALE }}>●</span> 男性
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: COLORS.FEMALE }}>●</span> 女性
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: COLORS.OTHER }}>●</span> 其他
          </div>
          <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8 }}>
            <div style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ color: COLORS.PARENT_CHILD }}>—</span> 血缘关系
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ color: COLORS.SPOUSE }}>- -</span> 婚姻关系
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ color: COLORS.SIBLING }}>—</span> 兄弟姐妹
            </div>
            {allRelationTypes.filter((t) => t.isCustom).map((t) => (
              <div key={t.value} style={{ color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ color: t.color }}>· ·</span> {t.label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              拖拽节点调整位置 · 双击展开/折叠
            </div>
          </div>
        </Space>
      </Card>

      {/* 缩放控制 */}
      <Card
        size="small"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: 'rgba(26,26,46,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        styles={{ body: { padding: '6px 10px' } }}
      >
        <Space>
          <Tooltip title="展开所有">
            <Button icon={<PlusOutlined />} onClick={expandAll} type="text" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </Tooltip>
          <Tooltip title="折叠所有">
            <Button icon={<MinusOutlined />} onClick={collapseAll} type="text" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </Tooltip>
          <Tooltip title="放大">
            <Button icon={<ZoomInOutlined />} type="text" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </Tooltip>
          <Tooltip title="缩小">
            <Button icon={<ZoomOutOutlined />} type="text" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </Tooltip>
          <Tooltip title="适应屏幕">
            <Button icon={<FullscreenOutlined />} type="text" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </Tooltip>
        </Space>
      </Card>

      {/* 力导向图 */}
      <ForceGraph
        nodes={graphData.nodes}
        links={graphData.links}
        selectedNodeId={selectedMemberId}
        highlightedNodeIds={highlightedMemberIds}
        collapsedNodeIds={collapsedNodeIds}
        hasChildrenMap={hasChildrenMap}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        getRelationTypeColor={getRelationTypeColor}
        getRelationTypeLabel={getRelationTypeLabel}
        getSubTypeLabel={getSubTypeLabel}
        customRelationTypes={useFamilyStore.getState().customRelationTypes}
      />

      {/* 成员详情抽屉 */}
      <Drawer
        title="成员详情"
        placement="right"
        width={400}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedMember(null);
        }}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={handleOpenRelationModal}
            >
              添加关系
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/members/${selectedMemberId}/edit`)}
            >
              编辑
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除
            </Button>
          </Space>
        }
      >
        {selectedMember && (
          <>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="姓名">
                {selectedMember.name}
              </Descriptions.Item>
              {selectedMember.nickname && (
                <Descriptions.Item label="小名">
                  {selectedMember.nickname}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="性别">
                <Tag
                  color={
                    selectedMember.gender === 'male'
                      ? 'blue'
                      : selectedMember.gender === 'female'
                      ? 'pink'
                      : 'purple'
                  }
                >
                  {selectedMember.gender === 'male'
                    ? '男'
                    : selectedMember.gender === 'female'
                    ? '女'
                    : '其他'}
                </Tag>
              </Descriptions.Item>
              {selectedMember.birthday && (
                <Descriptions.Item label="生日">
                  {selectedMember.birthday}
                </Descriptions.Item>
              )}
              {selectedMember.workplace && (
                <Descriptions.Item label="工作地">
                  {selectedMember.workplace}
                </Descriptions.Item>
              )}
              {selectedMember.bio && (
                <Descriptions.Item label="简介">
                  {selectedMember.bio}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedMemberRelations.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4>家族关系</h4>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedMemberRelations.map(getRelationText)}
                </Space>
              </div>
            )}

            {selectedMember.photo && (
              <div style={{ marginTop: 24 }}>
                <h4>照片</h4>
                <img
                  src={selectedMember.photo}
                  alt={selectedMember.name}
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                />
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* 添加关系弹窗 */}
      <Modal
        title="添加关系"
        open={relationModalOpen}
        onOk={() => relationForm.submit()}
        onCancel={() => {
          setRelationModalOpen(false);
          relationForm.resetFields();
        }}
      >
        <Form
          form={relationForm}
          layout="vertical"
          onFinish={handleAddRelation}
        >
          <Form.Item label="当前成员">
            <Input value={selectedMember?.name} disabled />
          </Form.Item>

          <Form.Item
            name="type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
            initialValue="parent-child"
          >
            <Select
              onChange={(value) => {
                setRelationType(value);
                relationForm.setFieldValue('direction', value === 'parent-child' ? 'child' : undefined);
                relationForm.setFieldValue('subType', undefined);
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
            </Select>
          </Form.Item>

          {relationType === 'parent-child' && (
            <Form.Item
              name="direction"
              label="关系方向"
              rules={[{ required: true, message: '请选择关系方向' }]}
              initialValue="child"
            >
              <Select>
                <Select.Option value="child">
                  {selectedMember?.name} 是父母，关联成员是子女
                </Select.Option>
                <Select.Option value="parent">
                  {selectedMember?.name} 是子女，关联成员是父母
                </Select.Option>
              </Select>
            </Form.Item>
          )}

          {relationType !== 'parent-child' && relationType !== 'spouse' && getSubTypeOptions(relationType).length > 0 && (
            <Form.Item name="subType" label="具体关系">
              <Select placeholder="选择具体关系（可选）" allowClear>
                {getSubTypeOptions(relationType).map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="targetId"
            label="关联成员"
            rules={[{ required: true, message: '请选择关联成员' }]}
          >
            <Select
              placeholder="请选择成员"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={members
                .filter((m) => m.id !== selectedMemberId)
                .map((m) => ({
                  value: m.id,
                  label: `${m.name}${m.nickname ? ` (${m.nickname})` : ''}`,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Home;
