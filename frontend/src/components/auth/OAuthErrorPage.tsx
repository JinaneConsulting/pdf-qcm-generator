// src/components/auth/OAuthErrorPage.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

const OAuthErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const error = query.get('error') || 'Une erreur s\'est produite lors de l\'authentification';

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Échec de l'authentification</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="text-center">
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OAuthErrorPage;