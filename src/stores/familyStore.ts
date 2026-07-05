import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Member, MemberFormData } from '../types/member';
import type { Relation, RelationFormData, CustomRelationTypeDefinition } from '../types/relation';
import { BUILTIN_RELATION_TYPE_LABELS, BUILTIN_RELATION_SUB_TYPE_LABELS, CUSTOM_RELATION_COLORS } from '../constants';


interface FamilyState {
  // 数据
  members: Member[];
  relations: Relation[];

  // 自定义关系类型
  customRelationTypes: CustomRelationTypeDefinition[];

  // 选中状态
  selectedMemberId: string | null;
  highlightedMemberIds: string[];

  // 折叠状态 - 存储被折叠的节点ID
  collapsedNodeIds: string[];

  // 视图状态
  zoomTransform: { x: number; y: number; k: number };

  // 操作方法 - 成员
  addMember: (data: MemberFormData) => Member;
  updateMember: (id: string, data: Partial<MemberFormData>) => void;
  deleteMember: (id: string) => void;

  // 操作方法 - 关系
  addRelation: (data: RelationFormData) => Relation;
  deleteRelation: (id: string) => void;

  // 操作方法 - 自定义关系类型
  addCustomRelationType: (definition: Omit<CustomRelationTypeDefinition, 'color'> & { color?: string }) => void;
  updateCustomRelationType: (type: string, updates: Partial<CustomRelationTypeDefinition>) => void;
  deleteCustomRelationType: (type: string) => void;
  getAllRelationTypes: () => Array<{ value: string; label: string; isCustom: boolean; color: string; subTypes: Array<{ value: string; label: string }> }>;
  getRelationTypeColor: (type: string) => string;
  getRelationTypeLabel: (type: string) => string;
  getSubTypeLabel: (type: string, subType?: string) => string;
  getSubTypeOptions: (type: string) => Array<{ value: string; label: string }>;

  // 操作方法 - 选中
  setSelectedMember: (id: string | null) => void;
  setHighlightedMembers: (ids: string[]) => void;

  // 操作方法 - 折叠
  toggleNodeCollapse: (id: string) => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isNodeCollapsed: (id: string) => boolean;
  getDescendantIds: (id: string) => string[];

  // 操作方法 - 视图
  setZoomTransform: (transform: { x: number; y: number; k: number }) => void;

  // 查询方法
  getMemberById: (id: string) => Member | undefined;
  getMemberRelations: (memberId: string) => Relation[];
  getRelatedMembers: (memberId: string) => Member[];
  searchMembers: (keyword: string) => Member[];

  // 导入导出
  exportData: () => string;
  importData: (json: string) => void;
}

