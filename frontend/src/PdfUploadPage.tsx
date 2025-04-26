import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import { LogOut, FileText, FileSearch, AlertTriangle } from 'lucide-react';
import PdfUploadComponent from './PdfUploadComponent';
import { useAuth } from './components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { API_URL } from './config';

const PdfUploadPage: React.FC = () => {
  const { user, token, logout, isLoading, error: authError } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadAttempted, setUploadAttempted] = useState<boolean>(false);
  
  const navigate = useNavigate();

  // Observer pour détecter l'état de la sidebar
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
      setIsSidebarCollapsed(sidebarElement.className.includes('w-16'));
    }

    return () => observer.disconnect();
  }, []);

  const handleUploadSuccess = (id: string, name: string) => {
    console.log('Upload successful, ID:', id, 'Name:', name);
    setFileId(id);
    setFileName(name);
    setUploadSuccess(true);
    setUploadAttempted(true);
  };

  // Vérifier que le token est disponible
  useEffect(() => {
    if (!token && !isLoading) {
      console.warn('No authentication token available');
      navigate('/');
    }
  }, [token, navigate, isLoading]);

  // Effet pour vérifier la connection aux dossiers d'upload
  useEffect(() => {
    const verifyUploadsFolder = async () => {
      try {
        // Juste une simple requête pour vérifier la connexion
        const response = await fetch(`${API_URL}/`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (response.ok) {
          console.log('API connection verified successfully');
        } else {
          console.warn('Could not verify API connection:', response.status);
        }
      } catch (error) {
        console.error('Error verifying API connection:', error);
      }
    };
    
    if (token) {
      verifyUploadsFolder();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Sidebar>
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
          <div className="p-4 flex items-center gap-2 min-h-[64px]">
            <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            {!isSidebarCollapsed && user && (
              <div className="flex flex-col">
                <span className="text-xl font-semibold">PDF QCM</span>
                <span className="text-sm text-purple-400 font-medium">
                  Bonjour, {user.email.split('@')[0]}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            <button 
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
              onClick={() => navigate('/')}
            >
              <FileText size={18} />
              {!isSidebarCollapsed && (
                <span>Retour au QCM</span>
              )}
            </button>
            
            <button 
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
              onClick={() => navigate('/profile')}
            >
              <FileSearch size={18} />
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Mon profil</span>
              )}
            </button>
          </div>
          
          <div className="p-4 border-t border-zinc-800">
            {/* Photo de profil */}
            <div className="mb-4 flex justify-center">
              {user && user.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Photo de profil" 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-purple-600"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 overflow-hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div 
              className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded-md cursor-pointer"
              onClick={logout}
            >
              <LogOut size={18} />
              {!isSidebarCollapsed && (
                <span>Déconnexion</span>
              )}
            </div>
          </div>
        </div>
      </Sidebar>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Télécharger un PDF</h1>
          
          {authError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {typeof authError === 'string' ? authError : 'Problème d\'authentification. Veuillez vous reconnecter.'}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Téléchargement de PDF</h2>
            
            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md">
              <p>Sélectionnez un fichier PDF pour le télécharger et générer un QCM à partir de son contenu.</p>
              <p className="text-sm mt-1">Taille maximale: 10 MB</p>
            </div>
            
            {uploadSuccess && fileId ? (
              <div className="mt-6">
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <p>Le fichier <strong>{fileName}</strong> a été téléchargé avec succès!</p>
                      <div className="flex justify-between mt-2">
                        <Button 
                          onClick={() => {
                            setUploadSuccess(false);
                            setFileId(null);
                            setFileName(null);
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
                        >
                          Télécharger un autre fichier
                        </Button>
                        
                        <Button
                          onClick={() => navigate('/')}
                          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
                        >
                          Retourner au QCM
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <PdfUploadComponent 
                apiUrl={API_URL}
                onUploadSuccess={handleUploadSuccess}
              />
            )}
            
            {uploadAttempted && !uploadSuccess && (
              <div className="mt-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    L'upload a échoué. Assurez-vous que le fichier est un PDF valide et qu'il ne dépasse pas 10 MB.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfUploadPage;