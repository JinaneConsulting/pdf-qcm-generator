import React, { createContext, useState, useEffect, useContext } from 'react';

const API_BASE_URL = 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';
const API_URL = import.meta.env.VITE_API_URL ;
  import.meta.env.VITE_API_URL.split('@')[1] ; 
  API_BASE_URL;

const API_CREDENTIALS = import.meta.env.VITE_API_URL ? 
  import.meta.env.VITE_API_URL.split('@')[0].replace('https://', '') : 
  'user:f6f93d86265ff53a7a7e0ac885597bf3';

const BASIC_AUTH = `Basic ${btoa(API_CREDENTIALS)}`;


interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  full_name?: string | null; // Ajoutez cette propriété
  profile_picture?: string | null; // Ajoutez cette propriété
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Authorization-Tunnel': BASIC_AUTH
          }
        });

        if (!response.ok) {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }

        const userData = await response.json();
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

      const response = await fetch(`${API_URL}/auth/jwt/login`, {
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
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);

      const userResponse = await fetch(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!userResponse.ok) {
        throw new Error('Erreur lors de la récupération des données utilisateur');
      }

      const userData = await userResponse.json();
      setUser(userData);
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
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de l\'inscription');
      }

      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
