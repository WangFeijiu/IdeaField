import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Circle, Group, Line as ReactKonvaLine } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useIdeaStore } from '@/hooks/useIdeaStore';
import { usePhysicsSimulation } from '@/hooks/usePhysicsSimulation';
import type { IdeaNode, IdeaEdge } from '@/types';
import { NodeStatus, EdgeType } from '@/types';
import { generateBezierPath, getEdgePoint } from '@/utils/bezier';
import { setAlpha } from '@/utils/colors';
import { IdeaNodeComponent } from '@/components/nodes/IdeaNode';

// 网格点阵组件
const DotGrid: React.FC<{
  offsetX: number;
  offsetY: number;
  scale: number;
  width: number;
  height: number;
}> = ({ offsetX, offsetY, scale, width, height }) => {
  const dotSpacing = 40;
  const dotRadius = 1.5;
  
  // 计算可见区域内的网格点
  const startX = Math.floor(-offsetX / scale / dotSpacing) * dotSpacing - dotSpacing;
  const startY = Math.floor(-offsetY / scale / dotSpacing) * dotSpacing - dotSpacing;
  const endX = startX + (width / scale) + dotSpacing * 3;
  const endY = startY + (height / scale) + dotSpacing * 3;
  
  const dots: { x: number; y: number }[] = [];
  
  for (let x = startX; x < endX; x += dotSpacing) {
    for (let y = startY; y < endY; y += dotSpacing) {
      dots.push({ x, y });
    }
  }
  
  return (
    <Group>
      {dots.map((dot, index) => (
        <Circle
          key={index}
          x={dot.x}
          y={dot.y}
          radius={dotRadius / scale}
          fill="#333333"
          opacity={0.5}
          listening={false}
        />
      ))}
    </Group>
  );
};

// 连接线组件
interface EdgeLayerProps {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  dragSpawn: {
    isDragging: boolean;
    sourceNodeId: string | null;
    currentX: number;
    currentY: number;
  };
}

const EdgeLayer: React.FC<EdgeLayerProps> = ({ nodes, edges, dragSpawn }) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  
  return (
    <Group>
      {/* 已存在的连接线 */}
      {edges.map((edge) => {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);
        
        if (!source || !target) return null;
        
        const start = getEdgePoint(source.x, source.y, source.radius, target.x, target.y);
        const end = getEdgePoint(target.x, target.y, target.radius, source.x, source.y);
        
        const path = generateBezierPath(start.x, start.y, end.x, end.y, 0.4);
        
        return (
          <KonvaBezierLine
            key={edge.id}
            pathData={path}
            stroke={setAlpha(source.color, 0.4)}
            strokeWidth={2}
          />
        );
      })}
      
      {/* 拖拽中的临时连接线 */}
      {dragSpawn.isDragging && dragSpawn.sourceNodeId && (
        (() => {
          const source = nodeMap.get(dragSpawn.sourceNodeId);
          if (!source) return null;
          
          const start = getEdgePoint(
            source.x,
            source.y,
            source.radius,
            dragSpawn.currentX,
            dragSpawn.currentY
          );
          
          const path = generateBezierPath(
            start.x,
            start.y,
            dragSpawn.currentX,
            dragSpawn.currentY,
            0.5
          );
          
          return (
            <KonvaBezierLine
              pathData={path}
              stroke={setAlpha(source.color, 0.6)}
              strokeWidth={2}
              dash={[5, 5]}
            />
          );
        })()
      )}
    </Group>
  );
};

// 贝塞尔曲线组件
interface KonvaBezierLineProps {
  pathData: string;
  stroke: string;
  strokeWidth: number;
  dash?: number[];
}

const KonvaBezierLine: React.FC<KonvaBezierLineProps> = ({
  pathData,
  stroke,
  strokeWidth,
  dash
}) => {
  // 解析 SVG 路径数据
  // 格式: "M x y C cp1x cp1y, cp2x cp2y, endX endY"
  const parts = pathData.replace('M ', '').replace(' C ', ',').split(',');
  const coords = parts.map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
  
  if (coords.length < 6) return null;
  
  // Konva 的贝塞尔曲线需要 6 个点: startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY
  // 但实际上它使用 points 数组，前两个是起点，然后每两个是一对控制点或终点
  // 对于三次贝塞尔曲线，需要: [startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY]
  const bezierPoints = [
    coords[0], coords[1],  // 起点
    coords[2], coords[3],  // 控制点1
    coords[4], coords[5],  // 控制点2
    coords[6], coords[7]   // 终点
  ];
  
  return (
    <ReactKonvaLine
      points={bezierPoints}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dash={dash}
      lineCap="round"
      lineJoin="round"
      bezier
      listening={false}
    />
  );
};

