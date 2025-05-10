// src/hooks/useFetch.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { API_URL, BASIC_AUTH } from '../config';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  withCredentials?: boolean;
  cache?: RequestCache;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook personnalisé pour effectuer des requêtes HTTP
 * @param url URL de l'endpoint (relative à API_URL)
 * @param options Options de la requête
 * @returns {Object} État et fonction pour déclencher la requête
 */
export function useFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
) {
  const { token } = useAuth();
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const [shouldFetch, setShouldFetch] = useState<boolean>(false);
  const [controller, setController] = useState<AbortController | null>(null);

  const defaultOptions: FetchOptions = {
    method: 'GET',
    requireAuth: true,
    withCredentials: false,
    cache: 'default',
    ...options,
  };

  const executeFetch = useCallback(async (customBody?: any) => {
    // Annuler une requête précédente si elle existe
    if (controller) {
      controller.abort();
    }

    // Créer un nouveau controller pour cette requête
    const newController = new AbortController();
    setController(newController);

    try {
      setState({ data: null, loading: true, error: null });
      
      // Vérifier l'authentification si requise
      if (defaultOptions.requireAuth && !token) {
        throw new Error('Authentification requise');
      }

      // Préparer les headers
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization-Tunnel': BASIC_AUTH,
        ...defaultOptions.headers,
      };

      // Ajouter le token d'authentification si nécessaire
      if (defaultOptions.requireAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Préparer le body si nécessaire
      let body = undefined;
      if (customBody || defaultOptions.body) {
        const finalBody = customBody || defaultOptions.body;
        
        if (typeof finalBody === 'object' && !(finalBody instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(finalBody);
        } else {
          body = finalBody;
        }
      }

      // Construire l'URL complète
      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

      // Effectuer la requête
      const response = await fetch(url, {
        method: defaultOptions.method,
        headers,
        body,
        credentials: defaultOptions.withCredentials ? 'include' : 'same-origin',
        signal: newController.signal,
        cache: defaultOptions.cache,
      });

      // Vérifier si la réponse est OK
      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // Si la réponse n'est pas du JSON, on garde le message d'erreur par défaut
        }
        
        throw new Error(errorMessage);
      }

      // Gérer la réponse
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      // Ne pas mettre à jour l'état si la requête a été annulée
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
      return null;
    } finally {
      setController(null);
      setShouldFetch(false);
    }
  }, [endpoint, token, defaultOptions]);

  // Déclencher la requête lorsque shouldFetch devient true
  useEffect(() => {
    if (shouldFetch) {
      executeFetch();
    }
  }, [shouldFetch, executeFetch]);

  // Fonction pour déclencher manuellement la requête
  const fetchData = useCallback((customBody?: any) => {
    if (customBody) {
      return executeFetch(customBody);
    } else {
      setShouldFetch(true);
      return null;
    }
  }, [executeFetch]);

  // Fonction pour annuler la requête en cours
  const cancelFetch = useCallback(() => {
    if (controller) {
      controller.abort();
      setController(null);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [controller]);

  return {
    ...state,
    fetchData,
    cancelFetch,
    isLoading: state.loading,
    isError: state.error !== null,
  };
}

export default useFetch;