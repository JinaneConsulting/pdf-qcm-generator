import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"processing" | "redirecting" | "error">("processing");

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
               
        // Récupérer les paramètres de l'URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        const token = params.get('token'); // Si le token est directement dans l'URL
        
        // Si on a déjà un token dans l'URL (depuis le backend)
        if (token) {
          localStorage.setItem('token', token);
          setToken(token);
          setStatus("redirecting");
          
          // Redirection vers la page principale
          setTimeout(() => {
            navigate('/');
          }, 500);
          return;
        }

        // Si pas de code, c'est une erreur
        if (!code) {
          console.error("No code or token found in URL");
          setError("Authentification Google échouée: aucun code d'autorisation trouvé");
          setStatus("error");
          return;
        }

        // Envoyer le code au backend pour obtenir un token
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const apiCredentials = import.meta.env.VITE_API_CREDENTIALS || '';
        
        const response = await fetch(`${apiUrl}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization-Tunnel': `Basic ${btoa(apiCredentials)}`
          },
          body: JSON.stringify({ code, state }),
        });

        // Vérifier la réponse
        if (!response.ok) {
          console.error("Backend response error:", response.status, response.statusText);
          const errorData = await response.json().catch(() => ({ detail: "Erreur de connexion au serveur" }));
          throw new Error(errorData.detail || "Échec de l'authentification Google");
        }

        // Récupérer le token
        const data = await response.json();
                
        // Stocker le token et mettre à jour le contexte
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setStatus("redirecting");
        
        // Redirection vers la page principale
        setTimeout(() => {
          navigate('/');
        }, 500);
      } catch (error) {
        console.error("Google auth callback error:", error);
        setError((error as Error).message || "Une erreur s'est produite lors de l'authentification Google");
        setStatus("error");
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setToken]);

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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 text-center bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold">Authentification Google en cours</h2>
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

export default GoogleAuthCallback;