import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/auth/AuthContext'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/upload-pdf" element={<App page="upload" />} />
          <Route path="/profile" element={<App page="profile" />} />
          <Route path="/auth/google/callback" element={<App page="google-callback" />} />
          <Route path="/auth/callback" element={<App page="callback" />} />
          <Route path="/auth/error" element={<App page="error" />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>
)