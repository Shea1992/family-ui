import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Upload,
  message,
  Divider,
  Checkbox,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFamilyStore } from '../../stores/familyStore';
import type { MemberFormData, Gender } from '../../types/member';
import type { RelationType, RelationSubType } from '../../types/relation';

const { TextArea } = Input;

const MemberEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string>('');

  // 关系相关状态（仅在添加成员时可用）
  const [addRelationEnabled, setAddRelationEnabled] = useState(false);
  const [relationType, setRelationType] = useState<RelationType>('parent-child');
  const [relationDirection, setRelationDirection] = useState<'parent' | 'child' | 'spouse'>('parent');
  const [relatedMemberId, setRelatedMemberId] = useState<string>('');

  const { members, addMember, updateMember, getMemberById, addRelation } = useFamilyStore();

  // 编辑模式下加载数据
  useEffect(() => {
    if (isEdit && id) {
      const member = getMemberById(id);
      if (member) {
        form.setFieldsValue({
          name: member.name,
          nickname: member.nickname,
          gender: member.gender,
          birthday: member.birthday ? dayjs(member.birthday) : null,
          workplace: member.workplace,
          bio: member.bio,
        });
        if (member.photo) {
          setPhotoBase64(member.photo);
        }
      }
    }
  }, [isEdit, id, members, form, getMemberById]);

  // 处理照片上传
  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
    return false;  // 阻止自动上传
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const formData: MemberFormData = {
        name: values.name,
        nickname: values.nickname,
        gender: values.gender as Gender,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : undefined,
        workplace: values.workplace,
        bio: values.bio,
        photo: photoBase64 || undefined,
      };

      if (isEdit && id) {
        updateMember(id, formData);
        message.success('成员信息已更新');
        navigate('/members');
      } else {
        // 添加新成员
        const newMember = addMember(formData);

        // 如果需要同时添加关系
        if (addRelationEnabled && relatedMemberId) {
          let sourceId = relatedMemberId;
          let targetId = newMember.id;
          let subType: RelationSubType | undefined;

          if (relationType === 'parent-child') {
            if (relationDirection === 'parent') {
              // 新成员是父母，relatedMemberId 是子女
              sourceId = newMember.id;
              targetId = relatedMemberId;
              const relatedMember = members.find(m => m.id === relatedMemberId);
              subType = values.gender === 'male' ? 'father-son' : 'mother-son';
              if (relatedMember?.gender === 'female') {
                subType = values.gender === 'male' ? 'father-daughter' : 'mother-daughter';
              }
            } else {
              // 新成员是子女，relatedMemberId 是父母
              sourceId = relatedMemberId;
              targetId = newMember.id;
              const relatedMember = members.find(m => m.id === relatedMemberId);
              subType = relatedMember?.gender === 'male' ? 'father-son' : 'mother-son';
              if (values.gender === 'female') {
                subType = relatedMember?.gender === 'male' ? 'father-daughter' : 'mother-daughter';
              }
            }
          } else if (relationType === 'spouse') {
            subType = 'husband-wife';
          }

          addRelation({
            sourceId,
            targetId,
            type: relationType,
            subType,
          });
        }

        message.success('成员已添加');
        navigate('/');
      }
    } catch (error) {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={isEdit ? '编辑成员' : '添加成员'}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          返回列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item name="nickname" label="小名/昵称">
          <Input placeholder="请输入小名或昵称（可选）" />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select placeholder="请选择性别">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
            <Select.Option value="other">其他</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="birthday" label="生日">
          <DatePicker style={{ width: '100%' }} placeholder="选择生日" />
        </Form.Item>

        <Form.Item name="workplace" label="工作地">
          <Input placeholder="请输入工作地（可选）" />
        </Form.Item>

        <Form.Item name="bio" label="简介">
          <TextArea rows={4} placeholder="请输入个人简介（可选）" />
        </Form.Item>

        <Form.Item label="照片">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              accept="image/*"
              beforeUpload={handlePhotoUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>上传照片</Button>
            </Upload>
            {photoBase64 && (
              <img
                src={photoBase64}
                alt="Preview"
                style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
              />
            )}
          </Space>
        </Form.Item>

        {/* 添加关系部分 - 仅在新增成员时显示 */}
        {!isEdit && members.length > 0 && (
          <>
            <Divider />
            <Form.Item>
              <Checkbox
                checked={addRelationEnabled}
                onChange={(e) => setAddRelationEnabled(e.target.checked)}
              >
                同时添加与现有成员的关系
              </Checkbox>
            </Form.Item>

            {addRelationEnabled && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item label="关系类型" required={addRelationEnabled}>
                  <Select
                    value={relationType}
                    onChange={(value) => {
                      setRelationType(value);
                      if (value === 'spouse') {
                        setRelationDirection('spouse');
                      } else {
                        setRelationDirection('parent');
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="parent-child">血缘关系（父母-子女）</Select.Option>
                    <Select.Option value="spouse">婚姻关系（夫妻）</Select.Option>
                  </Select>
                </Form.Item>

                {relationType === 'parent-child' && (
                  <Form.Item label="关系方向" required={addRelationEnabled}>
                    <Select
                      value={relationDirection}
                      onChange={(value) => setRelationDirection(value)}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="parent">
                        新成员是父母（现有成员是子女）
                      </Select.Option>
                      <Select.Option value="child">
                        新成员是子女（现有成员是父母）
                      </Select.Option>
                    </Select>
                  </Form.Item>
                )}

                <Form.Item label="选择关联成员" required={addRelationEnabled}>
                  <Select
                    value={relatedMemberId || undefined}
                    onChange={(value) => setRelatedMemberId(value)}
                    placeholder="请选择成员"
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={members.map((m) => ({
                      value: m.id,
                      label: `${m.name}${m.nickname ? ` (${m.nickname})` : ''}`,
                    }))}
                  />
                </Form.Item>
              </Space>
            )}
          </>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              保存
            </Button>
            <Button onClick={() => navigate('/members')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MemberEdit;
