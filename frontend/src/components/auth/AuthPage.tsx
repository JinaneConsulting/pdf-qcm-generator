// src/components/auth/AuthPage.tsx
import React, { useState } from 'react';
import PasswordLoginForm from './PasswordLoginForm';
import PasswordRegisterForm from './PasswordRegisterForm';
import UnifiedSidebar from '../layout/UnifiedSidebar';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  const navigateTo = (path: string) => {
    if (path === '/login') {
      setIsLogin(true);
    } else if (path === '/register') {
      setIsLogin(false);
    }
  };

  // Sélection du composant de formulaire approprié
  const renderForm = () => {
    return isLogin ? 
      <PasswordLoginForm onToggleForm={toggleForm} /> : 
      <PasswordRegisterForm onToggleForm={toggleForm} />;
  };

  return (
    <div className="flex h-screen bg-blue-25">
      <UnifiedSidebar 
        currentPage={isLogin ? 'login' : 'register'}
        onNavigate={navigateTo}
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {renderForm()}
      </div>
    </div>
  );
};

export default AuthPage;