const STORAGE_KEY = 'family-data-v1';

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      // 初始数据
      members: [],
      relations: [],
      customRelationTypes: [],
      selectedMemberId: null,
      highlightedMemberIds: [],
      collapsedNodeIds: [],
      zoomTransform: { x: 0, y: 0, k: 1 },

      // 添加成员
      addMember: (data) => {
        const now = new Date().toISOString();
        const newMember: Member = {
          id: uuidv4(),
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ members: [...state.members, newMember] }));
        return newMember;
      },

      // 更新成员
      updateMember: (id, data) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id
              ? { ...m, ...data, updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      // 删除成员
      deleteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          relations: state.relations.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          ),
          selectedMemberId: state.selectedMemberId === id ? null : state.selectedMemberId,
        }));
      },

      // 添加关系
      addRelation: (data) => {
        const now = new Date().toISOString();
        const newRelation: Relation = {
          id: uuidv4(),
          ...data,
          createdAt: now,
        };
        set((state) => ({ relations: [...state.relations, newRelation] }));
        return newRelation;
      },

      // 删除关系
      deleteRelation: (id) => {
        set((state) => ({
          relations: state.relations.filter((r) => r.id !== id),
        }));
      },

      // 添加自定义关系类型
      addCustomRelationType: (definition) => {
        const colorIndex = get().customRelationTypes.length % CUSTOM_RELATION_COLORS.length;
        const newDef: CustomRelationTypeDefinition = {
          ...definition,
          color: definition.color || CUSTOM_RELATION_COLORS[colorIndex],
        };
        set((state) => ({
          customRelationTypes: [...state.customRelationTypes, newDef],
        }));
      },

      // 更新自定义关系类型
      updateCustomRelationType: (type, updates) => {
        set((state) => ({
          customRelationTypes: state.customRelationTypes.map((c) =>
            c.type === type ? { ...c, ...updates } : c
          ),
        }));
      },

      // 删除自定义关系类型（同时删除使用该类型的关系）
      deleteCustomRelationType: (type) => {
        set((state) => ({
          customRelationTypes: state.customRelationTypes.filter((c) => c.type !== type),
          relations: state.relations.filter((r) => r.type !== type),
        }));
      },

      // 获取所有关系类型（预置 + 自定义）
      getAllRelationTypes: () => {
        const builtin = Object.entries(BUILTIN_RELATION_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
          isCustom: false,
          color: value === 'parent-child' ? '#52c41a' : value === 'spouse' ? '#f5222d' : value === 'sibling' ? '#faad14' : '#999',
          subTypes: Object.entries(BUILTIN_RELATION_SUB_TYPE_LABELS)
            .filter(([k]) => {
              if (value === 'parent-child') return ['father-son', 'father-daughter', 'mother-son', 'mother-daughter'].includes(k);
              if (value === 'spouse') return k === 'husband-wife';
              if (value === 'sibling') return ['brother-brother', 'brother-sister', 'sister-sister'].includes(k);
              return false;
            })
            .map(([v, l]) => ({ value: v, label: l })),
        }));
        const custom = get().customRelationTypes.map((c) => ({
          value: c.type,
          label: c.label,
          isCustom: true,
          color: c.color,
          subTypes: c.subTypes,
        }));
        return [...builtin, ...custom];
      },

      // 获取关系类型颜色
      getRelationTypeColor: (type) => {
        switch (type) {
          case 'parent-child': return '#52c41a';
          case 'spouse': return '#f5222d';
          case 'sibling': return '#faad14';
          default: {
            const custom = get().customRelationTypes.find((c) => c.type === type);
            return custom?.color || '#999';
          }
        }
      },

      // 获取关系类型标签
      getRelationTypeLabel: (type) => {
        if (BUILTIN_RELATION_TYPE_LABELS[type]) return BUILTIN_RELATION_TYPE_LABELS[type];
        const custom = get().customRelationTypes.find((c) => c.type === type);
        return custom?.label || type;
      },

      // 获取子类型标签
      getSubTypeLabel: (type, subType) => {
        if (!subType) return get().getRelationTypeLabel(type);
        if (BUILTIN_RELATION_SUB_TYPE_LABELS[subType]) return BUILTIN_RELATION_SUB_TYPE_LABELS[subType];
        const custom = get().customRelationTypes.find((c) => c.type === type);
        if (custom) {
          const sub = custom.subTypes.find((s) => s.value === subType);
          if (sub) return sub.label;
        }
        return subType;
      },

      // 获取子类型选项
      getSubTypeOptions: (type) => {
        const builtinOptions: Record<string, Array<{ value: string; label: string }>> = {
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
        if (builtinOptions[type]) return builtinOptions[type];
        const custom = get().customRelationTypes.find((c) => c.type === type);
        return custom?.subTypes || [];
      },

      // 设置选中成员
      setSelectedMember: (id) => {
        set({ selectedMemberId: id });
      },

      // 设置高亮成员
      setHighlightedMembers: (ids) => {
        set({ highlightedMemberIds: ids });
      },

      // 切换节点折叠状态
      toggleNodeCollapse: (id) => {
        set((state) => {
          const isCollapsed = state.collapsedNodeIds.includes(id);
          if (isCollapsed) {
            return { collapsedNodeIds: state.collapsedNodeIds.filter((cid) => cid !== id) };
          } else {
            return { collapsedNodeIds: [...state.collapsedNodeIds, id] };
          }
        });
      },

      // 展开节点
      expandNode: (id) => {
        set((state) => ({
          collapsedNodeIds: state.collapsedNodeIds.filter((cid) => cid !== id),
        }));
      },

      // 折叠节点
      collapseNode: (id) => {
        set((state) => {
          if (state.collapsedNodeIds.includes(id)) return {};
          return { collapsedNodeIds: [...state.collapsedNodeIds, id] };
        });
      },

      // 展开所有节点
      expandAll: () => {
        set({ collapsedNodeIds: [] });
      },

      // 折叠所有节点
      collapseAll: () => {
        set((state) => {
          // 获取所有有后代的节点
          const nodesWithDescendants = new Set<string>();
          state.relations.forEach((r) => {
            if (r.type === 'parent-child') {
              nodesWithDescendants.add(r.sourceId);
            }
          });
          return { collapsedNodeIds: Array.from(nodesWithDescendants) };
        });
      },

      // 检查节点是否已折叠
      isNodeCollapsed: (id) => {
        return get().collapsedNodeIds.includes(id);
      },

      // 获取节点的所有后代ID
      getDescendantIds: (id) => {
        const descendants: string[] = [];
        const visited = new Set<string>();

        const findDescendants = (memberId: string) => {
          if (visited.has(memberId)) return;
          visited.add(memberId);

          const children = get().relations.filter(
            (r) => r.sourceId === memberId && r.type === 'parent-child'
          );

          children.forEach((r) => {
            descendants.push(r.targetId);
            findDescendants(r.targetId);
          });
        };

        findDescendants(id);
        return descendants;
      },

      // 设置视图变换
      setZoomTransform: (transform) => {
        set({ zoomTransform: transform });
      },

      // 根据 ID 获取成员
      getMemberById: (id) => {
        return get().members.find((m) => m.id === id);
      },

      // 获取成员的关系
      getMemberRelations: (memberId) => {
        return get().relations.filter(
          (r) => r.sourceId === memberId || r.targetId === memberId
        );
      },

      // 获取相关成员
      getRelatedMembers: (memberId) => {
        const relations = get().getMemberRelations(memberId);
        const relatedIds = relations.map((r) =>
          r.sourceId === memberId ? r.targetId : r.sourceId
        );
        return get().members.filter((m) => relatedIds.includes(m.id));
      },

      // 搜索成员
      searchMembers: (keyword) => {
        if (!keyword.trim()) return [];
        const lowerKeyword = keyword.toLowerCase();
        return get().members.filter(
          (m) =>
            m.name.toLowerCase().includes(lowerKeyword) ||
            m.nickname?.toLowerCase().includes(lowerKeyword)
        );
      },

      // 导出数据（包含自定义关系类型）
      exportData: () => {
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          members: get().members,
          relations: get().relations,
          customRelationTypes: get().customRelationTypes,
        };
        return JSON.stringify(data, null, 2);
      },

      // 导入数据（包含自定义关系类型）
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          const updates: Partial<FamilyState> = {};
          if (data.members && Array.isArray(data.members)) {
            updates.members = data.members;
          }
          if (data.relations && Array.isArray(data.relations)) {
            updates.relations = data.relations;
          }
          // 支持 v1 格式的 customRelationTypes
          if (data.customRelationTypes && Array.isArray(data.customRelationTypes)) {
            updates.customRelationTypes = data.customRelationTypes;
          }
          if (Object.keys(updates).length > 0) {
            set(updates as any);
          }
        } catch (e) {
          console.error('Failed to import data:', e);
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        members: state.members,
        relations: state.relations,
        collapsedNodeIds: state.collapsedNodeIds,
        customRelationTypes: state.customRelationTypes,
      }),
      onRehydrateStorage: () => (state) => {
        // localStorage 中无数据时，自动从云端 data.json 拉取
        if (state && state.members.length === 0 && state.relations.length === 0) {
          fetch('https://raw.githubusercontent.com/Shea1992/family-ui/dist/data.json', {
            cache: 'no-cache',
          })
            .then((res) => {
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return res.json();
            })
            .then((data) => {
              if (data.members?.length || data.relations?.length || data.customRelationTypes?.length) {
                const updates: Partial<FamilyState> = {};
                if (data.members && Array.isArray(data.members)) updates.members = data.members;
                if (data.relations && Array.isArray(data.relations)) updates.relations = data.relations;
                if (data.customRelationTypes && Array.isArray(data.customRelationTypes)) updates.customRelationTypes = data.customRelationTypes;
                if (Object.keys(updates).length > 0) {
                  useFamilyStore.getState().importData(JSON.stringify(data));
                  console.log('从云端自动加载数据:', (data.members || []).length, '个成员,', (data.relations || []).length, '条关系');
                }
              }
            })
            .catch((e) => {
              console.warn('从云端自动加载数据失败:', e.message);
            });
        }
      },
    }
  )
);
