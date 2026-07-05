// 关系类型常量
export const RELATION_TYPES = {
  PARENT_CHILD: 'parent-child' as const,
  SPOUSE: 'spouse' as const,
  SIBLING: 'sibling' as const,
};

// 关系子类型常量
export const RELATION_SUB_TYPES = {
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
