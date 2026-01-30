import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Circle, Text, Ring } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import gsap from 'gsap';
import type { IdeaNode } from '@/types';
import { NodeStatus, STATUS_VISUALS } from '@/types';
import { setAlpha, getStatusColor } from '@/utils/colors';

interface IdeaNodeComponentProps {
  node: IdeaNode;
  isSelected: boolean;
  onDragStart: (nodeId: string) => void;
  onDragMove: (nodeId: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onSpawnStart: (nodeId: string, x: number, y: number) => void;
  onClick: () => void;
}

// 获取状态视觉配置
const getStatusVisuals = (status: string) => STATUS_VISUALS[status as keyof typeof STATUS_VISUALS];

export const IdeaNodeComponent: React.FC<IdeaNodeComponentProps> = ({
  node,
  isSelected,
  onDragStart,
  onDragMove,
  onDragEnd,
  onSpawnStart,
  onClick
}) => {
  const groupRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const glowRef = useRef<any>(null);
  const ringRef = useRef<any>(null);
  
  // 本地状态
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringEdge, setIsHoveringEdge] = useState(false);
  const [spawnPoint, setSpawnPoint] = useState<{ x: number; y: number } | null>(null);
  const lastPosition = useRef({ x: node.x, y: node.y });
  const velocity = useRef({ x: 0, y: 0 });
  
  const statusVisuals = getStatusVisuals(node.status);
  const colors = getStatusColor(node.color, node.status);
  
