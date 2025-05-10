// src/components/layout/Sidebar.tsx
import React from 'react';
import { PanelLeftClose, PanelRight } from 'lucide-react';
import { cn } from '../../lib/utils'; 
import { useSidebar } from '../../contexts/SidebarContext';

interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ children, className }) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className="relative flex h-full">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-72",
          className
        )}
        data-sidebar-state={isCollapsed ? "collapsed" : "expanded"}
      >
        {children}
      </div>
      
      <button
        onClick={toggleSidebar}
        className="absolute top-4 -right-3 bg-blue-50 text-blue-400 rounded-full p-1 shadow-sm z-10 transition-all duration-200 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-200"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Développer" : "Réduire"}
      >
        {isCollapsed ? 
          <PanelRight size={16} /> : 
          <PanelLeftClose size={16} />
        }
      </button>
    </div>
  );
};

export default Sidebar;