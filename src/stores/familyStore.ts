import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Member, MemberFormData } from '../types/member';
import type { Relation, RelationFormData } from '../types/relation';


interface FamilyState {
  // 数据
  members: Member[];
  relations: Relation[];

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

      // 导出数据
      exportData: () => {
        const data = {
          members: get().members,
          relations: get().relations,
        };
        return JSON.stringify(data, null, 2);
      },

      // 导入数据
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.members && Array.isArray(data.members)) {
            set({ members: data.members });
          }
          if (data.relations && Array.isArray(data.relations)) {
            set({ relations: data.relations });
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
      }),
      onRehydrateStorage: () => () => {
        // 不再加载预置数据，初始为空
      },
    }
  )
);