  // 呼吸动画
  useEffect(() => {
    if (!circleRef.current) return;
    
    // 只有 seed 和 sprout 状态有呼吸动画
    if (node.status === NodeStatus.SEED || node.status === NodeStatus.SPROUT) {
      const tl = gsap.to(circleRef.current, {
        scaleX: 1.05,
        scaleY: 1.05,
        duration: statusVisuals.pulseSpeed / 2000,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
      
      return () => {
        tl.kill();
      };
    } else {
      // 其他状态重置缩放
      gsap.set(circleRef.current, { scaleX: 1, scaleY: 1 });
    }
  }, [node.status, statusVisuals.pulseSpeed]);
  
  // 能量环旋转动画（flowering 状态）
  useEffect(() => {
    if (!ringRef.current || node.status !== NodeStatus.FLOWERING) return;
    
    const tl = gsap.to(ringRef.current, {
      rotation: 360,
      duration: 8,
      repeat: -1,
      ease: 'none'
    });
    
    return () => {
      tl.kill();
    };
  }, [node.status]);
  
  // 选中时的动画
  useEffect(() => {
    if (!groupRef.current) return;
    
    if (isSelected) {
      gsap.to(groupRef.current, {
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 0.3,
        ease: 'back.out(1.7)'
      });
    } else {
      gsap.to(groupRef.current, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.2,
        ease: 'power2.out'
      });
    }
  }, [isSelected]);
  
  // 检测鼠标是否在边缘区域
  const checkEdgeHover = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return false;
      
      const pointer = stage.getPointerPosition();
      if (!pointer) return false;
      
      // 转换为世界坐标
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const pos = transform.point(pointer);
      
      const dx = pos.x - node.x;
      const dy = pos.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 边缘区域：半径的 0.7 - 1.0 倍
      const innerRadius = node.radius * 0.7;
      const outerRadius = node.radius * 1.2;
      
      return distance >= innerRadius && distance <= outerRadius;
    },
    [node.x, node.y, node.radius]
  );
  
  // 计算生成点位置
  const calculateSpawnPoint = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return null;
      
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const pos = transform.point(pointer);
      
      const angle = Math.atan2(pos.y - node.y, pos.x - node.x);
      
      return {
        x: node.x + Math.cos(angle) * node.radius,
        y: node.y + Math.sin(angle) * node.radius
      };
    },
    [node.x, node.y, node.radius]
  );
  
  // 处理鼠标移动（检测边缘悬停）
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isDragging) return;
      
      const isEdge = checkEdgeHover(e);
      setIsHoveringEdge(isEdge);
      
      if (isEdge) {
        const point = calculateSpawnPoint(e);
        setSpawnPoint(point);
      } else {
        setSpawnPoint(null);
      }
    },
    [isDragging, checkEdgeHover, calculateSpawnPoint]
  );
  
  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      
      // 左键
      if (e.evt.button === 0) {
        // 检查是否在边缘区域
        const isEdge = checkEdgeHover(e);
        
        if (isEdge) {
          // 开始拖拽生成
          const point = calculateSpawnPoint(e);
          if (point) {
            onSpawnStart(node.id, point.x, point.y);
          }
        } else {
          // 开始拖拽节点
          setIsDragging(true);
          lastPosition.current = { x: node.x, y: node.y };
          velocity.current = { x: 0, y: 0 };
          onDragStart(node.id);
        }
      }
    },
    [node.id, node.x, node.y, checkEdgeHover, calculateSpawnPoint, onSpawnStart, onDragStart]
  );
  
  // 处理拖拽移动
  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!isDragging) return;
      
      const newX = e.target.x();
      const newY = e.target.y();
      
      // 计算速度
      velocity.current = {
        x: newX - lastPosition.current.x,
        y: newY - lastPosition.current.y
      };
      lastPosition.current = { x: newX, y: newY };
      
      onDragMove(node.id, newX, newY);
    },
    [isDragging, node.id, onDragMove]
  );
  
  // 处理拖拽结束
  const handleDragEnd = useCallback(
    () => {
      setIsDragging(false);
      onDragEnd();
    },
    [onDragEnd]
  );
  
  // 处理点击
  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onClick();
    },
    [onClick]
  );
  
  // 调整文字大小以适应节点
  const getFontSize = () => {
    const baseSize = Math.max(10, node.radius / 2.5);
    return Math.min(baseSize, 16);
  };
  
  // 截断文字
  const truncateText = (text: string, maxLength: number = 8) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable={!isHoveringEdge}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      {/* 发光效果 */}
      {(node.status === NodeStatus.FLOWERING || isSelected) && (
        <Circle
          ref={glowRef}
          radius={node.radius * 1.5}
          fill={colors.glow}
          opacity={0.3}
          listening={false}
          shadowColor={node.color}
          shadowBlur={30}
          shadowOpacity={0.5}
        />
      )}
      
      {/* 能量环（flowering 状态） */}
      {node.status === NodeStatus.FLOWERING && (
        <Ring
          ref={ringRef}
          innerRadius={node.radius * 1.1}
          outerRadius={node.radius * 1.25}
          stroke={setAlpha(node.color, 0.6)}
          strokeWidth={2}
          dash={[8, 8]}
          listening={false}
        />
      )}
      
      {/* 主圆形 */}
      <Circle
        ref={circleRef}
        radius={node.radius}
        fill={colors.fill}
        stroke={isSelected ? '#FFFFFF' : colors.stroke}
        strokeWidth={isSelected ? 3 : statusVisuals.strokeWidth}
        shadowColor={node.color}
        shadowBlur={statusVisuals.blur * 2}
        shadowOpacity={statusVisuals.glowIntensity}
        opacity={statusVisuals.opacity}
        listening={true}
        perfectDrawEnabled={false}
      />
      
      {/* 内部高光 */}
      <Circle
        radius={node.radius * 0.6}
        fill={setAlpha('#FFFFFF', 0.1)}
        listening={false}
      />
      
      {/* 文字标签 */}
      <Text
        text={truncateText(node.text)}
        fontSize={getFontSize()}
        fontFamily="Inter, sans-serif"
        fill="#FFFFFF"
        align="center"
        verticalAlign="middle"
        width={node.radius * 2}
        height={node.radius * 2}
        offsetX={node.radius}
        offsetY={node.radius}
        listening={false}
        wrap="none"
        ellipsis={true}
      />
      
      {/* 边缘悬停提示（生长触点） */}
      {isHoveringEdge && spawnPoint && (
        <Group x={spawnPoint.x - node.x} y={spawnPoint.y - node.y}>
          {/* 触点指示器 */}
          <Circle
            radius={8}
            fill={setAlpha('#FFFFFF', 0.8)}
            stroke={node.color}
            strokeWidth={2}
            shadowColor={node.color}
            shadowBlur={10}
            shadowOpacity={0.8}
          />
          {/* 脉冲环 */}
          <Circle
            radius={12}
            stroke={setAlpha(node.color, 0.5)}
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        </Group>
      )}
      
      {/* 选中指示器 */}
      {isSelected && (
        <Circle
          radius={node.radius + 8}
          stroke={setAlpha('#FFFFFF', 0.3)}
          strokeWidth={1}
          dash={[6, 6]}
          listening={false}
        />
      )}
    </Group>
  );
};
