import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/auth/AuthContext'
import GoogleAuthCallback from './components/auth/GoogleAuthCallback'
import AuthCallback from './components/auth/AuthCallback'
import OAuthErrorPage from './components/auth/OAuthErrorPage'
import ProfilePage from './components/user/ProfilePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<OAuthErrorPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>
)