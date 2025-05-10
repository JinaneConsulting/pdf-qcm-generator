// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import AdminPage from './components/admin/AdminPage.tsx'
import FolderPage from './components/folders/FoldersPage.tsx'
import ProfilePage from './components/auth/ProfilePage.tsx'
import AuthPage from './components/auth/AuthPage.tsx'
import GoogleAuthCallback from './components/auth/GoogleAuthCallback.tsx'
import AuthCallback from './components/auth/AuthCallback.tsx'
import OAuthErrorPage from './components/auth/OAuthErrorPage.tsx'
import { SidebarProvider } from './contexts/SidebarContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SidebarProvider defaultCollapsed={true}>
        <Router>
          <Routes>
            {/* Pages principales */}
            <Route path="/" element={<App />} />
            <Route path="/upload-pdf" element={<App page="upload-pdf" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/folders" element={<FolderPage />} />
            
            {/* Routes d'authentification */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<OAuthErrorPage />} />
          </Routes>
        </Router>
      </SidebarProvider>
    </AuthProvider>
  </StrictMode>
)