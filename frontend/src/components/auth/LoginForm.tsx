import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onToggleForm: () => void;
}

const API_BASE_URL = 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';
const API_URL = import.meta.env.VITE_API_URL ? 
  import.meta.env.VITE_API_URL.split('@')[1] : 
  API_BASE_URL;

const API_CREDENTIALS = import.meta.env.VITE_API_URL ? 
  import.meta.env.VITE_API_URL.split('@')[0].replace('https://', '') : 
  'user:f6f93d86265ff53a7a7e0ac885597bf3';

const BASIC_AUTH = `Basic ${btoa(API_CREDENTIALS)}`;

const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm }) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/google/login`, {
        headers: {
          'Accept': 'application/json',
          'Authorization-Tunnel': BASIC_AUTH
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authorization_url;
      } else {
        console.error('Failed to get Google login URL');
      }
    } catch (error) {
      console.error('Error initiating Google login:', error);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-2 text-gray-600">Accédez à votre compte PDF QCM</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
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
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Ou</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-5 h-5 mr-2"
        />
        Continuer avec Google
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Pas encore de compte ?</span>{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-purple-600 hover:underline font-medium"
        >
          S'inscrire
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
