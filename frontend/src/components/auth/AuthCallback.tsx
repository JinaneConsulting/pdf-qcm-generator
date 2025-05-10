import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"processing" | "redirecting" | "error">("processing");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        
        // Extraire le token de l'URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
       
        if (!token) {
          console.error("Aucun token trouvé dans l'URL");
          setError("Aucun token trouvé dans l'URL. L'authentification a échoué.");
          setStatus("error");
          return;
        }
        
        // Stocker le token et mettre à jour le contexte d'authentification
        localStorage.setItem('token', token);
        setToken(token);
        
        // Mettre à jour le statut avant la redirection
        setStatus("redirecting");
        
        // Petite pause pour laisser le temps au contexte de se mettre à jour
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } catch (error) {
        console.error('Error in auth callback:', error);
        setError((error as Error).message || "Une erreur s'est produite lors de l'authentification");
        setStatus("error");
      }
    };

    handleCallback();
  }, [location, navigate, setToken]);

  // Afficher les erreurs
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-red-600">Échec de l'authentification</h2>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              Retour à la page de connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Afficher l'écran de chargement
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 text-center bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold">Authentification en cours</h2>
        <p className="text-gray-600">Veuillez patienter pendant que nous finalisons votre connexion...</p>
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
        </div>
        {status === "redirecting" && (
          <p className="text-green-600">Redirection vers votre tableau de bord...</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;