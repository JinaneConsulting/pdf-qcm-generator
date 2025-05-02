// src/components/auth/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import PasswordLoginForm from './PasswordLoginForm';
import PasswordRegisterForm from './PasswordRegisterForm';
import Sidebar from '../layout/Sidebar';
import { UserRound, FileTextIcon } from 'lucide-react';
// Corrigez l'importation du logo SVG
import quizzaiLogo from '../../assets/quizzai-logo.svg';

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

  // Sélection du composant de formulaire approprié
  const renderForm = () => {
    return isLogin ? 
      <PasswordLoginForm onToggleForm={toggleForm} /> : 
      <PasswordRegisterForm onToggleForm={toggleForm} />;
  };

  return (
    <div className="flex h-screen bg-blue-25">
      {/* Utiliser le composant Sidebar réutilisable */}
      <Sidebar>
        <div className="flex flex-col h-full bg-blue-50 text-gray-800 border-r border-blue-100 overflow-hidden">
          {/* Logo */}
          <div className="p-4 flex items-center gap-2 min-h-[64px]">
          <div className="h-10 flex items-center justify-center"> {/* Augmenté la hauteur de h-8 à h-10 */}
            <img 
              src={quizzaiLogo} 
              alt="QuizzAi Logo" 
              className="h-10 w-10 object-contain"
              style={{
                filter: "brightness(0) saturate(100%) invert(27%) sepia(97%) saturate(1868%) hue-rotate(214deg) brightness(97%) contrast(98%)"
              }}
            />
          </div>
            {!isSidebarCollapsed && (
              <span className="text-base font-semibold whitespace-nowrap text-blue-600">QuizzAi</span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            <button 
              className={`w-full ${isLogin ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
              onClick={() => setIsLogin(true)}
            >
              <UserRound size={18} color="#2563eb" />
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Connexion</span>
              )}
            </button>
            
            <button 
              className={`w-full ${!isLogin ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
              onClick={() => setIsLogin(false)}
            >
              <FileTextIcon size={18} color="#2563eb" />
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Inscription</span>
              )}
            </button>
          </div>
          
          {/* Bottom actions */}
          <div className="p-4 border-t border-blue-100">
            <div className="flex items-center gap-2 py-2 px-3 hover:bg-blue-100 rounded-md cursor-pointer justify-center text-blue-600">
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
        {renderForm()}
      </div>
    </div>
  );
};

export default AuthPage;