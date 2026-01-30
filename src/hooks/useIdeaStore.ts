import { create } from 'zustand';
import type { 
  IdeaNode, 
  IdeaEdge, 
  CameraState, 
  DragSpawnState
} from '@/types';
import { NodeStatus, EdgeType, NODE_COLORS } from '@/types';

interface IdeaState {
  // 节点和边
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  
  // 相机状态
  camera: CameraState;
  
  // 拖拽生成状态
  dragSpawn: DragSpawnState;
  
  // 选中状态
  selectedNodeId: string | null;
  editingNodeId: string | null;
  
  // 画布尺寸
  canvasWidth: number;
  canvasHeight: number;
  
  // Actions
  addNode: (node: Partial<IdeaNode> & { x: number; y: number; text: string }) => string;
  updateNode: (id: string, updates: Partial<IdeaNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Omit<IdeaEdge, 'id'>) => string;
  removeEdge: (id: string) => void;
  
  // 相机控制
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetCamera: () => void;
  
  // 拖拽生成
  startDragSpawn: (sourceNodeId: string, startX: number, startY: number) => void;
  updateDragSpawn: (currentX: number, currentY: number) => void;
  endDragSpawn: () => { x: number; y: number; sourceNodeId: string } | null;
  cancelDragSpawn: () => void;
  
  // 选择
  selectNode: (id: string | null) => void;
  startEditing: (id: string | null) => void;
  
  // 画布尺寸
  setCanvasSize: (width: number, height: number) => void;
  
  // 初始化
  initializeWithRoot: () => void;
}

// 生成唯一ID
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 获取随机颜色
const getRandomColor = () => {
  const colors = Object.values(NODE_COLORS);
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useIdeaStore = create<IdeaState>((set, get) => ({
  // 初始状态
  nodes: [],
  edges: [],
  camera: {
    scale: 1,
    offsetX: 0,
    offsetY: 0
  },
  dragSpawn: {
    isDragging: false,
    sourceNodeId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  },
  selectedNodeId: null,
  editingNodeId: null,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,

  // 添加节点
  addNode: (nodeData) => {
    const id = generateId();
    const newNode: IdeaNode = {
      id,
      text: nodeData.text,
      x: nodeData.x,
      y: nodeData.y,
      status: nodeData.status || NodeStatus.SEED,
      radius: nodeData.radius || 35,
      energy: nodeData.energy || 0.5,
      color: nodeData.color || getRandomColor(),
      parentId: nodeData.parentId,
      createdAt: Date.now()
    };
    
    set((state) => ({
      nodes: [...state.nodes, newNode]
    }));
    
    return id;
  },

  // 更新节点
  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      )
    }));
  },

  // 删除节点
  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.sourceId !== id && edge.targetId !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));
  },

  // 添加边
  addEdge: (edgeData) => {
    const id = generateId();
    const newEdge: IdeaEdge = {
      id,
      sourceId: edgeData.sourceId,
      targetId: edgeData.targetId,
      type: edgeData.type || EdgeType.DERIVE
    };
    
    set((state) => ({
      edges: [...state.edges, newEdge]
    }));
    
    return id;
  },

  // 删除边
  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id)
    }));
  },

  // 平移
  pan: (dx, dy) => {
    set((state) => ({
      camera: {
        ...state.camera,
        offsetX: state.camera.offsetX + dx,
        offsetY: state.camera.offsetY + dy
      }
    }));
  },

  // 缩放
  zoom: (factor, centerX, centerY) => {
    const state = get();
    const { camera, canvasWidth, canvasHeight } = state;
    
    const cx = centerX ?? canvasWidth / 2;
    const cy = centerY ?? canvasHeight / 2;
    
    // 计算新的缩放级别
    const newScale = Math.max(0.1, Math.min(5, camera.scale * factor));
    const scaleRatio = newScale / camera.scale;
    
    // 以鼠标位置为中心缩放
    const newOffsetX = cx - (cx - camera.offsetX) * scaleRatio;
    const newOffsetY = cy - (cy - camera.offsetY) * scaleRatio;
    
    set({
      camera: {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }
    });
  },

  // 重置相机
  resetCamera: () => {
    set({
      camera: {
        scale: 1,
        offsetX: 0,
        offsetY: 0
      }
    });
  },

  // 开始拖拽生成
  startDragSpawn: (sourceNodeId, startX, startY) => {
    set({
      dragSpawn: {
        isDragging: true,
        sourceNodeId,
        startX,
        startY,
        currentX: startX,
        currentY: startY
      }
    });
  },

  // 更新拖拽生成
  updateDragSpawn: (currentX, currentY) => {
    set((state) => ({
      dragSpawn: {
        ...state.dragSpawn,
        currentX,
        currentY
      }
    }));
  },

  // 结束拖拽生成
  endDragSpawn: () => {
    const state = get();
    const { dragSpawn } = state;
    
    if (!dragSpawn.isDragging || !dragSpawn.sourceNodeId) {
      return null;
    }
    
    const result = {
      x: dragSpawn.currentX,
      y: dragSpawn.currentY,
      sourceNodeId: dragSpawn.sourceNodeId
    };
    
    // 重置拖拽状态
    set({
      dragSpawn: {
        isDragging: false,
        sourceNodeId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      }
    });
    
    return result;
  },

  // 取消拖拽生成
  cancelDragSpawn: () => {
    set({
      dragSpawn: {
        isDragging: false,
        sourceNodeId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      }
    });
  },

  // 选择节点
  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  // 开始编辑
  startEditing: (id) => {
    set({ editingNodeId: id });
  },

  // 设置画布尺寸
  setCanvasSize: (width, height) => {
    set({
      canvasWidth: width,
      canvasHeight: height
    });
  },

  // 初始化根节点
  initializeWithRoot: () => {
    const state = get();
    if (state.nodes.length === 0) {
      const centerX = state.canvasWidth / 2;
      const centerY = state.canvasHeight / 2;
      
      const rootId = generateId();
      const rootNode: IdeaNode = {
        id: rootId,
        text: '核心想法',
        x: centerX,
        y: centerY,
        status: NodeStatus.FLOWERING,
        radius: 45,
        energy: 0.8,
        color: NODE_COLORS.purple,
        createdAt: Date.now()
      };
      
      set({
        nodes: [rootNode],
        edges: []
      });
    }
  }
}));