// 主画布组件
export const IdeaCanvas: React.FC = () => {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 从 store 获取状态
  const {
    nodes,
    edges,
    camera,
    dragSpawn,
    selectedNodeId,
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    pan,
    zoom,
    updateNode,
    addNode,
    addEdge,
    startDragSpawn,
    updateDragSpawn,
    endDragSpawn,
    selectNode
  } = useIdeaStore();
  
  // 本地状态
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // 初始化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize(width, height);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // 初始化根节点
    setTimeout(() => {
      const store = useIdeaStore.getState();
      store.initializeWithRoot();
    }, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setCanvasSize]);
  
  // 键盘事件监听（空格键用于平移）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // 物理引擎
  const { setNodePosition, reheat } = usePhysicsSimulation({
    nodes,
    edges,
    canvasWidth,
    canvasHeight,
    onNodeUpdate: (id, x, y) => {
      updateNode(id, { x, y });
    },
    enabled: true
  });
  
  // 将屏幕坐标转换为世界坐标
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - camera.offsetX) / camera.scale,
        y: (screenY - camera.offsetY) / camera.scale
      };
    },
    [camera]
  );
  
  // 处理画布点击（空白处取消选择）
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.currentTarget) {
        selectNode(null);
      }
    },
    [selectNode]
  );
  
  // 处理鼠标按下（开始平移或拖拽生成）
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      // 空格键 + 鼠标左键 = 平移
      if (isSpacePressed || e.evt.button === 1) {
        setIsPanning(true);
        setLastPanPoint({ x: pos.x, y: pos.y });
        return;
      }
    },
    [isSpacePressed]
  );
  
  // 处理鼠标移动（平移或更新拖拽生成）
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      // 平移画布
      if (isPanning) {
        const dx = pos.x - lastPanPoint.x;
        const dy = pos.y - lastPanPoint.y;
        pan(dx, dy);
        setLastPanPoint({ x: pos.x, y: pos.y });
        return;
      }
      
      // 更新拖拽生成
      if (dragSpawn.isDragging) {
        const worldPos = screenToWorld(pos.x, pos.y);
        updateDragSpawn(worldPos.x, worldPos.y);
      }
    },
    [isPanning, lastPanPoint, pan, dragSpawn.isDragging, updateDragSpawn, screenToWorld]
  );
  
  // 处理鼠标释放（结束平移或拖拽生成）
  const handleMouseUp = useCallback(
    () => {
      // 结束平移
      if (isPanning) {
        setIsPanning(false);
        return;
      }
      
      // 结束拖拽生成
      if (dragSpawn.isDragging) {
        const result = endDragSpawn();
        
        if (result) {
          // 创建新节点
          const newNodeId = addNode({
            text: '新想法',
            x: result.x,
            y: result.y,
            parentId: result.sourceNodeId,
            status: NodeStatus.SEED,
            radius: 30,
            energy: 0.5
          });
          
          // 创建连接边
          addEdge({
            sourceId: result.sourceNodeId,
            targetId: newNodeId,
            type: EdgeType.DERIVE
          });
          
          // 重新加热物理模拟
          reheat();
        }
      }
    },
    [isPanning, dragSpawn.isDragging, endDragSpawn, addNode, addEdge, reheat]
  );
  
  // 处理滚轮缩放
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      const scaleFactor = e.evt.deltaY > 0 ? 0.9 : 1.1;
      zoom(scaleFactor, pos.x, pos.y);
    },
    [zoom]
  );
  
  // 处理节点拖拽开始
  const handleNodeDragStart = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
    },
    [selectNode]
  );
  
  // 处理节点拖拽移动
  const handleNodeDragMove = useCallback(
    (nodeId: string, x: number, y: number) => {
      updateNode(nodeId, { x, y });
      setNodePosition(nodeId, x, y);
    },
    [updateNode, setNodePosition]
  );
  
  // 处理节点拖拽结束
  const handleNodeDragEnd = useCallback(
    () => {
      reheat();
    },
    [reheat]
  );
  
  // 处理节点上的拖拽生成开始
  const handleNodeSpawnStart = useCallback(
    (nodeId: string, x: number, y: number) => {
      startDragSpawn(nodeId, x, y);
    },
    [startDragSpawn]
  );
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black overflow-hidden cursor-crosshair"
      style={{ cursor: isSpacePressed ? 'grab' : 'crosshair' }}
    >
      <Stage
        ref={stageRef}
        width={canvasWidth}
        height={canvasHeight}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.offsetX}
        y={camera.offsetY}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={false}
      >
        {/* 背景网格层 */}
        <Layer listening={false}>
          <DotGrid
            offsetX={camera.offsetX}
            offsetY={camera.offsetY}
            scale={camera.scale}
            width={canvasWidth}
            height={canvasHeight}
          />
        </Layer>
        
        {/* 连接线层 */}
        <Layer listening={false}>
          <EdgeLayer nodes={nodes} edges={edges} dragSpawn={dragSpawn} />
        </Layer>
        
        {/* 节点层 */}
        <Layer>
          {nodes.map((node) => (
            <IdeaNodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onDragStart={handleNodeDragStart}
              onDragMove={handleNodeDragMove}
              onDragEnd={handleNodeDragEnd}
              onSpawnStart={handleNodeSpawnStart}
              onClick={() => selectNode(node.id)}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none select-none">
        <p>滚轮缩放 · 空格+拖拽平移 · 从节点边缘拖拽生成新节点</p>
      </div>
    </div>
  );
};
