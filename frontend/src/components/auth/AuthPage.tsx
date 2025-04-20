// src/components/auth/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Sidebar from '../layout/Sidebar';
import { UserRound, FileTextIcon } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  // Observer pour détecter si la sidebar est repliée ou non
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
          if (sidebarElement) {
            const isCollapsed = sidebarElement.className.includes('w-16');
            setIsSidebarCollapsed(isCollapsed);
          }
        }
      });
    });

    const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
    if (sidebarElement) {
      observer.observe(sidebarElement, { attributes: true });
      // État initial
      setIsSidebarCollapsed(sidebarElement.className.includes('w-16'));
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Utiliser le composant Sidebar réutilisable */}
      <Sidebar>
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
          {/* Logo */}
          <div className="p-4 flex items-center gap-2 min-h-[64px]">
            <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-semibold whitespace-nowrap">PDF QCM</span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            <button 
              className={`w-full ${isLogin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-800 hover:bg-zinc-700'} text-white py-2 px-4 rounded-md flex items-center justify-center gap-2`}
              onClick={() => setIsLogin(true)}
            >
              <UserRound size={18} />
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Connexion</span>
              )}
            </button>
            
            <button 
              className={`w-full ${!isLogin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-800 hover:bg-zinc-700'} text-white py-2 px-4 rounded-md flex items-center justify-center gap-2`}
              onClick={() => setIsLogin(false)}
            >
              <FileTextIcon size={18} />
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Inscription</span>
              )}
            </button>
          </div>
          
          {/* Bottom actions */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded-md cursor-pointer justify-center">
              {!isSidebarCollapsed ? (
                <span>Français</span>
              ) : (
                <span>FR</span>
              )}
            </div>
          </div>
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {isLogin ? (
          <LoginForm onToggleForm={toggleForm} />
        ) : (
          <RegisterForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;