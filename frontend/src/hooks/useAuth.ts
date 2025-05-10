// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook personnalisé pour accéder aux fonctionnalités d'authentification
 * @returns {Object} Les méthodes et données d'authentification
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  
  return context;
}

export default useAuth;