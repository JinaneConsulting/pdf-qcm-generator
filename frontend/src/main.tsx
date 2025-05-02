// Mettre à jour src/main.tsx pour ajouter la route d'administration

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/auth/AuthContext'
import AdminPage from './components/admin/AdminPage.tsx'
import { SidebarProvider } from './components/layout/SidebarContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/upload-pdf" element={<App page="upload-pdf" />} />
          <Route path="/profile" element={<App page="profile" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth/google/callback" element={<App page="google-callback" />} />
          <Route path="/auth/callback" element={<App page="callback" />} />
          <Route path="/auth/error" element={<App page="error" />} />
        </Routes>
      </SidebarProvider>
      </AuthProvider>
    </Router>
  </StrictMode>
)