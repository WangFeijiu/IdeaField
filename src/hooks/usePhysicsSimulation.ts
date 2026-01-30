import { useEffect, useRef, useCallback } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceCenter
} from 'd3-force';
import type {
  Simulation,
  SimulationNodeDatum,
  ForceLink
} from 'd3-force';
import type { IdeaNode, IdeaEdge } from '@/types';
import { PHYSICS_CONFIG } from '@/types';

// 扩展 SimulationNodeDatum 以匹配 IdeaNode
interface PhysicsNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius: number;
  fx?: number | null;
  fy?: number | null;
}

interface PhysicsEdge {
  source: string | PhysicsNode;
  target: string | PhysicsNode;
}

interface UsePhysicsSimulationProps {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  canvasWidth: number;
  canvasHeight: number;
  onNodeUpdate: (id: string, x: number, y: number, vx: number, vy: number) => void;
  enabled?: boolean;
}

export function usePhysicsSimulation({
  nodes,
  edges,
  canvasWidth,
  canvasHeight,
  onNodeUpdate,
  enabled = true
}: UsePhysicsSimulationProps) {
  const simulationRef = useRef<Simulation<PhysicsNode, PhysicsEdge> | null>(null);
  const nodesRef = useRef<Map<string, PhysicsNode>>(new Map());
  const isRunningRef = useRef<boolean>(false);

  // 将 IdeaNode 转换为 PhysicsNode
  const convertToPhysicsNode = useCallback((node: IdeaNode): PhysicsNode => ({
    id: node.id,
    x: node.x,
    y: node.y,
    vx: 0,
    vy: 0,
    radius: node.radius,
    fx: node.status === 'fruit' ? node.x : null,  // Fruit 节点位置锁定
    fy: node.status === 'fruit' ? node.y : null
  }), []);

  // 初始化或更新模拟
  useEffect(() => {
    if (!enabled) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        isRunningRef.current = false;
      }
      return;
    }

    // 创建新的节点映射
    const newNodesMap = new Map<string, PhysicsNode>();
    const physicsNodes: PhysicsNode[] = [];

    nodes.forEach((node) => {
      const existingNode = nodesRef.current.get(node.id);
      
      if (existingNode) {
        // 更新现有节点
        existingNode.x = node.x;
        existingNode.y = node.y;
        existingNode.radius = node.radius;
        existingNode.fx = node.status === 'fruit' ? node.x : null;
        existingNode.fy = node.status === 'fruit' ? node.y : null;
        newNodesMap.set(node.id, existingNode);
        physicsNodes.push(existingNode);
      } else {
        // 创建新节点
        const newNode = convertToPhysicsNode(node);
        newNodesMap.set(node.id, newNode);
        physicsNodes.push(newNode);
      }
    });

    nodesRef.current = newNodesMap;

    // 创建边
    const physicsEdges: PhysicsEdge[] = edges
      .filter((edge) => {
        const sourceExists = newNodesMap.has(edge.sourceId);
        const targetExists = newNodesMap.has(edge.targetId);
        return sourceExists && targetExists;
      })
      .map((edge) => ({
        source: edge.sourceId,
        target: edge.targetId
      }));

    // 创建或更新模拟
    if (!simulationRef.current) {
      const simulation = forceSimulation<PhysicsNode>(physicsNodes)
        .force(
          'charge',
          forceManyBody()
            .strength(PHYSICS_CONFIG.forceManyBody.strength)
            .distanceMin(PHYSICS_CONFIG.forceManyBody.distanceMin)
            .distanceMax(PHYSICS_CONFIG.forceManyBody.distanceMax)
        )
        .force(
          'link',
          forceLink<PhysicsNode, PhysicsEdge>(physicsEdges)
            .id((d: PhysicsNode) => d.id)
            .distance(PHYSICS_CONFIG.forceLink.distance)
            .strength(PHYSICS_CONFIG.forceLink.strength)
        )
        .force(
          'collide',
          forceCollide<PhysicsNode>()
            .radius((d) => d.radius + PHYSICS_CONFIG.forceCollide.padding)
            .strength(PHYSICS_CONFIG.forceCollide.strength)
            .iterations(PHYSICS_CONFIG.forceCollide.iterations)
        )
        .force(
          'center',
          forceCenter(canvasWidth / 2, canvasHeight / 2)
            .strength(PHYSICS_CONFIG.forceCenter.strength)
        )
        .alpha(PHYSICS_CONFIG.alpha.start)
        .alphaMin(PHYSICS_CONFIG.alpha.min)
        .alphaDecay(PHYSICS_CONFIG.alpha.decay)
        .on('tick', () => {
          // 更新节点位置
          physicsNodes.forEach((node) => {
            if (node.id && typeof node.x === 'number' && typeof node.y === 'number') {
              onNodeUpdate(
                node.id,
                node.x,
                node.y,
                node.vx || 0,
                node.vy || 0
              );
            }
          });
        });

      simulationRef.current = simulation;
      isRunningRef.current = true;
    } else {
      // 更新现有模拟
      const sim = simulationRef.current;
      
      // 更新节点
      sim.nodes(physicsNodes);
      
      // 更新边
      const linkForce = sim.force('link') as ForceLink<PhysicsNode, PhysicsEdge>;
      if (linkForce) {
        linkForce.links(physicsEdges);
      }
      
      // 更新中心力
      sim.force('center', forceCenter(canvasWidth / 2, canvasHeight / 2)
        .strength(PHYSICS_CONFIG.forceCenter.strength));
      
      // 重新加热模拟
      sim.alpha(PHYSICS_CONFIG.alpha.start);
      
      if (!isRunningRef.current) {
        sim.restart();
        isRunningRef.current = true;
      }
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        isRunningRef.current = false;
      }
    };
  }, [nodes, edges, canvasWidth, canvasHeight, enabled, convertToPhysicsNode, onNodeUpdate]);

  // 暂停模拟
  const pause = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      isRunningRef.current = false;
    }
  }, []);

  // 恢复模拟
  const resume = useCallback(() => {
    if (simulationRef.current && enabled) {
      simulationRef.current.restart();
      isRunningRef.current = true;
    }
  }, [enabled]);

  // 重新加热模拟（产生新的运动）
  const reheat = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(PHYSICS_CONFIG.alpha.start);
      if (!isRunningRef.current) {
        simulationRef.current.restart();
        isRunningRef.current = true;
      }
    }
  }, []);

  // 手动设置节点速度（用于拖拽后的惯性）
  const setNodeVelocity = useCallback((nodeId: string, vx: number, vy: number) => {
    const node = nodesRef.current.get(nodeId);
    if (node && simulationRef.current) {
      node.vx = vx;
      node.vy = vy;
      reheat();
    }
  }, [reheat]);

  // 手动设置节点位置（用于拖拽时）
  const setNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.get(nodeId);
    if (node && simulationRef.current) {
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
    }
  }, []);

  return {
    pause,
    resume,
    reheat,
    setNodeVelocity,
    setNodePosition
  };
}
