// 成员类型定义
export type Gender = 'male' | 'female' | 'other';

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  birthday?: string;
  workplace?: string;
  photo?: string;              // base64 或 URL
  bio?: string;
  gender: Gender;
  createdAt: string;
  updatedAt: string;
}

// 用于 D3 的节点类型
export interface MemberNode extends Member {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;          // 固定位置
  fy?: number | null;
}

// 成员表单数据（创建/编辑）
export interface MemberFormData {
  name: string;
  nickname?: string;
  birthday?: string;
  workplace?: string;
  photo?: string;
  bio?: string;
  gender: Gender;
}
