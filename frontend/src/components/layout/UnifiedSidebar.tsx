// src/components/layout/UnifiedSidebar.tsx
import React from 'react';
import Sidebar from './Sidebar';
import SidebarHeader from './SidebarHeader';
import { UserRound, FileTextIcon, LogOut, Upload, FileSearch, Home, Shield, Folder } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

interface UnifiedSidebarProps {
  children?: React.ReactNode;
  currentPage?: 'home' | 'login' | 'register' | 'upload' | 'profile' | 'admin' | 'folders';
  onNavigate?: (path: string) => void;
}

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({ 
  children, 
  currentPage = 'home', 
  onNavigate 
}) => {
  const { isCollapsed } = useSidebar();
  const { user, logout, isAdmin } = useAuth();

  // Fonction de gestion du clic sur le logo
  const handleLogoClick = () => {
    // Si l'utilisateur est connecté, diriger vers la page d'accueil
    // Sinon, diriger vers la page de connexion
    onNavigate?.(user ? '/' : '/login');
  };

  // Fonction pour générer les classes des boutons de navigation
  const getButtonClasses = (page: string) => {
    return `w-full ${
      currentPage === page 
        ? 'bg-blue-100 hover:bg-blue-200' 
        : 'bg-blue-50 hover:bg-blue-100'
    } text-blue-600 py-2 px-3 rounded flex items-center justify-center gap-2`;
  };

  return (
    <Sidebar>
      <div className="flex flex-col h-full bg-blue-50 text-blue-600 border-r border-blue-100 overflow-hidden">
        {/* En-tête avec logo */}
        <SidebarHeader onLogoClick={handleLogoClick} />

        {/* Navigation dynamique selon l'état de connexion */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {!user ? (
            /* Navigation pour les utilisateurs non connectés */
            <>
              <button
                className={getButtonClasses('login')}
                onClick={() => onNavigate?.('/login')}
              >
                <UserRound size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Connexion</span>
                )}
              </button>

              <button
                className={getButtonClasses('register')}
                onClick={() => onNavigate?.('/register')}
              >
                <FileTextIcon size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Inscription</span>
                )}
              </button>
            </>
          ) : (
            /* Navigation pour les utilisateurs connectés */
            <>
              <button
                className={getButtonClasses('home')}
                onClick={() => onNavigate?.('/')}
              >
                <Home size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Accueil</span>
                )}
              </button>

              <button
                className={getButtonClasses('upload')}
                onClick={() => onNavigate?.('/upload-pdf')}
              >
                <Upload size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Télécharger PDF</span>
                )}
              </button>

              <button
                className={getButtonClasses('folders')}
                onClick={() => onNavigate?.('/folders')}
              >
                <Folder size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Dossiers</span>
                )}
              </button>

              <button
                className={getButtonClasses('profile')}
                onClick={() => onNavigate?.('/profile')}
              >
                <FileSearch size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Mon profil</span>
                )}
              </button>

              {isAdmin && (
                <button
                  className={getButtonClasses('admin')}
                  onClick={() => onNavigate?.('/admin')}
                >
                  <Shield size={18} color="#2563eb" />
                  {!isCollapsed && (
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

              {/* Afficher le nom d'utilisateur si la barre n'est pas réduite */}
              {!isCollapsed && (
                <div className="text-center text-sm font-medium text-blue-600 truncate">
                  {user.full_name || user.email.split('@')[0]}
                </div>
              )}

              {/* Bouton de déconnexion */}
              <div
                className="flex items-center gap-2 py-2 px-3 hover:bg-blue-100 rounded-md cursor-pointer justify-center text-blue-600"
                onClick={logout}
              >
                <LogOut size={18} color="#2563eb" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">Déconnexion</span>
                )}
              </div>
            </div>
          ) : (
            /* Footer pour utilisateur non connecté */
            <div className="flex items-center gap-2 py-2 px-3 hover:bg-blue-100 rounded-md cursor-pointer justify-center text-blue-600">
              {!isCollapsed ? (
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