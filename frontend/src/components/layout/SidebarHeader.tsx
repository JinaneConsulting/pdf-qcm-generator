// src/components/layout/SidebarHeader.tsx
import React from 'react';
import { useSidebar } from '../../contexts/SidebarContext';
import quizzaiLogo from '../../assets/quizzai-logo.svg';

interface SidebarHeaderProps {
  onLogoClick?: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onLogoClick }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div 
      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-colors"
      onClick={onLogoClick}
    >
      {/* Logo - toujours visible */}
      <div className="h-8 w-8 flex items-center justify-center text-blue-600">
        <img
          src={quizzaiLogo}
          alt="QuizzAi Logo"
          className="h-full w-full object-contain text-blue-600 fill-blue-600 filter-none"
          style={{ filter: 'invert(0)', color: '#2563eb' }}
        />
      </div>

      {/* Texte - visible uniquement quand la sidebar est dépliée */}
      {!isCollapsed && (
        <div>
          <span className="text-xl font-semibold text-blue-600">QuizzAi</span>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;