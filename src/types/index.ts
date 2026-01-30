// 节点状态
export const NodeStatus = {
  SEED: 'seed' as const,
  SPROUT: 'sprout' as const,
  FLOWERING: 'flowering' as const,
  FRUIT: 'fruit' as const
};

export type NodeStatusType = typeof NodeStatus[keyof typeof NodeStatus];

// 节点数据接口
export interface IdeaNode {
  id: string;
  parentId?: string;
  text: string;
  status: NodeStatusType;
  x: number;
  y: number;
  radius: number;      // 20-60px，对应想法权重
  energy: number;      // 0-1，影响视觉震动频率
  color: string;       // 主题色
  createdAt: number;   // 创建时间戳
}

// 连接线类型
export const EdgeType = {
  DERIVE: 'derive' as const,
  IMPLEMENT: 'implement' as const
};

export type EdgeTypeType = typeof EdgeType[keyof typeof EdgeType];

// 连接线接口
export interface IdeaEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeTypeType;
}

// 画布相机状态
export interface CameraState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// 拖拽生成状态
export interface DragSpawnState {
  isDragging: boolean;
  sourceNodeId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// 视口边界
export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 颜色主题
export const NODE_COLORS = {
  purple: '#6B30FF',
  deepPurple: '#452F8F',
  lightPurple: '#A78BFF',
  blue: '#2895F7',
  green: '#00C853',
  cyan: '#00BCD4',
  pink: '#E91E63',
  orange: '#FF9800'
} as const;

// 状态视觉配置
export const STATUS_VISUALS: Record<NodeStatusType, {
  blur: number;
  opacity: number;
  glowIntensity: number;
  pulseSpeed: number;
  strokeWidth: number;
  hasRing?: boolean;
  isLocked?: boolean;
}> = {
  [NodeStatus.SEED]: {
    blur: 8,
    opacity: 0.6,
    glowIntensity: 0.3,
    pulseSpeed: 3000,
    strokeWidth: 1
  },
  [NodeStatus.SPROUT]: {
    blur: 4,
    opacity: 0.8,
    glowIntensity: 0.5,
    pulseSpeed: 2500,
    strokeWidth: 1.5
  },
  [NodeStatus.FLOWERING]: {
    blur: 0,
    opacity: 1,
    glowIntensity: 0.8,
    pulseSpeed: 2000,
    strokeWidth: 2,
    hasRing: true
  },
  [NodeStatus.FRUIT]: {
    blur: 0,
    opacity: 1,
    glowIntensity: 0.4,
    pulseSpeed: 0,
    strokeWidth: 3,
    isLocked: true
  }
};

// 物理引擎配置
export const PHYSICS_CONFIG = {
  forceManyBody: {
    strength: -400,
    distanceMin: 20,
    distanceMax: 600
  },
  forceLink: {
    distance: 180,
    strength: 0.3
  },
  forceCollide: {
    padding: 15,
    strength: 0.8,
    iterations: 3
  },
  forceCenter: {
    strength: 0.03
  },
  alpha: {
    start: 1,
    min: 0.001,
    decay: 0.02
  }
} as const;
