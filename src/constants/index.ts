// 关系类型常量（预置）
export const BUILTIN_RELATION_TYPES = {
  PARENT_CHILD: 'parent-child' as const,
  SPOUSE: 'spouse' as const,
  SIBLING: 'sibling' as const,
};

// 关系子类型常量（预置）
export const BUILTIN_RELATION_SUB_TYPES = {
  // 父子关系
  FATHER_SON: 'father-son' as const,
  FATHER_DAUGHTER: 'father-daughter' as const,
  MOTHER_SON: 'mother-son' as const,
  MOTHER_DAUGHTER: 'mother-daughter' as const,

  // 夫妻关系
  HUSBAND_WIFE: 'husband-wife' as const,

  // 兄弟姐妹关系
  BROTHER_BROTHER: 'brother-brother' as const,
  BROTHER_SISTER: 'brother-sister' as const,
  SISTER_SISTER: 'sister-sister' as const,
};

// 预置关系类型的子类型选项
export const BUILTIN_SUB_TYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  'parent-child': [
    { value: 'father-son', label: '父子' },
    { value: 'father-daughter', label: '父女' },
    { value: 'mother-son', label: '母子' },
    { value: 'mother-daughter', label: '母女' },
  ],
  'spouse': [{ value: 'husband-wife', label: '夫妻' }],
  'sibling': [
    { value: 'brother-brother', label: '兄弟' },
    { value: 'brother-sister', label: '兄妹' },
    { value: 'sister-sister', label: '姐妹' },
  ],
};

// 预置关系类型的中文标签
export const BUILTIN_RELATION_TYPE_LABELS: Record<string, string> = {
  'parent-child': '血缘关系',
  'spouse': '婚姻关系',
  'sibling': '兄弟姐妹',
};

// 预置关系子类型的中文标签
export const BUILTIN_RELATION_SUB_TYPE_LABELS: Record<string, string> = {
  'father-son': '父子',
  'father-daughter': '父女',
  'mother-son': '母子',
  'mother-daughter': '母女',
  'husband-wife': '夫妻',
  'brother-brother': '兄弟',
  'brother-sister': '兄妹',
  'sister-sister': '姐妹',
};

// 自定义关系类型的预设颜色池
export const CUSTOM_RELATION_COLORS = [
  '#8b5cf6', // 紫色
  '#06b6d4', // 青色
  '#f59e0b', // 琥珀
  '#10b981', // 翠绿
  '#ec4899', // 粉红
  '#6366f1', // 靛蓝
  '#14b8a6', // 蓝绿
  '#f97316', // 橙色
  '#84cc16', // 草绿
  '#a855f7', // 兰花紫
];

// 性别常量
export const GENDERS = {
  MALE: 'male' as const,
  FEMALE: 'female' as const,
  OTHER: 'other' as const,
};

// 颜色配置
export const COLORS = {
  // 性别颜色
  MALE: '#1890ff',      // 蓝色
  FEMALE: '#eb2f96',    // 粉色
  OTHER: '#722ed1',     // 紫色

  // 关系连线颜色
  PARENT_CHILD: '#52c41a',  // 绿色 - 血缘
  SPOUSE: '#f5222d',        // 红色 - 婚姻
  SIBLING: '#faad14',       // 橙色 - 兄弟姐妹

  // 选中/高亮颜色
  SELECTED: '#1890ff',
  HIGHLIGHTED: '#faad14',

  // 背景色
  BACKGROUND: '#f0f2f5',
  NODE_STROKE: '#fff',
};

// 力导向图配置 - 优化间距和交互
export const FORCE_GRAPH_CONFIG = {
  NODE_RADIUS: 28,
  LINK_DISTANCE: 220,        // 增大连线长度，减少紧凑感
  CHARGE_STRENGTH: -800,     // 增大斥力，节点更分散
  COLLISION_RADIUS: 50,      // 增大碰撞半径，防止重叠
  CENTER_STRENGTH: 0.03,     // 中心引力略降，让布局更舒展
};

// 缩放配置
export const ZOOM_CONFIG = {
  MIN_SCALE: 0.1,
  MAX_SCALE: 4,
  DEFAULT_SCALE: 1,
};
