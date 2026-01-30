import { useEffect } from 'react';
import { IdeaCanvas } from '@/components/canvas/IdeaCanvas';
import { Toolbar } from '@/components/ui/Toolbar';
import './App.css';

function App() {
  // 阻止默认的触摸事件（防止页面滚动）
  useEffect(() => {
    const preventDefault = (e: Event) => {
      if ((e as TouchEvent).touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* 主画布 */}
      <IdeaCanvas />
      
      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Toolbar />
      </div>
      
      {/* 品牌标识 */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          <span className="text-[#6B30FF]">Idea</span>
          <span className="text-white">Field</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">思维能量场</p>
      </div>
      
      {/* 右下角快捷键提示 */}
      <div className="absolute bottom-4 right-4 z-10 text-right">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 border border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">快捷键</h3>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex items-center justify-between gap-4">
              <span>滚轮</span>
              <span className="text-gray-400">缩放画布</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>空格 + 拖拽</span>
              <span className="text-gray-400">平移画布</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>从边缘拖拽</span>
              <span className="text-gray-400">生成新节点</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>点击节点</span>
              <span className="text-gray-400">选择/编辑</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
