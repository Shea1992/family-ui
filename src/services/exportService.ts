import * as XLSX from 'xlsx';
import type { Member } from '../types/member';
import type { Relation } from '../types/relation';

/**
 * 导出成员列表为 Excel 文件
 */
export const exportMembersToExcel = (
  members: Member[],
  getRelationTypeLabel: (type: string) => string,
  getSubTypeLabel: (type: string, subType?: string) => string,
  getMemberRelations: (id: string) => Relation[],
  getMemberById: (id: string) => Member | undefined,
) => {
  const data = members.map((m) => {
    const relations = getMemberRelations(m.id);
    const relationText = relations.map((r) => {
      const otherId = r.sourceId === m.id ? r.targetId : r.sourceId;
      const otherMember = getMemberById(otherId);
      const relLabel = r.subType ? getSubTypeLabel(r.type, r.subType) : getRelationTypeLabel(r.type);
      return `${otherMember?.name || '未知'}(${relLabel})`;
    }).join('、');

    return {
      '姓名': m.name,
      '小名': m.nickname || '',
      '性别': m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '其他',
      '生日': m.birthday || '',
      '工作地': m.workplace || '',
      '简介': m.bio || '',
      '关系数量': relations.length,
      '关系列表': relationText,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 10 },  // 姓名
    { wch: 10 },  // 小名
    { wch: 6 },   // 性别
    { wch: 12 },  // 生日
    { wch: 10 },  // 工作地
    { wch: 20 },  // 简介
    { wch: 8 },   // 关系数量
    { wch: 40 },  // 关系列表
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '成员列表');
  XLSX.writeFile(workbook, `家族成员列表_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * 导出关系列表为 Excel 文件
 */
export const exportRelationsToExcel = (
  relations: Relation[],
  getMemberById: (id: string) => Member | undefined,
  getRelationTypeLabel: (type: string) => string,
  getSubTypeLabel: (type: string, subType?: string) => string,
) => {
  const data = relations.map((r) => {
    const sourceMember = getMemberById(r.sourceId);
    const targetMember = getMemberById(r.targetId);
    return {
      '成员A姓名': sourceMember?.name || '未知',
      '成员A小名': sourceMember?.nickname || '',
      '关系类型': getRelationTypeLabel(r.type),
      '具体关系': r.subType ? getSubTypeLabel(r.type, r.subType) : '',
      '成员B姓名': targetMember?.name || '未知',
      '成员B小名': targetMember?.nickname || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 12 },  // 成员A姓名
    { wch: 10 },  // 成员A小名
    { wch: 12 },  // 关系类型
    { wch: 12 },  // 具体关系
    { wch: 12 },  // 成员B姓名
    { wch: 10 },  // 成员B小名
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '关系列表');
  XLSX.writeFile(workbook, `家族关系列表_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
