import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Sidebar */}
      <div className="w-72 bg-black text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">Q</span>
          </div>
          <span className="text-xl font-semibold">PDF QCM</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <button 
            className={`w-full ${isLogin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-800 hover:bg-zinc-700'} text-white py-2 px-4 rounded-md flex items-center justify-center gap-2`}
            onClick={() => setIsLogin(true)}
          >
            <span>Connexion</span>
          </button>
          
          <button 
            className={`w-full ${!isLogin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-800 hover:bg-zinc-700'} text-white py-2 px-4 rounded-md flex items-center justify-center gap-2`}
            onClick={() => setIsLogin(false)}
          >
            <span>Inscription</span>
          </button>
        </div>
        
        {/* Bottom actions */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded-md cursor-pointer">
            <span>FR</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {isLogin ? (
          <LoginForm onToggleForm={toggleForm} />
        ) : (
          <RegisterForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
