import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import type { MemberNode } from '../../types/member';
import type { RelationLink } from '../../types/relation';
import { COLORS, FORCE_GRAPH_CONFIG } from '../../constants';

export interface ForceGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  focusOnNode: (nodeId: string) => void;
}

interface ForceGraphProps {
  nodes: MemberNode[];
  links: RelationLink[];
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  collapsedNodeIds?: string[];
  hasChildrenMap?: Record<string, boolean>;
  onNodeClick?: (node: MemberNode | null) => void;
  onNodeDoubleClick?: (node: MemberNode) => void;
  getRelationTypeColor?: (type: string) => string;
  getRelationTypeLabel?: (type: string) => string;
  getSubTypeLabel?: (type: string, subType?: string) => string;
  customRelationTypes?: Array<{ type: string; color: string }>;
}

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(({
  nodes,
  links,
  selectedNodeId,
  highlightedNodeIds = [],
  collapsedNodeIds = [],
  hasChildrenMap = {},
  onNodeClick,
  onNodeDoubleClick,
  getRelationTypeColor: getRelationTypeColorProp,
  getRelationTypeLabel: getRelationTypeLabelProp,
  getSubTypeLabel: getSubTypeLabelProp,
  customRelationTypes = [],
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<any, any> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const simulatedNodesRef = useRef<any[]>([]);
  const nodeElementsRef = useRef<any>(null);

  // 用 ref 持有选中/高亮最新值，主 effect 不依赖它们
  const selectedNodeIdRef = useRef(selectedNodeId);
  const highlightedNodeIdsRef = useRef(highlightedNodeIds);
  const collapsedNodeIdsRef = useRef(collapsedNodeIds);
  const hasChildrenMapRef = useRef(hasChildrenMap);
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);

  // 每次渲染更新 ref
  selectedNodeIdRef.current = selectedNodeId;
  highlightedNodeIdsRef.current = highlightedNodeIds;
  collapsedNodeIdsRef.current = collapsedNodeIds;
  hasChildrenMapRef.current = hasChildrenMap;
  onNodeClickRef.current = onNodeClick;
  onNodeDoubleClickRef.current = onNodeDoubleClick;

  // 获取性别颜色
  const getGenderColor = useCallback((gender: string) => {
    switch (gender) {
      case 'male':
        return COLORS.MALE;
      case 'female':
        return COLORS.FEMALE;
      default:
        return COLORS.OTHER;
    }
  }, []);

  // 获取关系连线颜色
  const getLinkColor = useCallback((type: string) => {
    if (getRelationTypeColorProp) return getRelationTypeColorProp(type);
    switch (type) {
      case 'parent-child':
        return COLORS.PARENT_CHILD;
      case 'spouse':
        return COLORS.SPOUSE;
      case 'sibling':
        return COLORS.SIBLING;
      default: {
        const custom = customRelationTypes.find((c) => c.type === type);
        return custom?.color || '#999';
      }
    }
  }, [getRelationTypeColorProp, customRelationTypes]);

  // 获取关系类型显示文本
  const getRelationLabel = useCallback((type: string, subType?: string) => {
    if (subType && getSubTypeLabelProp) return getSubTypeLabelProp(type, subType);
    if (!subType && getRelationTypeLabelProp) return getRelationTypeLabelProp(type);

    const subTypeMap: Record<string, string> = {
      'father-son': '父子',
      'father-daughter': '父女',
      'mother-son': '母子',
      'mother-daughter': '母女',
      'husband-wife': '夫妻',
      'brother-brother': '兄弟',
      'brother-sister': '兄妹',
      'sister-sister': '姐妹',
    };

    if (subType && subTypeMap[subType]) {
      return subTypeMap[subType];
    }

    const typeMap: Record<string, string> = {
      'parent-child': '父母',
      'spouse': '夫妻',
      'sibling': '兄弟',
    };

    return typeMap[type] || type;
  }, [getSubTypeLabelProp, getRelationTypeLabelProp]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const svg = d3.select(svgRef.current!);
      const zoomBehavior = zoomRef.current;
      if (!zoomBehavior) return;
      svg.transition().duration(300).call(zoomBehavior.scaleBy as any, 1.4);
    },
    zoomOut: () => {
      const svg = d3.select(svgRef.current!);
      const zoomBehavior = zoomRef.current;
      if (!zoomBehavior) return;
      svg.transition().duration(300).call(zoomBehavior.scaleBy as any, 1 / 1.4);
    },
    fitToScreen: () => {
      const svg = d3.select(svgRef.current!);
      const g = gRef.current;
      const zoomBehavior = zoomRef.current;
      if (!g || !zoomBehavior || !containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const bounds = (g.node() as SVGGElement).getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;

      const fullWidth = bounds.width + 80;
      const fullHeight = bounds.height + 80;
      const midX = bounds.x + bounds.width / 2;
      const midY = bounds.y + bounds.height / 2;

      const scale = Math.min(width / fullWidth, height / fullHeight, 2);
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-midX, -midY);

      svg.transition().duration(500).call(zoomBehavior.transform as any, transform);
    },
    focusOnNode: (nodeId: string) => {
      const svg = d3.select(svgRef.current!);
      const zoomBehavior = zoomRef.current;
      const container = containerRef.current;
      if (!zoomBehavior || !container) return;

      const target = simulatedNodesRef.current.find((n: any) => n.id === nodeId);
      if (!target || target.x == null || target.y == null) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // 确保聚焦时节点以可读大小显示，最小缩放 1x，最大 2x
      const currentTransform = d3.zoomTransform(svgRef.current!);
      const scale = Math.min(Math.max(currentTransform.k, 1), 2);

      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-target.x, -target.y);

      svg.transition().duration(600).call(zoomBehavior.transform as any, transform);
    },
  }), []);

  // ==================== 主 effect：仅依赖结构数据 ====================
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // ---- 定义渐变与滤镜 ----
    const defs = svg.append('defs');

    const bgGradient = defs.append('radialGradient')
      .attr('id', 'bg-gradient')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '70%');
    bgGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1a1a2e');
    bgGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0d0d1a');

    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const strongGlowFilter = defs.append('filter')
      .attr('id', 'strong-glow')
      .attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
    strongGlowFilter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur');
    const feMerge2 = strongGlowFilter.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    ['male', 'female', 'other'].forEach((gender) => {
      const color = getGenderColor(gender);
      const gradient = defs.append('radialGradient')
        .attr('id', `glow-gradient-${gender}`)
        .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.6);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
    });

    defs.append('marker')
      .attr('id', 'arrow-parent-child')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', FORCE_GRAPH_CONFIG.NODE_RADIUS + 12)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', COLORS.PARENT_CHILD)
      .attr('opacity', 0.8);

    // ---- 背景 ----
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#bg-gradient)');

    const gridPattern = defs.append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    gridPattern.append('circle').attr('cx', 20).attr('cy', 20).attr('r', 0.5).attr('fill', 'rgba(255,255,255,0.08)');
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#grid-pattern)');

    // ---- 容器组 ----
    const g = svg.append('g');
    gRef.current = g;

    // ---- 节点与连线数据 ----
    const simulatedNodes = nodes.map(n => ({ ...n }));
    const simulatedLinks = links.map(l => ({ ...l }));
    simulatedNodesRef.current = simulatedNodes;

    // ---- 力仿真 ----
    const simulation = d3.forceSimulation(simulatedNodes as any)
      .force('link', d3.forceLink(simulatedLinks).id((d: any) => d.id).distance(FORCE_GRAPH_CONFIG.LINK_DISTANCE).strength(0.6))
      .force('charge', d3.forceManyBody().strength(FORCE_GRAPH_CONFIG.CHARGE_STRENGTH).distanceMin(30).distanceMax(800))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(FORCE_GRAPH_CONFIG.CENTER_STRENGTH))
      .force('collision', d3.forceCollide().radius(FORCE_GRAPH_CONFIG.COLLISION_RADIUS).strength(0.8))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03));

    simulationRef.current = simulation;

    // ---- 渲染连线 ----
    const linkGroup = g.append('g').attr('class', 'links');

    const linkElements = linkGroup
      .selectAll('.link')
      .data(simulatedLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', (d: any) => getLinkColor(d.type))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => {
        if (d.type === 'spouse') return '8,4';
        if (!['parent-child', 'spouse', 'sibling'].includes(d.type)) return '4,4';
        return '0';
      })
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', (d: any) => d.type === 'parent-child' ? 'url(#arrow-parent-child)' : '');

    const flowParticles = linkGroup
      .selectAll('.flow-particle')
      .data(simulatedLinks)
      .join('circle')
      .attr('class', 'flow-particle')
      .attr('r', 2.5)
      .attr('fill', (d: any) => getLinkColor(d.type))
      .attr('opacity', 0.7);

    const linkLabels = g.append('g')
      .selectAll('.link-label')
      .data(simulatedLinks)
      .join('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 6px rgba(0,0,0,0.8)')
      .text((d: any) => getRelationLabel(d.type, d.subType));

    // ---- 渲染节点 ----
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeElements = nodeGroup
      .selectAll('.node')
      .data(simulatedNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab');

    nodeElementsRef.current = nodeElements;

    // 照片 pattern
    simulatedNodes.forEach((node: any) => {
      if (node.photo) {
        const patternId = `photo-${node.id}`;
        if (defs.select(`#${patternId}`).empty()) {
          defs.append('pattern')
            .attr('id', patternId)
            .attr('x', 0).attr('y', 0).attr('width', 1).attr('height', 1)
            .attr('patternContentUnits', 'objectBoundingBox')
            .append('image')
            .attr('href', node.photo)
            .attr('x', 0).attr('y', 0).attr('width', 1).attr('height', 1)
            .attr('preserveAspectRatio', 'xMidYMid slice');
        }
      }
    });

    // 节点外层光晕
    nodeElements
      .append('circle')
      .attr('class', 'node-glow')
      .attr('r', FORCE_GRAPH_CONFIG.NODE_RADIUS + 10)
      .attr('fill', (d: any) => `url(#glow-gradient-${d.gender === 'male' ? 'male' : d.gender === 'female' ? 'female' : 'other'})`)
      .attr('opacity', 0.3);

    // 节点主圆形 — 初始样式用 ref 值
    const curSelected = selectedNodeIdRef.current;
    const curHighlighted = highlightedNodeIdsRef.current;

    nodeElements
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', FORCE_GRAPH_CONFIG.NODE_RADIUS)
      .attr('fill', (d: any) => {
        if (d.photo) return `url(#photo-${d.id})`;
        return getGenderColor(d.gender);
      })
      .attr('stroke', (d: any) => {
        if (d.id === curSelected) return '#fff';
        if (curHighlighted.includes(d.id)) return '#ffd700';
        return 'rgba(255,255,255,0.3)';
      })
      .attr('stroke-width', (d: any) =>
        d.id === curSelected || curHighlighted.includes(d.id) ? 3 : 1.5
      )
      .attr('filter', (d: any) => {
        if (d.id === curSelected || curHighlighted.includes(d.id)) return 'url(#strong-glow)';
        return 'url(#glow)';
      });

    // 节点文本标签
    nodeElements
      .append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', FORCE_GRAPH_CONFIG.NODE_RADIUS + 20)
      .attr('font-size', 13)
      .attr('font-weight', '600')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.6)');

    // 展开/折叠指示器
    const curCollapsed = collapsedNodeIdsRef.current;
    const curHasChildren = hasChildrenMapRef.current;

    const indicatorGroup = nodeElements
      .filter((d: any) => curHasChildren[d.id])
      .append('g')
      .attr('class', 'collapse-indicator')
      .attr('transform', `translate(${FORCE_GRAPH_CONFIG.NODE_RADIUS - 4}, -${FORCE_GRAPH_CONFIG.NODE_RADIUS - 4})`)
      .style('cursor', 'pointer');

    indicatorGroup
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'rgba(0,0,0,0.6)')
      .attr('stroke', '#1890ff')
      .attr('stroke-width', 1.5);

    indicatorGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .attr('fill', '#1890ff')
      .style('pointer-events', 'none')
      .text((d: any) => curCollapsed.includes(d.id) ? '+' : '-');

    // ---- 拖动行为 ----
    const drag = d3.drag<any, any>()
      .on('start', (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.closest('.node'))
          .style('cursor', 'grabbing')
          .raise();
      })
      .on('drag', (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
      });

    nodeElements.call(drag);

    // ---- 节点 hover ----
    nodeElements
      .on('mouseenter', (event: any, d: any) => {
        hoveredNodeIdRef.current = d.id;
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(d.id);

        linkElements
          .attr('stroke-opacity', (l: any) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return sourceId === d.id || targetId === d.id ? 0.9 : 0.15;
          })
          .attr('stroke-width', (l: any) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return sourceId === d.id || targetId === d.id ? 3 : 1.5;
          });

        flowParticles.attr('opacity', (l: any) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 0.9 : 0.1;
        });

        linkLabels.attr('opacity', (l: any) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.15;
        });

        simulatedLinks.forEach((l: any) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sourceId === d.id) connectedNodeIds.add(targetId);
          if (targetId === d.id) connectedNodeIds.add(sourceId);
        });

        nodeElements.select('.node-glow')
          .attr('opacity', (n: any) => connectedNodeIds.has(n.id) ? 0.5 : 0.1);
        nodeElements.select('.node-circle')
          .attr('opacity', (n: any) => connectedNodeIds.has(n.id) ? 1 : 0.3);
        nodeElements.select('text')
          .attr('opacity', (n: any) => connectedNodeIds.has(n.id) ? 1 : 0.2);
      })
      .on('mouseleave', () => {
        hoveredNodeIdRef.current = null;
        linkElements.attr('stroke-opacity', 0.5).attr('stroke-width', 2);
        flowParticles.attr('opacity', 0.7);
        linkLabels.attr('opacity', 1);
        nodeElements.select('.node-glow').attr('opacity', 0.3);
        nodeElements.select('.node-circle').attr('opacity', 1);
        nodeElements.select('text').attr('opacity', 1);
      });

    // ---- 流动粒子动画 ----
    let animFrame: number;
    let tick = 0;

    const animateFlowParticles = () => {
      tick += 0.005;
      flowParticles
        .attr('cx', (d: any) => {
          const sx = d.source?.x || 0;
          const tx = d.target?.x || 0;
          const t = (Math.sin(tick * 3 + d.source?.x * 0.01) + 1) / 2;
          return sx + (tx - sx) * t;
        })
        .attr('cy', (d: any) => {
          const sy = d.source?.y || 0;
          const ty = d.target?.y || 0;
          const t = (Math.sin(tick * 3 + d.source?.x * 0.01) + 1) / 2;
          return sy + (ty - sy) * t;
        });
      animFrame = requestAnimationFrame(animateFlowParticles);
    };

    // ---- tick 更新 ----
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source?.x || 0)
        .attr('y1', (d: any) => d.source?.y || 0)
        .attr('x2', (d: any) => d.target?.x || 0)
        .attr('y2', (d: any) => d.target?.y || 0);

      linkLabels
        .attr('x', (d: any) => ((d.source?.x || 0) + (d.target?.x || 0)) / 2)
        .attr('y', (d: any) => ((d.source?.y || 0) + (d.target?.y || 0)) / 2 - 5)
        .attr('transform', (d: any) => {
          const x1 = d.source?.x || 0;
          const y1 = d.source?.y || 0;
          const x2 = d.target?.x || 0;
          const y2 = d.target?.y || 0;
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          if (Math.abs(angle) > 45 && Math.abs(angle) < 135) {
            return `rotate(${angle > 0 ? angle - 90 : angle + 90},${midX},${midY})`;
          }
          return '';
        });

      nodeElements.attr('transform', (d: any) =>
        `translate(${d.x || 0},${d.y || 0})`
      );
    });

    animateFlowParticles();

    // ---- 缩放行为 ----
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);

    // ---- 点击事件 ----
    svg.on('click', () => {
      onNodeClickRef.current?.(null);
    });

    nodeElements
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onNodeClickRef.current?.(d);
      })
      .on('dblclick', (event: any, d: any) => {
        event.stopPropagation();
        onNodeDoubleClickRef.current?.(d);
      });

    indicatorGroup
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onNodeDoubleClickRef.current?.(d);
      });

    return () => {
      simulation.stop();
      simulationRef.current = null;
      nodeElementsRef.current = null;
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  // 仅当结构数据变化时重建图谱
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, getGenderColor, getLinkColor, getRelationLabel]);

  // ==================== 独立 effect：响应选中/高亮变化 ====================
  useEffect(() => {
    const ne = nodeElementsRef.current;
    if (!ne) return;

    const selId = selectedNodeId;
    const hlIds = highlightedNodeIds;

    ne.select('.node-circle')
      .attr('stroke', (d: any) => {
        if (d.id === selId) return '#fff';
        if (hlIds.includes(d.id)) return '#ffd700';
        return 'rgba(255,255,255,0.3)';
      })
      .attr('stroke-width', (d: any) =>
        d.id === selId || hlIds.includes(d.id) ? 3 : 1.5
      )
      .attr('filter', (d: any) => {
        if (d.id === selId || hlIds.includes(d.id)) return 'url(#strong-glow)';
        return 'url(#glow)';
      });
  }, [selectedNodeId, highlightedNodeIds]);

  // ==================== 独立 effect：响应折叠变化 ====================
  useEffect(() => {
    const ne = nodeElementsRef.current;
    if (!ne) return;

    ne.select('.collapse-indicator text')
      .text((d: any) => collapsedNodeIds.includes(d.id) ? '+' : '-');
  }, [collapsedNodeIds]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#0d0d1a' }}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});
