// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { PanelLeftClose, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ children, className }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="relative flex h-full">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-72",
          className
        )}
      >
        {children}
      </div>
      
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 bg-purple-600 text-white rounded-full p-1 shadow-md z-10 transition-all duration-300 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? 
          <PanelRight size={16} /> : 
          <PanelLeftClose size={16} />
        }
      </button>
    </div>
  );
};

export default Sidebar;