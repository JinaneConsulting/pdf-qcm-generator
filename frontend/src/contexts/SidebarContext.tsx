// src/contexts/SidebarContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
}

// Créer le contexte avec une valeur par défaut undefined
export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte de la sidebar
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Props pour le SidebarProvider
interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

// Le Provider qui fournit l'état de la sidebar à l'application
export const SidebarProvider: React.FC<SidebarProviderProps> = ({ 
  children, 
  defaultCollapsed = true 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Fonction pour basculer l'état de la sidebar
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // Persist the sidebar state in localStorage
    localStorage.setItem('sidebar_collapsed', String(!isCollapsed));
  };

  // Fonction pour définir directement l'état de la sidebar
  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  };

  // Restaurer l'état de la sidebar depuis localStorage au chargement
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Valeur du contexte
  const contextValue = {
    isCollapsed,
    toggleSidebar,
    setSidebarCollapsed
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarProvider;