// src/components/auth/GoogleAuthCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          throw new Error('Authorization code not found');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization-Tunnel': `Basic ${btoa(import.meta.env.VITE_API_CREDENTIALS || '')}`
            },
            body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to authenticate with Google');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        navigate('/profile'); // Changé de '/' à '/profile'
      } catch (error) {
        console.error('Google auth callback error:', error);
        navigate('/login', { state: { error: (error as Error).message } });
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setToken]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Finalisation de la connexion Google...</h2>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
      </div>
    </div>
  );
};

export default GoogleAuthCallback;