import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WindowProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
}

export const Window: React.FC<WindowProps> = ({ 
  id, 
  title, 
  icon, 
  children, 
  onClose, 
  onFocus, 
  onMinimize,
  onToggleMaximize,
  isFocused,
  isMinimized,
  isMaximized,
  zIndex,
  initialX = 100,
  initialY = 100,
  initialWidth = 800,
  initialHeight = 500
}) => {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(400, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(300, startHeight + (moveEvent.clientY - startY));
      setSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          ref={windowRef}
          drag={!isMaximized}
          dragMomentum={false}
          onMouseDown={onFocus}
          onDragEnd={(_, info) => {
            setPosition(prev => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y
            }));
          }}
          initial={{ opacity: 0, scale: 0.9, x: position.x, y: position.y }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            width: isMaximized ? '100%' : size.width,
            height: isMaximized ? 'calc(100% - 48px)' : size.height,
            x: isMaximized ? 0 : position.x,
            y: isMaximized ? 0 : position.y,
            zIndex: zIndex
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "absolute flex flex-col bg-[#000500] border border-[#00FF41]/30 rounded-lg overflow-hidden shadow-2xl shadow-[#00FF41]/10",
            isFocused ? "border-[#00FF41]/60 ring-1 ring-[#00FF41]/20" : "opacity-80"
          )}
        >
          {/* Window Header */}
          <div className="h-10 bg-[#00FF41]/10 border-b border-[#00FF41]/20 flex items-center justify-between px-3 cursor-move select-none">
            <div className="flex items-center gap-2 text-[#00FF41] text-xs font-bold tracking-widest uppercase">
              {icon}
              <span>{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
                className="p-1.5 hover:bg-[#00FF41]/20 rounded transition-colors text-[#00FF41]/60"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }} 
                className="p-1.5 hover:bg-[#00FF41]/20 rounded transition-colors text-[#00FF41]/60"
              >
                {isMaximized ? <Square className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors text-[#00FF41]/60"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>

          {/* Resize Handle */}
          {!isMaximized && (
            <div 
              onMouseDown={handleResize}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center group"
            >
              <div className="w-1.5 h-1.5 border-r border-b border-[#00FF41]/40 group-hover:border-[#00FF41] transition-colors" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface TaskbarIconProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const TaskbarIcon: React.FC<TaskbarIconProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative p-2 rounded transition-all flex items-center justify-center",
      isActive ? "bg-[#00FF41]/20 text-[#00FF41]" : "text-[#00FF41]/40 hover:bg-[#00FF41]/10 hover:text-[#00FF41]/80"
    )}
  >
    {icon}
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#000500] border border-[#00FF41]/30 rounded text-[10px] text-[#00FF41] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest">
      {label}
    </div>
    {isActive && (
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00FF41] rounded-full" />
    )}
  </button>
);
