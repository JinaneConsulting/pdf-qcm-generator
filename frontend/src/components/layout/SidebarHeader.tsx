// src/components/layout/SidebarHeader.tsx
import React, { useEffect, useState } from 'react';
import quizzaiLogo from '../../assets/quizzai-logo.svg';

const SidebarHeader: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Observer pour détecter l'état réel de la sidebar
  useEffect(() => {
    const checkSidebarState = () => {
      const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
      if (sidebarElement) {
        setIsSidebarCollapsed(sidebarElement.className.includes('w-16'));
      }
    };
    
    // Vérifier l'état initial
    checkSidebarState();
    
    // Créer un observateur pour suivre les changements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkSidebarState();
        }
      });
    });
    
    const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
    if (sidebarElement) {
      observer.observe(sidebarElement, { attributes: true });
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className="p-4 flex items-center gap-3">
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
      {!isSidebarCollapsed && (
        <div>
          <span className="text-xl font-semibold text-blue-600">QuizzAi</span>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;