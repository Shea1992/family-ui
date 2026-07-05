// 关系类型定义

export type RelationType = 'parent-child' | 'spouse' | 'sibling';

// 关系子类型
export type ParentChildSubType = 'father-son' | 'father-daughter' | 'mother-son' | 'mother-daughter';
export type SpouseSubType = 'husband-wife';
export type SiblingSubType = 'brother-brother' | 'brother-sister' | 'sister-sister';

export type RelationSubType = ParentChildSubType | SpouseSubType | SiblingSubType;

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

import type { MemberNode } from './member';
