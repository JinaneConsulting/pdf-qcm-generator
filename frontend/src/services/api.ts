// Créer un service API centralisé (src/services/api.ts)
import { API_URL, BASIC_AUTH } from '../config';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

export async function apiRequest<T>(endpoint: string, options: ApiOptions = {}, token?: string | null): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization-Tunnel': BASIC_AUTH,
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    body: options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || `Error ${response.status}: ${response.statusText}`;
    } catch (e) {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Exemple d'utilisation pour l'authentification
export const authService = {
  login: (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    return apiRequest<{access_token: string; user: any}>('/auth/login', {
      method: 'POST',
      body: formData,
    });
  },
  
  register: (email: string, password: string) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    return apiRequest<{access_token: string; user: any}>('/auth/register', {
      method: 'POST',
      body: formData,
    });
  },
  
  logout: (token: string) => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    }, token);
  },
  
  getCurrentUser: (token: string) => {
    return apiRequest<any>('/custom/me', {}, token);
  },
  
  getSessions: (token: string) => {
    return apiRequest<{sessions: any[]}>('/auth/sessions/active', {}, token);
  },
  
  revokeSession: (token: string, sessionId: number) => {
    return apiRequest(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    }, token);
  },
}