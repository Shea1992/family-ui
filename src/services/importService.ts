import * as XLSX from 'xlsx';
import type { MemberFormData, Gender } from '../types/member';
import type { RelationFormData, RelationType, RelationSubType } from '../types/relation';

export interface ImportResult {
  members: MemberFormData[];
  relations: Omit<RelationFormData, 'sourceId' | 'targetId'> & { sourceName: string; targetName: string }[];
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  newMembers: MemberFormData[];
  existingMembers: string[];
  relations: Array<Omit<RelationFormData, 'sourceId' | 'targetId'> & { sourceName: string; targetName: string }>;
  errors: string[];
  warnings: string[];
}

/**
 * 解析 Excel 文件
 */
export const parseExcelFile = (file: File): Promise<XLSX.WorkBook> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        resolve(workbook);
      } catch (error) {
        reject(new Error('解析 Excel 文件失败'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsBinaryString(file);
  });
};

/**
 * 解析成员工作表
 */
const parseMembersSheet = (worksheet: XLSX.WorkSheet): Partial<MemberFormData>[] => {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) {
    return [];
  }

  const headers = jsonData[0];
  const rows = jsonData.slice(1);

  const members: Partial<MemberFormData>[] = [];

  rows.forEach((row, index) => {
    if (!row[0]) return; // 跳过姓名为空的行

    const member: Partial<MemberFormData> = {};

    headers.forEach((header, colIndex) => {
      const value = row[colIndex];

      switch (header.trim()) {
        case '姓名':
          member.name = String(value).trim();
          break;
        case '小名':
          member.nickname = value ? String(value).trim() : undefined;
          break;
        case '性别':
          member.gender = String(value).trim().toLowerCase() as Gender;
          break;
        case '生日':
          if (value) {
            // 处理 Excel 日期格式
            if (typeof value === 'number') {
              const date = XLSX.SSF.parse_date_code(value);
              member.birthday = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            } else {
              member.birthday = String(value).trim();
            }
          }
          break;
        case '工作地':
          member.workplace = value ? String(value).trim() : undefined;
          break;
        case '简介':
          member.bio = value ? String(value).trim() : undefined;
          break;
        case '照片URL':
          member.photo = value ? String(value).trim() : undefined;
          break;
      }
    });

    if (member.name) {
      members.push(member);
    }
  });

  return members;
};

/**
 * 解析关系工作表
 */
const parseRelationsSheet = (worksheet: XLSX.WorkSheet): Array<{
  sourceName: string;
  targetName: string;
  type: RelationType;
  subType?: RelationSubType;
}> => {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) {
    return [];
  }

  const headers = jsonData[0];
  const rows = jsonData.slice(1);

  const relations: Array<{
    sourceName: string;
    targetName: string;
    type: RelationType;
    subType?: RelationSubType;
  }> = [];

  rows.forEach((row) => {
    const relation: Partial<{
      sourceName: string;
      targetName: string;
      type: RelationType;
      subType: RelationSubType;
    }> = {};

    headers.forEach((header, colIndex) => {
      const value = row[colIndex];

      switch (header.trim()) {
        case '成员A姓名':
        case '成员A':
          relation.sourceName = value ? String(value).trim() : '';
          break;
        case '成员B姓名':
        case '成员B':
          relation.targetName = value ? String(value).trim() : '';
          break;
        case '关系类型':
          relation.type = String(value).trim() as RelationType;
          break;
        case '具体关系':
          if (value) {
            relation.subType = String(value).trim() as RelationSubType;
          }
          break;
      }
    });

    if (relation.sourceName && relation.targetName && relation.type) {
      relations.push(relation as Required<typeof relation>);
    }
  });

  return relations;
};

/**
 * 验证成员数据
 */
const validateMembers = (members: Partial<MemberFormData>[]): { valid: MemberFormData[]; errors: string[]; warnings: string[] } => {
  const valid: MemberFormData[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const nameSet = new Set<string>();

  members.forEach((member, index) => {
    const rowNum = index + 2;

    // 验证必填字段
    if (!member.name) {
      errors.push(`第 ${rowNum} 行：姓名不能为空`);
      return;
    }

    // 检查重复姓名
    if (nameSet.has(member.name)) {
      errors.push(`第 ${rowNum} 行：姓名 "${member.name}" 重复`);
      return;
    }
    nameSet.add(member.name);

    // 验证性别
    if (!member.gender) {
      errors.push(`第 ${rowNum} 行："${member.name}" 性别不能为空`);
      return;
    }

    if (!['male', 'female', 'other'].includes(member.gender)) {
      errors.push(`第 ${rowNum} 行："${member.name}" 性别必须是 male/female/other`);
      return;
    }

    // 验证日期格式
    if (member.birthday) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(member.birthday)) {
        warnings.push(`第 ${rowNum} 行："${member.name}" 生日格式不正确，应为 YYYY-MM-DD`);
        delete member.birthday;
      }
    }

    valid.push(member as MemberFormData);
  });

  return { valid, errors, warnings };
};

/**
 * 验证关系数据
 */
