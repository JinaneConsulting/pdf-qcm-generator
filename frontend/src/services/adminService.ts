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
  last_login?: string | null; // Ajout de la propriété de dernière connexion
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
  ip_address?: string; // Ajout de l'adresse IP pour plus d'informations
  user_agent?: string; // Ajout de l'agent utilisateur pour identifier l'appareil
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
  async revokeSession(token: string, sessionId: number): Promise<{ success: boolean; message: string }> {
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

  // Révoquer toutes les sessions d'un utilisateur
  async revokeAllUserSessions(token: string, userId: number): Promise<{ success: boolean; message: string; count: number }> {
    // Récupérer d'abord toutes les sessions
    const sessionsResponse = await this.getSessions(token);
    const userSessions = sessionsResponse.sessions?.filter(session => session.user_id === userId) || [];
    
    // Si aucune session trouvée, retourner directement
    if (userSessions.length === 0) {
      return { success: true, message: "Aucune session active à révoquer", count: 0 };
    }
    
    // Révoquer chaque session une par une
    const revocationPromises = userSessions.map(session => 
      this.revokeSession(token, session.token_id)
    );
    
    // Attendre que toutes les révocations soient terminées
    await Promise.all(revocationPromises);
    
    return { 
      success: true, 
      message: `${userSessions.length} session(s) révoquée(s) avec succès`, 
      count: userSessions.length 
    };
  },

  // Désactiver un compte utilisateur
  async disableUser(token: string, userId: number): Promise<{ success: boolean; message: string }> {
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
  async enableUser(token: string, userId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/admin/users/${userId}/enable`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },
  
  // Créer ou modifier un utilisateur (pour les administrateurs)
  async manageUser(token: string, userData: Partial<UserData>, isEdit: boolean = false): Promise<{ success: boolean; message: string; user?: UserData }> {
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/admin/users/${userData.id}` : `${API_URL}/admin/users`;
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erreur ${response.status}`);
    }

    return await response.json();
  },
  
  // Obtenir des statistiques sur les utilisateurs et les sessions
  async getStats(token: string): Promise<{ 
    total_users: number; 
    active_users: number; 
    connected_users: number;
    oauth_users: number;
    password_users: number;
    active_sessions: number;
  }> {
    // Récupérer les données des utilisateurs et des sessions
    const [usersResponse, sessionsResponse] = await Promise.all([
      this.getUsers(token),
      this.getSessions(token)
    ]);
    
    const users = usersResponse.users || [];
    const sessions = sessionsResponse.sessions || [];
    
    // Calculer les statistiques
    const total_users = users.length;
    const active_users = users.filter(user => user.is_active).length;
    const oauth_users = users.filter(user => user.login_type === 'oauth').length;
    const password_users = users.filter(user => user.login_type !== 'oauth').length;
    
    // Utilisateurs connectés = utilisateurs avec au moins une session active
    const userIdsWithSession = new Set(sessions.map(session => session.user_id));
    const connected_users = userIdsWithSession.size;
    
    // Nombre total de sessions actives
    const active_sessions = sessions.length;
    
    return {
      total_users,
      active_users,
      connected_users,
      oauth_users,
      password_users,
      active_sessions
    };
  }
};