import { useContext } from 'react';
// Import the context objects directly without the hooks
import { AuthContext } from '@/components/auth/AuthContext';
import { SidebarContext } from '@/components/layout/SidebarContext';

// Auth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Sidebar hook
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};