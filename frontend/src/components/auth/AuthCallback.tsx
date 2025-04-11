import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    
    if (token) {
      // Store token in local storage
      localStorage.setItem('token', token);
      // Update auth context
      setToken(token);
      // Redirect to dashboard or home
      navigate('/dashboard');
    } else {
      // Handle error
      navigate('/login?error=Authentication failed');
    }
  }, [location, navigate, setToken]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Authentication in progress...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