const validateRelations = (
  relations: Array<{
    sourceName: string;
    targetName: string;
    type: RelationType;
    subType?: RelationSubType;
  }>,
  memberNames: Set<string>
): {
  valid: Array<Omit<RelationFormData, 'sourceId' | 'targetId'> & { sourceName: string; targetName: string }>;
  errors: string[];
  warnings: string[];
} => {
  const valid: Array<Omit<RelationFormData, 'sourceId' | 'targetId'> & { sourceName: string; targetName: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  relations.forEach((relation, index) => {
    const rowNum = index + 2;

    // 验证成员是否存在
    if (!memberNames.has(relation.sourceName)) {
      errors.push(`第 ${rowNum} 行：成员A "${relation.sourceName}" 不存在`);
      return;
    }

    if (!memberNames.has(relation.targetName)) {
      errors.push(`第 ${rowNum} 行：成员B "${relation.targetName}" 不存在`);
      return;
    }

    // 验证不能是自己
    if (relation.sourceName === relation.targetName) {
      errors.push(`第 ${rowNum} 行：不能为自己添加关系`);
      return;
    }

    // 验证关系类型
    const validTypes: RelationType[] = ['parent-child', 'spouse', 'sibling'];
    if (!validTypes.includes(relation.type)) {
      errors.push(`第 ${rowNum} 行：关系类型必须是 parent-child/spouse/sibling`);
      return;
    }

    // 验证具体关系合法性
    const validSubTypes: Record<RelationType, string[]> = {
      'parent-child': ['father-son', 'father-daughter', 'mother-son', 'mother-daughter'],
      'spouse': ['husband-wife'],
      'sibling': ['brother-brother', 'brother-sister', 'sister-sister'],
    };
    if (relation.subType) {
      const allowed = validSubTypes[relation.type] || [];
      if (!allowed.includes(relation.subType)) {
        const subTypeLabels: Record<string, string> = {
          'father-son': '父子', 'father-daughter': '父女',
          'mother-son': '母子', 'mother-daughter': '母女',
          'husband-wife': '夫妻',
          'brother-brother': '兄弟', 'brother-sister': '兄妹', 'sister-sister': '姐妹',
        };
        const allowedLabels = allowed.map(s => `${subTypeLabels[s]}(${s})`).join('、');
        errors.push(`第 ${rowNum} 行：关系类型为"${relation.type}"时，具体关系只能是：${allowedLabels}`);
        return;
      }
    }

    valid.push(relation);
  });

  return { valid, errors, warnings };
};

/**
 * 导入 Excel 文件
 */
export const importFromExcel = async (
  file: File,
  existingMembers: { name: string }[]
): Promise<ImportPreview> => {
  const workbook = await parseExcelFile(file);

  // 解析成员
  let membersData: Partial<MemberFormData>[] = [];
  const membersSheet = workbook.Sheets['成员列表'] || workbook.Sheets['Members'] || workbook.Sheets[workbook.SheetNames[0]];
  if (membersSheet) {
    membersData = parseMembersSheet(membersSheet);
  }

  // 验证成员
  const { valid: validMembers, errors: memberErrors, warnings: memberWarnings } = validateMembers(membersData);

  // 检查与现有成员的重名
  const existingNames = new Set(existingMembers.map((m) => m.name));
  const newMembers: MemberFormData[] = [];
  const duplicateNames: string[] = [];

  validMembers.forEach((member) => {
    if (existingNames.has(member.name)) {
      duplicateNames.push(member.name);
    } else {
      newMembers.push(member);
    }
  });

  // 解析关系
  let relationsData: Array<{
    sourceName: string;
    targetName: string;
    type: RelationType;
    subType?: RelationSubType;
  }> = [];
  const relationsSheet = workbook.Sheets['关系列表'] || workbook.Sheets['Relations'] || workbook.Sheets[workbook.SheetNames[1]];
  if (relationsSheet) {
    relationsData = parseRelationsSheet(relationsSheet);
  }

  // 验证关系（包括现有成员和新成员）
  const allMemberNames = new Set([...existingNames, ...validMembers.map((m) => m.name)]);
  const { valid: validRelations, errors: relationErrors, warnings: relationWarnings } = validateRelations(
    relationsData,
    allMemberNames
  );

  return {
    newMembers,
    existingMembers: duplicateNames,
    relations: validRelations,
    errors: [...memberErrors, ...relationErrors],
    warnings: [...memberWarnings, ...relationWarnings, ...(duplicateNames.length > 0 ? [`以下成员已存在，将跳过：${duplicateNames.join('、')}`] : [])],
  };
};

/**
 * 下载导入模板（带数据验证下拉选项）
 * 模板文件预生成在 public 目录下，包含关系类型和具体关系的下拉选项
 */
export const downloadTemplate = () => {
  // 优先使用预生成的带数据验证模板
  const templateUrl = '/家族成员导入模板.xlsx';
  const link = document.createElement('a');
  link.href = templateUrl;
  link.download = '家族成员导入模板.xlsx';
  link.click();
};
