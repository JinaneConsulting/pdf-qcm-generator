// src/components/layout/UnifiedSidebar.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { UserRound, FileTextIcon, LogOut, Upload, FileSearch, Home, Shield } from 'lucide-react';
import quizzaiLogo from '../../assets/quizzai-logo.svg';
import { useAuth } from '../auth/AuthContext';

interface UnifiedSidebarProps {
  children?: React.ReactNode;
  currentPage?: 'home' | 'login' | 'register' | 'upload' | 'profile' | 'admin';
  onNavigate?: (path: string) => void;
}

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({ children, currentPage = 'home', onNavigate }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const { user, logout } = useAuth();

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
    <Sidebar>
      <div className="flex flex-col h-full bg-blue-50 text-blue-600 border-r border-blue-100 overflow-hidden">
        {/* Logo - Identique pour tous les états */}
        <div className="p-4 flex items-center gap-2 min-h-[64px]">
          <div className="h-10 flex items-center justify-center">
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

        {/* Navigation dynamique selon l'état de connexion */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {!user ? (
            /* Navigation pour les utilisateurs non connectés */
            <>
              <button 
                className={`w-full ${currentPage === 'login' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                onClick={() => onNavigate?.('/login')}
              >
                <UserRound size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Connexion</span>
                )}
              </button>
              
              <button 
                className={`w-full ${currentPage === 'register' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                onClick={() => onNavigate?.('/register')}
              >
                <FileTextIcon size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Inscription</span>
                )}
              </button>
            </>
          ) : (
            /* Navigation pour les utilisateurs connectés */
            <>
              <button 
                className={`w-full ${currentPage === 'home' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                onClick={() => onNavigate?.('/')}
              >
                <Home size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Accueil</span>
                )}
              </button>
              
              <button 
                className={`w-full ${currentPage === 'upload' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                onClick={() => onNavigate?.('/upload-pdf')}
              >
                <Upload size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Télécharger PDF</span>
                )}
              </button>
              
              <button 
                className={`w-full ${currentPage === 'profile' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                onClick={() => onNavigate?.('/profile')}
              >
                <FileSearch size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Mon profil</span>
                )}
              </button>
              
              {/* Bouton Administration - visible uniquement pour les admins */}
              {user && user.is_superuser && (
                <button 
                  className={`w-full ${currentPage === 'admin' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`}
                  onClick={() => onNavigate?.('/admin')}
                >
                  <Shield size={18} color="#2563eb" />
                  {!isSidebarCollapsed && (
                    <span className="whitespace-nowrap">Administration</span>
                  )}
                </button>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-blue-100">
          {user ? (
            /* Footer pour utilisateur connecté */
            <div className="space-y-4">
              {/* Photo de profil */}
              <div className="flex justify-center">
                {user.profile_picture ? (
                  <img 
                    src={user.profile_picture} 
                    alt="Photo de profil" 
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-blue-400"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-8 h-8"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Bouton de déconnexion */}
              <div 
                className="flex items-center gap-2 py-2 px-3 hover:bg-blue-100 rounded-md cursor-pointer justify-center text-blue-600"
                onClick={logout}
              >
                <LogOut size={18} color="#2563eb" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">Déconnexion</span>
                )}
              </div>
            </div>
          ) : (
            /* Footer pour utilisateur non connecté */
            <div className="flex items-center gap-2 py-2 px-3 hover:bg-blue-100 rounded-md cursor-pointer justify-center text-blue-600">
              {!isSidebarCollapsed ? (
                <span>Français</span>
              ) : (
                <span>FR</span>
              )}
            </div>
          )}
        </div>
        
        {/* Contenu personnalisé */}
        {children}
      </div>
    </Sidebar>
  );
};

export default UnifiedSidebar;