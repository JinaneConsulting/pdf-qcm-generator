import React, { useState, useEffect } from 'react';
import UnifiedSidebar from './components/layout/UnifiedSidebar';
import PdfUploadComponent from './PdfUploadComponent';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { API_URL } from './config';
import { AlertTriangle } from 'lucide-react';

const PdfUploadPage: React.FC = () => {
  // ⚠️ Une seule ligne destructuration useAuth
  const { token, isLoading, error: authError } = useAuth();
  
  // Supprimé le double appel à useAuth() qui causait les erreurs de redéclaration
  
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadAttempted, setUploadAttempted] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const handleUploadSuccess = (id: string, name: string) => {
    ('Upload successful, ID:', id, 'Name:', name);
    setFileId(id);
    setFileName(name);
    setUploadSuccess(true);
    setUploadAttempted(true);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
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
    <div className="flex h-screen bg-quizzai-gradient">
      <UnifiedSidebar 
        currentPage="upload"
        onNavigate={handleNavigate}
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">QuizzAi</h1>
          <h2 className="text-xl text-gray-600 mb-8">Télécharger un PDF</h2>
          
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
                          className="bg-quizzai-gradient-strong hover:opacity-90 text-white py-2 px-4 rounded-md"
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