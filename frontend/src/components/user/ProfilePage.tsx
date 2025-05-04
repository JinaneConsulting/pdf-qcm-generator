import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import UnifiedSidebar from '../layout/UnifiedSidebar';
import { UserRound } from 'lucide-react';
import PdfUploader from '@/components/PdfUpLoader';
import { useNavigate } from 'react-router-dom';


const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Chargement de votre profil...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-quizzai-gradient">
      <UnifiedSidebar 
        currentPage="profile"
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Mon profil</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              {user.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Photo de profil" 
                  className="w-20 h-20 rounded-full mr-4 object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white mr-4 overflow-hidden">
                  <UserRound size={48} />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{user.full_name || user.email.split('@')[0]}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Nom complet</h3>
                <p className="text-lg">{user.full_name || 'Non renseigné'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                <p className="text-lg">{user.email}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Statut du compte</h3>
                <p className="text-lg">
                  {user.is_active ? (
                    <span className="text-green-600 flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                      Actif
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                      Inactif
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Vérifié</h3>
                <p className="text-lg">
                  {user.is_verified ? (
                    <span className="text-green-600 flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                      Oui
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center">
                      <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                      Non
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Télécharger un PDF</h2>
              <PdfUploader />
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button
                className="bg-quizzai-gradient-strong hover:opacity-90"
                onClick={() => navigate('/')}
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;