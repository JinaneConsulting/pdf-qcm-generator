// Fichier amélioré pour src/components/auth/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL, BASIC_AUTH } from '../../config';

interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  full_name?: string | null;
  profile_picture?: string | null;
}

interface Session {
  id: number;
  created_at: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  current: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setToken: (token: string | null) => void;
  isLoading: boolean;
  isInitialized: boolean; 
  error: string | null;
  sessions: Session[];
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAdmin: boolean;
  // Nouvelles fonctions pour la gestion des sessions
  refreshSessions: () => Promise<void>;
  revokeSession: (sessionId: number) => Promise<void>;
  revokeAllSessions: (keepCurrent: boolean) => Promise<void>;
}

// Créer le contexte avec une valeur par défaut undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte d'authentification
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composant Provider qui fournit le contexte d'authentification
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token') || localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Utiliser is_superuser au lieu de comparer l'email
  const isAdmin = user?.is_superuser || false;

  // Fonction pour définir le token et le stocker dans localStorage
  const setToken = (newToken: string | null) => {
    console.log("Setting token:", newToken ? newToken.substring(0, 10) + "..." : "null");

    if (newToken) {
      localStorage.setItem('token', newToken);
      localStorage.setItem('auth_token', newToken); // Pour compatibilité
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
    }

    setTokenState(newToken);
  };

  // Charger les informations de l'utilisateur au démarrage
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        setIsLoading(true);
        console.log("Fetching user with token:", token.substring(0, 10) + "...");

        const response = await fetch(`${API_URL}/custom/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Authorization-Tunnel': BASIC_AUTH
          }
        });

        if (!response.ok) {
          console.error("Failed to fetch user:", response.status, response.statusText);
          throw new Error('Session expirée, veuillez vous reconnecter');
        }

        const userData = await response.json();
        console.log("User data fetched successfully:", userData);
        setUser(userData);
        
        // Récupérer les sessions actives de l'utilisateur
        await refreshSessions();
      } catch (error) {
        console.error('Error fetching user:', error);
        setError((error as Error).message);
        logout();
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    if (user && isInitialized) {
      setIsLoading(false);
      return;
    }

    fetchUser();
  }, [token]);

  // Fonction pour récupérer les sessions actives
  const refreshSessions = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!response.ok) {
        console.error("Failed to fetch sessions:", response.status, response.statusText);
        return;
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Fonction pour révoquer une session spécifique
  const revokeSession = async (sessionId: number) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la révocation de la session');
      }

      // Rafraîchir la liste des sessions
      await refreshSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour révoquer toutes les sessions
  const revokeAllSessions = async (keepCurrent: boolean = true) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/sessions/all?keep_current=${keepCurrent}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la révocation des sessions');
      }

      const data = await response.json();
      
      // Si toutes les sessions ont été révoquées (y compris la courante)
      if (data.logout_required) {
        await logout();
        return;
      }

      // Sinon, juste rafraîchir la liste des sessions
      await refreshSessions();
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Identifiants invalides');
      }

      const data = await response.json();
      setToken(data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: new URLSearchParams({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de l\'inscription');
      }

      const data = await response.json();
      setToken(data.access_token);
    } catch (error) {
      console.error('Registration error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Nouvelle fonction: appeler l'API pour révoquer le token côté serveur
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Authorization-Tunnel': BASIC_AUTH
          }
        }).catch(err => console.error('Error during logout API call:', err));
      }
    } finally {
      // Nettoyer les données locales même si l'API échoue
      setToken(null);
      setUser(null);
      setSessions([]);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue = React.useMemo<AuthContextType>(
    () => ({
      user,
      token,
      setToken,
      isLoading,
      isInitialized,
      error,
      sessions,
      login,
      register,
      logout,
      clearError,
      isAdmin,
      refreshSessions,
      revokeSession,
      revokeAllSessions
    }),
    [user, token, isLoading, isInitialized, error, isAdmin, sessions]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Exporter le contexte, le hook et le provider
export { AuthContext, AuthProvider, useAuth };