// src/services/adminService.ts
import { API_URL, getAuthHeaders } from '../config';

// Types pour les données d'administration
export interface UserData {
  id: number;
  email: string;
  full_name?: string | null;
  profile_picture?: string | null;
  is_verified: boolean;
  is_superuser: boolean;
  is_active: boolean;
  created_at: string;
  login_type: string;
}

export interface SessionData {
  token_id: number;
  user_id: number;
  user_email: string;
  user_fullname: string | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface AdminResponse {
  success: boolean;
  count: number;
  [key: string]: any;
  users?: UserData[];
  sessions?: SessionData[];
}


// Interface spécifique pour la réponse des utilisateurs
export interface UsersResponse extends AdminResponse {
  users?: UserData[];
}

// Interface spécifique pour la réponse des sessions
export interface SessionsResponse extends AdminResponse {
  sessions?: SessionData[];
}

// Service d'administration
export const adminService = {
  // Récupérer la liste des utilisateurs
  async getUsers(token: string): Promise<UsersResponse> {
    const response = await fetch(`${API_URL}/admin/users`, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },

  // Récupérer la liste des sessions
  async getSessions(token: string): Promise<SessionsResponse> {
    const response = await fetch(`${API_URL}/admin/sessions`, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },

  // Révoquer une session (déconnecter un utilisateur)
  async revokeSession(token: string, sessionId: number): Promise<{success: boolean; message: string}> {
    const response = await fetch(`${API_URL}/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },

  // Désactiver un compte utilisateur
  async disableUser(token: string, userId: number): Promise<{success: boolean; message: string}> {
    const response = await fetch(`${API_URL}/admin/users/${userId}/disable`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },

  // Activer un compte utilisateur
  async enableUser(token: string, userId: number): Promise<{success: boolean; message: string}> {
    const response = await fetch(`${API_URL}/admin/users/${userId}/enable`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  }
};