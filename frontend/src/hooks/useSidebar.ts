// src/hooks/useSidebar.ts
import { useContext } from 'react';
import { SidebarContext } from '../contexts/SidebarContext';

/**
 * Hook personnalisé pour accéder à l'état et aux fonctions de la sidebar
 * @returns {Object} État et contrôles de la sidebar
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  
  if (context === undefined) {
    throw new Error('useSidebar doit être utilisé à l\'intérieur d\'un SidebarProvider');
  }
  
  return context;
}

export default useSidebar;