import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Alert,
  Space,
  Typography,
  Steps,
  message,
} from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useFamilyStore } from '../../stores/familyStore';
import { importFromExcel, downloadTemplate, type ImportPreview } from '../../services/importService';
import type { Member, MemberFormData } from '../../types/member';

const { Text } = Typography;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { members, addMember, addRelation, getMemberById } = useFamilyStore();

  const handleDownloadTemplate = () => {
    downloadTemplate();
    message.success('模板已下载');
  };

  const handleFileChange = async (uploadFile: File) => {
    if (!uploadFile.name.endsWith('.xlsx') && !uploadFile.name.endsWith('.xls')) {
      message.error('请上传 Excel 文件 (.xlsx 或 .xls)');
      return false;
    }

    setFile(uploadFile);
    setLoading(true);

    try {
      const result = await importFromExcel(uploadFile, members);
      setPreview(result);
      setCurrentStep(1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '解析文件失败');
    } finally {
      setLoading(false);
    }

    return false;
  };

  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      // 创建姓名到 ID 的映射
      const nameToId: Record<string, string> = {};
      members.forEach((m: Member) => {
        nameToId[m.name] = m.id;
      });

      // 添加新成员
      preview.newMembers.forEach((memberData: MemberFormData) => {
        const newMember = addMember(memberData);
        nameToId[newMember.name] = newMember.id;
      });

      // 添加关系
      let successCount = 0;
      let failCount = 0;

      preview.relations.forEach((relation: ImportPreview['relations'][0]) => {
        const sourceId = nameToId[relation.sourceName];
        const targetId = nameToId[relation.targetName];

        if (sourceId && targetId) {
          try {
            addRelation({
              sourceId,
              targetId,
              type: relation.type,
              subType: relation.subType,
            });
            successCount++;
          } catch {
            failCount++;
          }
        } else {
          failCount++;
        }
      });

      message.success(
        `导入完成：新增 ${preview.newMembers.length} 个成员，${successCount} 条关系` +
          (failCount > 0 ? `，${failCount} 条关系失败` : '')
      );

      onSuccess();
      handleReset();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setPreview(null);
    setFile(null);
    onClose();
  };

  const steps = [
    {
      title: '上传文件',
      content: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="批量导入说明"
            description={
              <Space direction="vertical">
                <Text>1. 请先下载导入模板，按模板格式填写数据</Text>
                <Text>2. Excel 文件需包含两个工作表：成员列表、关系列表</Text>
                <Text>3. 支持 .xlsx 和 .xls 格式</Text>
                <Text>4. 已存在的成员将自动跳过</Text>
              </Space>
            }
            type="info"
            showIcon
          />

          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
          </Space>

          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            beforeUpload={handleFileChange}
            showUploadList={false}
            disabled={loading}
            style={{ padding: 40 }}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域上传</p>
            <p className="ant-upload-hint">支持 .xlsx、.xls 格式</p>
          </Upload.Dragger>
        </Space>
      ),
    },
    {
      title: '预览确认',
      content: preview && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {preview.errors.length > 0 && (
            <Alert
              message={`发现 ${preview.errors.length} 个错误`}
              description={
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {preview.errors.slice(0, 10).map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                  {preview.errors.length > 10 && (
                    <li>...还有 {preview.errors.length - 10} 个错误</li>
                  )}
                </ul>
              }
              type="error"
              showIcon
            />
          )}

          {preview.warnings.length > 0 && (
            <Alert
              message={`发现 ${preview.warnings.length} 个警告`}
              description={
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {preview.warnings.slice(0, 5).map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {preview.warnings.length > 5 && (
                    <li>...还有 {preview.warnings.length - 5} 个警告</li>
                  )}
                </ul>
              }
              type="warning"
              showIcon
            />
          )}

          {preview.errors.length === 0 && (
            <Alert
              message="数据验证通过"
              description={`将导入 ${preview.newMembers.length} 个新成员，${preview.relations.length} 条关系`}
              type="success"
              showIcon
            />
          )}

          {preview.newMembers.length > 0 && (
            <>
              <Text strong>待导入成员 ({preview.newMembers.length})</Text>
              <Table
                size="small"
                dataSource={preview.newMembers.map((m: MemberFormData, i: number) => ({ ...m, key: i }))}
                columns={[
                  { title: '姓名', dataIndex: 'name', key: 'name' },
                  { title: '小名', dataIndex: 'nickname', key: 'nickname' },
                  { title: '性别', dataIndex: 'gender', key: 'gender', render: (g: string) => g === 'male' ? '男' : g === 'female' ? '女' : '其他' },
                  { title: '生日', dataIndex: 'birthday', key: 'birthday' },
                  { title: '工作地', dataIndex: 'workplace', key: 'workplace' },
                ]}
                pagination={{ pageSize: 5 }}
                scroll={{ y: 200 }}
              />
            </>
          )}

          {preview.existingMembers.length > 0 && (
            <Alert
              message="以下成员已存在，将跳过"
              description={preview.existingMembers.join('、')}
              type="info"
              showIcon
            />
          )}

          {preview.relations.length > 0 && (
            <>
              <Text strong>待导入关系 ({preview.relations.length})</Text>
              <Table
                size="small"
                dataSource={preview.relations.map((r: ImportPreview['relations'][0], i: number) => ({ ...r, key: i }))}
                columns={[
                  { title: '成员A', dataIndex: 'sourceName', key: 'sourceName' },
                  { title: '成员B', dataIndex: 'targetName', key: 'targetName' },
                  { title: '关系类型', dataIndex: 'type', key: 'type', render: (t: string) => {
                    const map: Record<string, string> = {
                      'parent-child': '血缘关系',
                      'spouse': '婚姻关系',
                      'sibling': '兄弟姐妹',
                    };
                    return map[t] || t;
                  }},
                  { title: '具体关系', dataIndex: 'subType', key: 'subType', render: (s: string) => {
                    if (!s) return '-';
                    const map: Record<string, string> = {
                      'father-son': '父子',
                      'father-daughter': '父女',
                      'mother-son': '母子',
                      'mother-daughter': '母女',
                      'husband-wife': '夫妻',
                      'brother-brother': '兄弟',
                      'brother-sister': '兄妹',
                      'sister-sister': '姐妹',
                    };
                    return map[s] || s;
                  }},
                ]}
                pagination={{ pageSize: 5 }}
                scroll={{ y: 200 }}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="批量导入成员"
      open={open}
      width={800}
      onCancel={handleReset}
      footer={
        <Space>
          {currentStep === 0 ? (
            <Button onClick={handleReset}>取消</Button>
          ) : (
            <>
              <Button onClick={() => setCurrentStep(0)}>返回上一步</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={loading}
                disabled={preview?.errors.length !== 0 || (preview?.newMembers.length === 0 && preview?.relations.length === 0)}
              >
                确认导入
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Steps
        current={currentStep}
        style={{ marginBottom: 24 }}
        items={[
          { title: '上传文件' },
          { title: '预览确认' },
        ]}
      />
      <div style={{ minHeight: 300 }}>{steps[currentStep]?.content}</div>
    </Modal>
  );
};
