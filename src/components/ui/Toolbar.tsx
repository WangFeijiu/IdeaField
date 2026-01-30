import React from 'react';
import { 
  Plus, 
  Minus, 
  Maximize, 
  MousePointer2,
  Trash2,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIdeaStore } from '@/hooks/useIdeaStore';
import { NodeStatus } from '@/types';

export const Toolbar: React.FC = () => {
  const {
    camera,
    selectedNodeId,
    nodes,
    zoom,
    resetCamera,
    removeNode,
    updateNode,
    addNode
  } = useIdeaStore();

  // 获取选中节点
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // 处理缩放
  const handleZoomIn = () => zoom(1.2);
  const handleZoomOut = () => zoom(0.8);

  // 处理删除节点
  const handleDelete = () => {
    if (selectedNodeId) {
      removeNode(selectedNodeId);
    }
  };

  // 处理状态切换
  const handleStatusChange = (status: string) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, { status: status as typeof NodeStatus[keyof typeof NodeStatus] });
    }
  };

  // 添加测试节点
  const handleAddTestNode = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    addNode({
      text: `想法 ${nodes.length + 1}`,
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      status: NodeStatus.SEED,
      radius: 30 + Math.random() * 20,
      energy: Math.random()
    });
  };

  // 状态按钮
  const statusButtons = [
    { status: NodeStatus.SEED, label: '种子', color: '#888888' },
    { status: NodeStatus.SPROUT, label: '萌芽', color: '#4CAF50' },
    { status: NodeStatus.FLOWERING, label: '开花', color: '#9C27B0' },
    { status: NodeStatus.FRUIT, label: '果实', color: '#FF9800' }
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* 主工具栏 */}
      <div className="flex items-center gap-1 p-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl">
        {/* 视图控制 */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={handleZoomOut}
            title="缩小"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500 w-12 text-center">
            {Math.round(camera.scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={handleZoomIn}
            title="放大"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={resetCamera}
            title="重置视图"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {/* 节点操作 */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={handleAddTestNode}
            title="添加节点"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            onClick={handleDelete}
            disabled={!selectedNodeId}
            title="删除节点"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* 操作提示 */}
        <div className="flex items-center gap-2 pl-2">
          <MousePointer2 className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500">
            {selectedNodeId ? `已选择: ${selectedNode?.text || '节点'}` : '点击选择节点'}
          </span>
        </div>
      </div>

      {/* 状态切换栏（仅当选中节点时显示） */}
      {selectedNodeId && (
        <div className="flex items-center gap-1 p-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-xs text-gray-500 mr-2">状态:</span>
          {statusButtons.map(({ status, label, color }) => (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs transition-all ${
                selectedNode?.status === status
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                backgroundColor: selectedNode?.status === status ? color : 'transparent'
              }}
              onClick={() => handleStatusChange(status)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
