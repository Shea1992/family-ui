// 关系类型定义

// 预置关系类型
export type BuiltinRelationType = 'parent-child' | 'spouse' | 'sibling';

// 支持自定义关系类型
export type RelationType = string;

// 预置关系子类型
export type ParentChildSubType = 'father-son' | 'father-daughter' | 'mother-son' | 'mother-daughter';
export type SpouseSubType = 'husband-wife';
export type SiblingSubType = 'brother-brother' | 'brother-sister' | 'sister-sister';

// 支持自定义子类型
export type RelationSubType = string;

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  subType?: RelationSubType;
  createdAt: string;
}

// 用于 D3 的连线类型
export interface RelationLink extends Omit<Relation, 'sourceId' | 'targetId'> {
  source: string | MemberNode;
  target: string | MemberNode;
}

// 关系表单数据（创建）
export interface RelationFormData {
  sourceId: string;
  targetId: string;
  type: RelationType;
  subType?: RelationSubType;
}

// 自定义关系类型定义
export interface CustomRelationTypeDefinition {
  type: string;          // 类型标识，如 'in-law'
  label: string;         // 显示名称，如 '亲家'
  color: string;         // 连线颜色，如 '#8b5cf6'
  subTypes: Array<{
    value: string;       // 子类型标识，如 'father-in-law-son'
    label: string;       // 子类型显示名，如 '岳父-女婿'
  }>;
}

import type { MemberNode } from './member';
