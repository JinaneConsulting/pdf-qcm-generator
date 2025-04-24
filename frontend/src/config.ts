// src/config.ts
export const API_BASE_URL = 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';

// URL de l'API
export const API_URL = import.meta.env.VITE_API_URL || API_BASE_URL;

// Identifiants pour le tunnel si nécessaire
export const API_CREDENTIALS = import.meta.env.VITE_API_BASIC_AUTH || 'user:f6f93d86265ff53a7a7e0ac885597bf3';
export const BASIC_AUTH = `Basic ${btoa(API_CREDENTIALS)}`;

// Fonction utilitaire pour obtenir l'URL complète
export function getApiUrl() {
  console.log("URL API utilisée:", API_URL);
  return API_URL;
}