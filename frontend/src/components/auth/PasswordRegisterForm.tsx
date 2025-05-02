import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { BASIC_AUTH, getApiUrl } from '../../config';

interface RegisterFormProps {
  onToggleForm: () => void;
}

const PasswordRegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm }) => {
  const { setToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation locale
    if (password !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setPasswordError(null);
    setError(null);
    setIsLoading(true);
    
    try {
      // Utiliser l'URL API complète - debug
      const apiUrl = getApiUrl();
      console.log('URL API complète:', apiUrl);
      console.log('Tentative d\'inscription avec:', { email });
      
      // Utiliser notre nouvelle API d'inscription par mot de passe
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      // Demande directe à l'URL complète de l'API
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: formData
      });

      console.log('Status de la réponse:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Réponse d\'erreur:', responseText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || 'Erreur lors de l\'inscription';
        } catch (e) {
          errorMessage = `Erreur (${response.status}): ${responseText || 'Erreur lors de l\'inscription'}`;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      console.log('Réponse brute:', responseText);
      
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
      console.error('Registration error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const apiUrl = getApiUrl();
      window.location.href = `${apiUrl}/auth/google/login`;
    } catch (error) {
      console.error('Error initiating Google login:', error);
    }
  };

  return (
    <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-md border border-blue-100 shadow-sm">
      <div className="text-center">
        <h1 className="text-xl font-bold text-blue-600">Inscription</h1>
        <p className="mt-2 text-sm text-blue-400">Créez votre compte QuizzAi</p>
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {passwordError && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{passwordError}</AlertDescription>
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

        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-sm text-blue-600">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              Inscription en cours...
            </>
          ) : (
            'S\'inscrire'
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
        <span>Déjà un compte ?</span>{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-blue-600 hover:underline font-medium"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
};

export default PasswordRegisterForm;