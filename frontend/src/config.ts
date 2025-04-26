// src/config.ts - Version améliorée
export const API_BASE_URL = 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';

// URL de l'API
export const API_URL = import.meta.env.VITE_API_URL || API_BASE_URL;

// Identifiants pour le tunnel si nécessaire
export const API_CREDENTIALS = import.meta.env.VITE_API_BASIC_AUTH || 'user:f6f93d86265ff53a7a7e0ac885597bf3';
export const BASIC_AUTH = `Basic ${btoa(API_CREDENTIALS)}`;

// États de debug
export const DEBUG = import.meta.env.DEV || false;

// Fonction utilitaire pour obtenir l'URL complète
export function getApiUrl(path?: string): string {
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const formattedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  
  if (DEBUG) {
    console.log("URL API utilisée:", `${baseUrl}${formattedPath}`);
  }
  
  return `${baseUrl}${formattedPath}`;
}

// Fonction pour les en-têtes d'authentification
export function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization-Tunnel': BASIC_AUTH
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Headers pour les uploads de fichiers
export function getUploadHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Authorization-Tunnel': BASIC_AUTH
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Endpoints pour les PDFs
export const PDF_ENDPOINTS = {
  UPLOAD: '/pdf/upload',
  LIST: '/pdf/list',
  DELETE: (pdfId: string) => `/pdf/${pdfId}`
};

// Endpoints pour l'authentification
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  GOOGLE_LOGIN: '/auth/google/login',
  GOOGLE_CALLBACK: '/auth/google/callback',
  CURRENT_USER: '/custom/me'
};

// Fonction pour logger uniquement en développement
export function devLog(...args: any[]): void {
  if (DEBUG) {
    console.log('[DEV]', ...args);
  }
}