import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { BASIC_AUTH, getApiUrl } from '../../config';

interface LoginFormProps {
  onToggleForm: () => void;
}

const PasswordLoginForm: React.FC<LoginFormProps> = ({ onToggleForm }) => {
  const { setToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Utiliser l'URL API complète - debug
      const apiUrl = getApiUrl();
          
      // Utiliser notre nouvelle API d'authentification par mot de passe
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      // Demande directe à l'URL complète de l'API
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: formData
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Réponse d\'erreur:', responseText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || 'Identifiants invalides';
        } catch (e) {
          errorMessage = `Erreur (${response.status}): ${responseText || 'Identifiants invalides'}`;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
           
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Erreur de parsing JSON:', e);
        throw new Error('Format de réponse invalide');
      }

      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      const apiUrl = getApiUrl();
      // Redirection directe vers la route Google OAuth du backend
      window.location.href = `${apiUrl}/auth/google/login`;
    } catch (error) {
      console.error('Error initiating Google login:', error);
    }
  };

  return (
    <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-md border border-blue-100 shadow-sm">
      <div className="text-center">
        <h1 className="text-xl font-bold text-blue-600">Connexion</h1>
        <p className="mt-2 text-sm text-blue-400">Accédez à votre compte QuizzAi</p>
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm text-blue-600">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-9 text-sm border-blue-100 focus:border-blue-300 focus:ring-blue-200"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm text-blue-600">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-9 text-sm border-blue-100 focus:border-blue-300 focus:ring-blue-200"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white h-9"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-blue-100"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-white text-blue-400">Ou</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-9 text-sm border-blue-100 text-blue-600 hover:bg-blue-50"
        onClick={handleGoogleLogin}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-4 h-4 mr-2"
        />
        Continuer avec Google
      </Button>

      <div className="text-center text-xs text-blue-400">
        <span>Pas encore de compte ?</span>{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-blue-600 hover:underline font-medium"
        >
          S'inscrire
        </button>
      </div>
    </div>
  );
};

export default PasswordLoginForm;