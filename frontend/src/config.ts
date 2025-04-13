// src/config.ts

const DEFAULT_API_URL = 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';

// Exemple : https://user:token@localhost:8080
const RAW_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


let apiUrl = DEFAULT_API_URL;
let basicAuth = '';

if (RAW_URL?.includes('@')) {
  try {
    const url = new URL(RAW_URL);
    apiUrl = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
    basicAuth = 'Basic ' + btoa(`${url.username}:${url.password}`);
  } catch (e) {
    console.warn("URL invalide dans VITE_API_URL, fallback utilisé.");
  }
} else if (RAW_URL) {
  apiUrl = RAW_URL;
}

export const API_URL = apiUrl;
export const BASIC_AUTH = basicAuth;
