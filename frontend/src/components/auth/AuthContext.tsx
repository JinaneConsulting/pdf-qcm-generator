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

interface AuthContextType {
  user: User | null;
  token: string | null;
  setToken: (token: string | null) => void;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
    
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
      } catch (error) {
        console.error('Error fetching user:', error);
        setError((error as Error).message);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [token]);

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

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setToken,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Exporter le contexte, le hook et le provider
export { AuthContext, AuthProvider, useAuth };