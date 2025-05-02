import React from 'react';
import { useSidebar } from './SidebarContext';
import quizzaiLogo from '../../assets/quizzai-logo.svg';

interface SidebarHeaderProps {
  user?: any; // Rendre user optionnel
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ user }) => {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="p-4 flex items-center gap-2 min-h-[64px]">
      <div className="h-10 flex items-center justify-center">
        <img 
          src={quizzaiLogo} 
          alt="QuizzAi Logo" 
          className="h-10 w-10 object-contain" 
          style={{
            filter: "brightness(0) saturate(100%) invert(27%) sepia(97%) saturate(1868%) hue-rotate(214deg) brightness(97%) contrast(98%)"
          }}
        />
      </div>
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-base font-semibold whitespace-nowrap text-blue-600">QuizzAi</span>
          {user && (
            <span className="text-xs text-blue-400 font-medium whitespace-nowrap">
              Bonjour, {user.email.split('@')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;