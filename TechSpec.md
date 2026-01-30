# Idea Field 技术规划文档

## 1. 组件清单

### shadcn/ui 组件
| 组件 | 用途 |
|------|------|
| Button | CTA按钮、工具栏按钮 |
| Card | 功能展示卡片、价格卡片 |
| Dialog | 节点编辑对话框 |
| Slider | 缩放控制滑块 |
| Tooltip | 操作提示 |

### 第三方库
| 库 | 版本 | 用途 |
|---|------|------|
| konva | ^9.2.0 | Canvas 2D 渲染引擎 |
| react-konva | ^18.2.10 | React 绑定 |
| d3-force | ^3.0.0 | 物理引擎（斥力、引力） |
| gsap | ^3.12.2 | 动画效果 |
| @gsap/react | ^2.1.0 | GSAP React 集成 |
| zustand | ^4.4.1 | 状态管理 |

## 2. 动画实现规划

| 动画 | 库 | 实现方案 | 复杂度 |
|------|-----|---------|--------|
| 节点呼吸效果 | Konva + GSAP | 使用 GSAP 动画化节点 scale 属性 | 中 |
| 贝塞尔曲线绘制 | Konva | 实时计算控制点，更新 Path 属性 | 高 |
| 节点弹出生长 | GSAP | scale 0→1 + opacity 0→1，elastic 缓动 | 中 |
| 物理斥力运动 | d3-force | simulation.tick() 驱动节点位置更新 | 高 |
| 画布平移缩放 | Konva | Stage 的 scale 和 position 变换 | 中 |
| 连接线动画 | Konva | stroke-dashoffset 动画 | 低 |
| 状态切换过渡 | GSAP | 颜色、大小、发光效果的过渡动画 | 中 |

## 3. 项目文件结构

```
app/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── IdeaCanvas.tsx          # 主画布组件
│   │   │   ├── InfiniteGrid.tsx        # 无限点阵网格
│   │   │   ├── NodeLayer.tsx           # 节点渲染层
│   │   │   └── EdgeLayer.tsx           # 连接线渲染层
│   │   ├── nodes/
│   │   │   ├── IdeaNode.tsx            # 节点组件
│   │   │   ├── SpawnHandle.tsx         # 生长触点
│   │   │   └── NodeEditor.tsx          # 节点编辑器
│   │   ├── ui/
│   │   │   ├── Toolbar.tsx             # 工具栏
│   │   │   ├── ZoomControls.tsx        # 缩放控制
│   │   │   └── MiniMap.tsx             # 小地图
│   │   └── effects/
│   │       └── GlowFilter.tsx          # 发光滤镜
│   ├── hooks/
│   │   ├── useCanvasCamera.ts          # 相机控制
│   │   ├── useDragSpawn.ts             # 拉线生成逻辑
│   │   ├── usePhysicsSimulation.ts     # 物理引擎
│   │   └── useIdeaStore.ts             # Zustand store
│   ├── types/
│   │   └── index.ts                    # TypeScript 类型定义
│   ├── utils/
│   │   ├── bezier.ts                   # 贝塞尔曲线计算
│   │   ├── colors.ts                   # 颜色工具
│   │   └── geometry.ts                 # 几何计算
│   ├── styles/
│   │   └── globals.css
│   └── App.tsx
├── public/
└── package.json
```

## 4. 核心数据结构

```typescript
// 节点状态
enum NodeStatus {
  SEED = 'seed',           // 种子 - 模糊、呼吸
  SPROUT = 'sprout',       // 萌芽 - 逐渐清晰
  FLOWERING = 'flowering', // 开花 - 发光、旋转能量环
  FRUIT = 'fruit'          // 果实 - 固化、位置锁定
}

// 节点数据
interface IdeaNode {
  id: string;
  parentId?: string;
  text: string;
  status: NodeStatus;
  x: number;
  y: number;
  radius: number;      // 20-60px，对应想法权重
  energy: number;      // 0-1，影响视觉震动频率
  color: string;       // 主题色
}

// 连接线
interface IdeaEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'derive' | 'implement';
}

// 画布状态
interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

## 5. 物理引擎配置

```typescript
// d3-force 模拟配置
const simulationConfig = {
  // 多体力（斥力）- 防止重叠
  forceManyBody: {
    strength: -300,        // 负值表示斥力
    distanceMin: 10,
    distanceMax: 500
  },
  // 连接力（引力）- 维持父子距离
  forceLink: {
    distance: 150,         // 理想距离
    strength: 0.5          // 弹簧强度
  },
  // 碰撞检测
  forceCollide: {
    radius: (d: IdeaNode) => d.radius + 10,  // 碰撞半径
    strength: 0.7,
    iterations: 2
  },
  // 中心力 - 向画布中心聚拢
  forceCenter: {
    x: 0,
    y: 0,
    strength: 0.05
  }
};
```

## 6. 拉线生成算法

```typescript
// 贝塞尔曲线控制点计算
function calculateBezierCurve(
  startX: number, 
  startY: number,
  endX: number, 
  endY: number,
  controlPointOffset: number = 80
): [number, number, number, number, number, number] {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 控制点偏移量基于距离
  const offset = Math.min(controlPointOffset, distance * 0.5);
  
  // 计算垂直方向
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;
  
  // 控制点
  const cp1x = startX + Math.cos(angle) * offset * 0.5 + Math.cos(perpAngle) * offset * 0.3;
  const cp1y = startY + Math.sin(angle) * offset * 0.5 + Math.sin(perpAngle) * offset * 0.3;
  const cp2x = endX - Math.cos(angle) * offset * 0.5 + Math.cos(perpAngle) * offset * 0.3;
  const cp2y = endY - Math.sin(angle) * offset * 0.5 + Math.sin(perpAngle) * offset * 0.3;
  
  return [cp1x, cp1y, cp2x, cp2y, endX, endY];
}
```

## 7. 视觉状态定义

| 状态 | 外观 | 动画 |
|------|------|------|
| Seed | 模糊边缘、半透明、微弱发光 | 呼吸动画 (scale 0.95-1.05, 3s循环) |
| Sprout | 边缘逐渐清晰、亮度增加 | 渐变过渡 (0.5s) |
| Flowering | 锐利边缘、强发光、能量环 | 旋转环 + 脉动发光 |
| Fruit | 固化颜色、粗边框、位置锁定 | 轻微弹跳 settles |

## 8. 性能优化策略

1. **Canvas 分层渲染**
   - 背景网格层（静态，低频更新）
   - 连接线层（中频更新）
   - 节点层（高频更新，交互响应）

2. **物理引擎优化**
   - 使用 `requestAnimationFrame` 节流
   - 节点数量 > 100 时降低模拟精度
   - 拖拽时暂停物理模拟

3. **渲染优化**
   - 离屏渲染复杂效果
   - 使用 Konva 的 `listening(false)` 禁用非交互元素的事件
   - 节点淡出时销毁而非隐藏

## 9. 开发阶段

### Phase 1: 基础画布
- [x] 项目初始化
- [ ] Konva 画布集成
- [ ] 平移/缩放控制
- [ ] 无限点阵网格背景

### Phase 2: 核心交互
- [ ] 节点渲染组件
- [ ] 生长触点检测
- [ ] 贝塞尔曲线拖拽绘制
- [ ] 释放创建新节点

### Phase 3: 物理引擎
- [ ] d3-force 集成
- [ ] 斥力/引力配置
- [ ] 碰撞检测
- [ ] 动画循环同步

### Phase 4: 视觉效果
- [ ] 四种状态视觉
- [ ] 发光滤镜
- [ ] 能量环动画
- [ ] 状态切换过渡
