// src/components/admin/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import UnifiedSidebar from '../layout/UnifiedSidebar';
import { adminService, UserData, SessionData } from '../../services/adminService';
import { format, formatDistanceToNow, parseISO, isAfter, isBefore, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
  UserX,
  UserCheck,
  RefreshCw,
  Search,
  AlertCircle,
  Loader2,
  LogOut,
  BarChart,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  CalendarIcon,
  ArrowUpDown,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

// Types pour les filtres
type UserStatus = 'all' | 'active' | 'inactive' | 'connected' | 'disconnected';
type UserType = 'all' | 'oauth' | 'password';
type DateRange = {
  from: Date | null;
  to: Date | null;
};

// Type pour le tri
type SortKey = 'email' | 'fullName' | 'createdAt' | 'lastLogin' | 'loginType' | 'status' | null;
type SortDirection = 'asc' | 'desc';

interface UserFilters {
  search: string;
  status: UserStatus;
  accountType: UserType;
  registrationDate: DateRange;
  lastLoginDate: DateRange;
  isAdmin: boolean | null;
}

// Composant DatePicker simplifié
const SimpleDatePicker: React.FC<{
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}> = ({ selected, onSelect }) => {
  return (
    <div className="relative">
      <Input
        type="date"
        value={selected ? format(selected, 'yyyy-MM-dd') : ''}
        onChange={(e) => {
          const value = e.target.value;
          if (value) {
            onSelect(new Date(value));
          } else {
            onSelect(null);
          }
        }}
        className="pl-8 border-blue-100"
      />
      <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-blue-400" />
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { user, token, isLoading: authLoading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  
  // État pour la pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // État pour les filtres
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: 'all',
    accountType: 'all',
    registrationDate: { from: null, to: null },
    lastLoginDate: { from: null, to: null },
    isAdmin: null
  });
  
  // État pour le tri
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // État pour le compteur de filtres actifs
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  const [stats, setStats] = useState<{
    total_users: number;
    active_users: number;
    connected_users: number;
    oauth_users: number;
    password_users: number;
    active_sessions: number;
  } | null>(null);

  // Vérifier l'autorisation seulement quand le contexte d'authentification est initialisé
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!user || !token) {
      navigate('/');
      return;
    }

    if (!user.is_superuser) {
      setError('Vous n\'avez pas les droits d\'administration');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else {
      fetchAdminData();
    }
  }, [user, token, navigate, isInitialized]);

  // Effet pour mettre à jour le nombre total de pages quand les utilisateurs ou les filtres changent
  useEffect(() => {
    const filteredUsers = getFilteredUsers();
    setTotalPages(Math.ceil(filteredUsers.length / itemsPerPage));
    // Si la page actuelle est supérieure au nombre total de pages, revenir à la première page
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [users, filters, itemsPerPage]);
  
  // Effet pour calculer le nombre de filtres actifs
  useEffect(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.accountType !== 'all') count++;
    if (filters.registrationDate.from || filters.registrationDate.to) count++;
    if (filters.lastLoginDate.from || filters.lastLoginDate.to) count++;
    if (filters.isAdmin !== null) count++;
    setActiveFilterCount(count);
  }, [filters]);

  // Fonction pour calculer les statistiques
  const calculateStats = () => {
    // Total des utilisateurs
    const total_users = users.length;
    
    // Utilisateurs actifs (non désactivés)
    const active_users = users.filter(u => u.is_active).length;
    
    // Utilisateurs connectés (avec au moins une session active)
    const connectedUserIds = new Set();
    sessions.forEach(session => connectedUserIds.add(session.user_id));
    const connected_users = connectedUserIds.size;
    
    // Utilisateurs par type d'authentification
    const oauth_users = users.filter(u => u.login_type === 'oauth').length;
    const password_users = users.filter(u => u.login_type !== 'oauth').length;
    
    // Sessions actives
    const active_sessions = sessions.length;
    
    setStats({
      total_users,
      active_users,
      connected_users,
      oauth_users,
      password_users,
      active_sessions
    });
  };

  // Fonction pour charger les données admin
  const fetchAdminData = async () => {
    if (!token || !user?.is_superuser) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer la liste des utilisateurs
      const usersResponse = await adminService.getUsers(token);

      // 2. Récupérer les sessions actives
      const sessionsResponse = await adminService.getSessions(token);

      if (usersResponse && usersResponse.users) {
        setUsers(usersResponse.users);
      } else {
        setUsers([]);
      }

      if (sessionsResponse && sessionsResponse.sessions) {
        setSessions(sessionsResponse.sessions);
      } else {
        setSessions([]);
      }
      
      // Calculer les statistiques
      setTimeout(() => calculateStats(), 100);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la récupération des données d\'administration');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAdminData();
  };

  const handleToggleUserActive = async (userId: number, isActive: boolean, userEmail: string) => {
    if (!token) return;

    setIsActionInProgress(true);
    try {
      if (isActive) {
        await adminService.disableUser(token, userId);
      } else {
        await adminService.enableUser(token, userId);
      }

      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, is_active: !isActive } : user
      ));

      setError(`Compte de ${userEmail} ${isActive ? 'désactivé' : 'activé'} avec succès`);
      setTimeout(() => setError(null), 3000);
      
      // Mettre à jour les statistiques
      setTimeout(() => calculateStats(), 100);
    } catch (err) {
      setError((err as Error).message || `Erreur lors de ${isActive ? 'la désactivation' : 'l\'activation'} du compte`);
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  // Fonction pour déconnecter toutes les sessions d'un utilisateur
  const handleLogoutAllSessions = async (userId: number, userEmail: string) => {
    if (!token) return;

    setIsActionInProgress(true);
    try {
      const userSessions = getUserSessions(userId);
      
      // Si aucune session, rien à faire
      if (userSessions.length === 0) {
        setError(`Aucune session active pour ${userEmail}`);
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      // Révoquer chaque session
      for (const session of userSessions) {
        await adminService.revokeSession(token, session.token_id);
      }
      
      // Mettre à jour l'état local
      setSessions(prev => prev.filter(session => session.user_id !== userId));

      setError(`Toutes les sessions de ${userEmail} (${userSessions.length}) ont été révoquées avec succès`);
      setTimeout(() => setError(null), 3000);
      
      // Mettre à jour les statistiques
      setTimeout(() => calculateStats(), 100);
    } catch (err) {
      setError((err as Error).message || `Erreur lors de la déconnexion des sessions de l'utilisateur`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Récupérer les sessions actives pour un utilisateur spécifique
  const getUserSessions = (userId: number) => {
    return sessions.filter(session => session.user_id === userId);
  };

  // Vérifier si un utilisateur a au moins une session active
  const isUserConnected = (userId: number): boolean => {
    return getUserSessions(userId).length > 0;
  };
  
  // Fonction pour réinitialiser tous les filtres
  const resetAllFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      accountType: 'all',
      registrationDate: { from: null, to: null },
      lastLoginDate: { from: null, to: null },
      isAdmin: null
    });
  };
  
  // Fonction pour appliquer les filtres aux utilisateurs
  const getFilteredUsers = () => {
    return users.filter(userData => {
      // Filtre de recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const emailMatch = userData.email.toLowerCase().includes(searchLower);
        const nameMatch = userData.full_name ? userData.full_name.toLowerCase().includes(searchLower) : false;
        if (!emailMatch && !nameMatch) return false;
      }
      
      // Filtre de statut
      switch (filters.status) {
        case 'active':
          if (!userData.is_active) return false;
          break;
        case 'inactive':
          if (userData.is_active) return false;
          break;
        case 'connected':
          if (!userData.is_active || !isUserConnected(userData.id)) return false;
          break;
        case 'disconnected':
          if (!userData.is_active || isUserConnected(userData.id)) return false;
          break;
      }
      
      // Filtre de type de compte
      if (filters.accountType === 'oauth' && userData.login_type !== 'oauth') return false;
      if (filters.accountType === 'password' && userData.login_type === 'oauth') return false;
      
      // Filtre de date d'inscription
      if (filters.registrationDate.from || filters.registrationDate.to) {
        const registrationDate = parseISO(userData.created_at);
        
        if (filters.registrationDate.from && isBefore(registrationDate, filters.registrationDate.from)) {
          return false;
        }
        
        if (filters.registrationDate.to) {
          const endDate = new Date(filters.registrationDate.to);
          endDate.setHours(23, 59, 59, 999); // Fin de la journée
          if (isAfter(registrationDate, endDate)) {
            return false;
          }
        }
      }
      
      // Filtre de dernière connexion
      if (filters.lastLoginDate.from || filters.lastLoginDate.to) {
        // Si l'utilisateur ne s'est jamais connecté
        if (!userData.last_login) return false;
        
        const lastLoginDate = parseISO(userData.last_login);
        
        if (filters.lastLoginDate.from && isBefore(lastLoginDate, filters.lastLoginDate.from)) {
          return false;
        }
        
        if (filters.lastLoginDate.to) {
          const endDate = new Date(filters.lastLoginDate.to);
          endDate.setHours(23, 59, 59, 999); // Fin de la journée
          if (isAfter(lastLoginDate, endDate)) {
            return false;
          }
        }
      }
      
      // Filtre d'administrateur
      if (filters.isAdmin !== null) {
        if (filters.isAdmin !== userData.is_superuser) return false;
      }
      
      return true;
    });
  };
  
  // Fonction pour trier les utilisateurs
  const getSortedUsers = (users: UserData[]) => {
    if (!sortKey) return users;
    
    return [...users].sort((a, b) => {
      let comparison = 0;
      
      switch (sortKey) {
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'fullName':
          const nameA = a.full_name || '';
          const nameB = b.full_name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'createdAt':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'lastLogin':
          // Gérer le cas où lastLogin est null
          if (!a.last_login && !b.last_login) comparison = 0;
          else if (!a.last_login) comparison = 1;
          else if (!b.last_login) comparison = -1;
          else comparison = new Date(a.last_login).getTime() - new Date(b.last_login).getTime();
          break;
        case 'loginType':
          const typeA = a.login_type || '';
          const typeB = b.login_type || '';
          comparison = typeA.localeCompare(typeB);
          break;
        case 'status':
          // Trier par statut actif, puis par connexion
          if (a.is_active !== b.is_active) {
            comparison = a.is_active ? -1 : 1;
          } else if (a.is_active) { // Les deux sont actifs
            const aConnected = isUserConnected(a.id);
            const bConnected = isUserConnected(b.id);
            comparison = aConnected === bConnected ? 0 : (aConnected ? -1 : 1);
          }
          break;
      }
      
      // Inverser l'ordre pour le tri descendant
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Fonction pour gérer le clic sur un en-tête de colonne
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Si on clique sur la même colonne, on inverse l'ordre
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Sinon, on change de colonne et on commence par l'ordre ascendant
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Obtenir les utilisateurs de la page courante (filtrés et triés)
  const getCurrentPageUsers = () => {
    const filteredUsers = getFilteredUsers();
    const sortedUsers = getSortedUsers(filteredUsers);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  };

  // Fonctions de navigation pour la pagination
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Gérer le changement du nombre d'éléments par page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Retourner à la première page lors du changement
  };

  // Formater la date de dernière connexion
  const formatLastLogin = (lastLogin?: string | null): string => {
    if (!lastLogin) return "Jamais connecté";
    
    try {
      const date = new Date(lastLogin);
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return "Date invalide";
    }
  };
  
  // Fonction pour créer des filtres prédéfinis
  const applyPresetFilter = (preset: string) => {
    switch (preset) {
      case 'recent':
        // Utilisateurs inscrits dans les 7 derniers jours
        setFilters({
          ...filters,
          registrationDate: { 
            from: subDays(new Date(), 7), 
            to: new Date() 
          }
        });
        break;
      case 'admins':
        // Tous les administrateurs
        setFilters({
          ...filters,
          isAdmin: true
        });
        break;
      case 'connected':
        // Utilisateurs actuellement connectés
        setFilters({
          ...filters,
          status: 'connected'
        });
        break;
      case 'inactive':
        // Comptes désactivés
        setFilters({
          ...filters,
          status: 'inactive'
        });
        break;
      case 'google':
        // Utilisateurs Google
        setFilters({
          ...filters,
          accountType: 'oauth'
        });
        break;
    }
  };
  
  // Fonction pour obtenir l'icône de tri
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Afficher un écran de chargement pendant l'authentification
  if (authLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg border border-blue-100">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
            <h1 className="mt-4 text-2xl font-bold text-blue-600">Vérification des droits d'accès</h1>
            <p className="mt-2 text-gray-600">
              Veuillez patienter pendant la vérification de vos droits d'administration...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error page if not authorized (after loading)
  if (user && !user.is_superuser) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg border border-blue-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-red-600">Accès non autorisé</h1>
            <p className="mt-2 text-gray-600">
              Vous n'avez pas les droits nécessaires pour accéder à cette page d'administration.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-blue-50">
      <UnifiedSidebar
        currentPage="admin"
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-blue-600">Panel d'administration</h1>

            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-100"
              disabled={loading || isActionInProgress}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </Button>
          </div>

          {error && (
            <Alert className={`mb-6 ${error.includes('succès') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tableau de bord avec statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-white border border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md text-blue-600 flex items-center gap-2">
                    <User size={16} />
                    Utilisateurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_users}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {stats.active_users} actifs
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {stats.total_users - stats.active_users} désactivés
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md text-blue-600 flex items-center gap-2">
                    <Clock size={16} />
                    Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.active_sessions}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {stats.connected_users} utilisateurs connectés
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md text-blue-600 flex items-center gap-2">
                    <BarChart size={16} />
                    Types de comptes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_users}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {stats.oauth_users} Google
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {stats.password_users} Email/Mot de passe
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-6 bg-white border border-blue-100">
              <TabsTrigger
                value="users"
                className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
              >
                <Users size={16} />
                Utilisateurs
              </TabsTrigger>
            </TabsList>

            {/* Tab: Users */}
            <TabsContent value="users" className="space-y-4">
              <div className="bg-white rounded-lg border border-blue-100 shadow-sm p-6">
                {/* Barre d'outils */}
                <div className="mb-4 flex flex-col md:flex-row gap-4 items-start">
                  {/* Champ de recherche */}
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-400" />
                    <Input
                      placeholder="Rechercher par email, nom..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-8 border-blue-100 focus:border-blue-300 focus:ring-blue-200"
                    />
                  </div>
                  
                  {/* Filtres rapides */}
                  <div className="flex flex-wrap gap-2 md:ml-auto">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="border-blue-100 text-blue-600 flex items-center gap-2"
                        >
                          <Filter size={16} />
                          Filtres
                          {activeFilterCount > 0 && (
                            <Badge className="ml-1 bg-blue-500">{activeFilterCount}</Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 md:w-96">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Filtres avancés</h3>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={resetAllFilters}
                              className="h-8 text-gray-500 hover:text-gray-900"
                            >
                              Réinitialiser
                            </Button>
                          </div>
                          
                          {/* Statut du compte */}
                          <div>
                            <Label className="block mb-2 font-medium">Statut</Label>
                            <Select 
                              value={filters.status} 
                              onValueChange={(value: UserStatus) => setFilters({ ...filters, status: value })}
                            >
                              <SelectTrigger className="w-full border-gray-200 bg-white">
                                <SelectValue placeholder="Tous les statuts" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actifs</SelectItem>
                                <SelectItem value="inactive">Désactivés</SelectItem>
                                <SelectItem value="connected">Connectés</SelectItem>
                                <SelectItem value="disconnected">Déconnectés</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Type de compte */}
                          <div>
                            <Label className="block mb-2 font-medium">Type de compte</Label>
                            <Select 
                              value={filters.accountType} 
                              onValueChange={(value: UserType) => setFilters({ ...filters, accountType: value })}
                            >
                              <SelectTrigger className="w-full border-gray-200 bg-white">
                                <SelectValue placeholder="Tous les types" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="oauth">Google</SelectItem>
                                <SelectItem value="password">Email/Mot de passe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Date d'inscription */}
                          <div>
                            <Label className="block mb-2 font-medium">Date d'inscription</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">Du</Label>
                                <SimpleDatePicker 
                                  selected={filters.registrationDate.from}
                                  onSelect={(date) => 
                                    setFilters({ 
                                      ...filters, 
                                      registrationDate: { 
                                        ...filters.registrationDate, 
                                        from: date 
                                      } 
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Au</Label>
                                <SimpleDatePicker 
                                  selected={filters.registrationDate.to}
                                  onSelect={(date) => 
                                    setFilters({ 
                                      ...filters, 
                                      registrationDate: { 
                                        ...filters.registrationDate, 
                                        to: date 
                                      } 
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Dernière connexion */}
                          <div>
                            <Label className="block mb-2 font-medium">Dernière connexion</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">Du</Label>
                                <SimpleDatePicker 
                                  selected={filters.lastLoginDate.from}
                                  onSelect={(date) => 
                                    setFilters({ 
                                      ...filters, 
                                      lastLoginDate: { 
                                        ...filters.lastLoginDate, 
                                        from: date 
                                      } 
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Au</Label>
                                <SimpleDatePicker 
                                  selected={filters.lastLoginDate.to}
                                  onSelect={(date) => 
                                    setFilters({ 
                                      ...filters, 
                                      lastLoginDate: { 
                                        ...filters.lastLoginDate, 
                                        to: date 
                                      } 
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Droits administrateur */}
                          <div>
                            <Label className="block mb-2 font-medium">Droits</Label>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="admin-yes"
                                  checked={filters.isAdmin === true}
                                  onCheckedChange={() => 
                                    setFilters({ 
                                      ...filters, 
                                      isAdmin: filters.isAdmin === true ? null : true 
                                    })
                                  }
                                />
                                <Label htmlFor="admin-yes" className="text-sm">
                                  Administrateurs
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="admin-no"
                                  checked={filters.isAdmin === false}
                                  onCheckedChange={() => 
                                    setFilters({ 
                                      ...filters, 
                                      isAdmin: filters.isAdmin === false ? null : false 
                                    })
                                  }
                                />
                                <Label htmlFor="admin-no" className="text-sm">
                                  Utilisateurs standards
                                </Label>
                              </div>
                            </div>
                          </div>
                          
                          {/* Boutons filtres prédéfinis */}
                          <div className="pt-2 border-t border-gray-100">
                            <Label className="block mb-2 font-medium">Filtres rapides</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyPresetFilter('recent')}
                                className="text-xs"
                              >
                                Nouveaux (7j)
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyPresetFilter('admins')}
                                className="text-xs"
                              >
                                Administrateurs
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyPresetFilter('connected')}
                                className="text-xs"
                              >
                                Connectés
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyPresetFilter('inactive')}
                                className="text-xs"
                              >
                                Désactivés
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyPresetFilter('google')}
                                className="text-xs"
                              >
                                Google
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Filtres actifs */}
                    {activeFilterCount > 0 && (
                      <div className="flex flex-wrap gap-2 items-center mt-2 md:mt-0">
                        {filters.status !== 'all' && (
                          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            {filters.status === 'active' && 'Actifs'}
                            {filters.status === 'inactive' && 'Désactivés'}
                            {filters.status === 'connected' && 'Connectés'}
                            {filters.status === 'disconnected' && 'Déconnectés'}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-4 w-4 p-0 ml-1 text-blue-800"
                              onClick={() => setFilters({...filters, status: 'all'})}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        
                        {filters.accountType !== 'all' && (
                          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            {filters.accountType === 'oauth' && 'Google'}
                            {filters.accountType === 'password' && 'Email/Mot de passe'}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-4 w-4 p-0 ml-1 text-blue-800"
                              onClick={() => setFilters({...filters, accountType: 'all'})}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        
                        {(filters.registrationDate.from || filters.registrationDate.to) && (
                          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            Inscription: {filters.registrationDate.from ? format(filters.registrationDate.from, 'dd/MM/yyyy') : '...'} 
                            {filters.registrationDate.to ? ` - ${format(filters.registrationDate.to, 'dd/MM/yyyy')}` : ' - ...'}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-4 w-4 p-0 ml-1 text-blue-800"
                              onClick={() => setFilters({...filters, registrationDate: { from: null, to: null }})}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        
                        {(filters.lastLoginDate.from || filters.lastLoginDate.to) && (
                          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            Connexion: {filters.lastLoginDate.from ? format(filters.lastLoginDate.from, 'dd/MM/yyyy') : '...'} 
                            {filters.lastLoginDate.to ? ` - ${format(filters.lastLoginDate.to, 'dd/MM/yyyy')}` : ' - ...'}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-4 w-4 p-0 ml-1 text-blue-800"
                              onClick={() => setFilters({...filters, lastLoginDate: { from: null, to: null }})}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        
                        {filters.isAdmin !== null && (
                          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            {filters.isAdmin ? 'Administrateurs' : 'Utilisateurs standards'}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-4 w-4 p-0 ml-1 text-blue-800"
                              onClick={() => setFilters({...filters, isAdmin: null})}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        
                        {activeFilterCount > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetAllFilters}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Tout effacer
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Sélection du nombre d'éléments par page */}
                  <div className="flex items-center gap-2 ml-auto mt-2">
                    <span className="text-sm text-gray-600">Afficher</span>
                    <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                      <SelectTrigger className="w-[70px] border-blue-100">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">par page</span>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="animate-spin h-12 w-12 text-blue-400" />
                  </div>
                ) : (
                  <div className="rounded-md border border-blue-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-blue-50">
                          <TableRow>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('email')}
                            >
                              <div className="flex items-center">
                                Email
                                {getSortIcon('email')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('fullName')}
                            >
                              <div className="flex items-center">
                                Nom
                                {getSortIcon('fullName')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('createdAt')}
                            >
                              <div className="flex items-center">
                                Date d'inscription
                                {getSortIcon('createdAt')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('lastLogin')}
                            >
                              <div className="flex items-center">
                                Dernière connexion
                                {getSortIcon('lastLogin')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('loginType')}
                            >
                              <div className="flex items-center">
                                Type de compte
                                {getSortIcon('loginType')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-blue-600 cursor-pointer hover:text-blue-800" 
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center">
                                Statut
                                {getSortIcon('status')}
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-blue-600">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCurrentPageUsers().length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                {getFilteredUsers().length === 0 && filters.search 
                                  ? `Aucun utilisateur ne correspond à la recherche "${filters.search}"`
                                  : activeFilterCount > 0 
                                    ? "Aucun utilisateur ne correspond aux filtres sélectionnés"
                                    : "Aucun utilisateur trouvé"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            getCurrentPageUsers().map((userData) => {
                              const isConnected = isUserConnected(userData.id);
                              const userSessions = getUserSessions(userData.id);
                              const sessionCount = userSessions.length;

                              return (
                                <TableRow key={userData.id} className={userData.is_superuser ? 'bg-blue-50' : ''}>
                                  <TableCell className="font-medium">
                                    {userData.email}
                                    {userData.is_superuser && (
                                      <Badge className="ml-2 bg-purple-100 text-purple-800 border-none">
                                        Admin
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>{userData.full_name || '-'}</TableCell>
                                  <TableCell title={format(new Date(userData.created_at), 'dd/MM/yyyy HH:mm')}>
                                    {formatDistanceToNow(new Date(userData.created_at), { addSuffix: true, locale: fr })}
                                  </TableCell>
                                  <TableCell>
                                    {formatLastLogin(userData.last_login)}
                                  </TableCell>
                                  <TableCell>
                                    {userData.login_type === 'oauth' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Google
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        Email/Mot de passe
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {userData.is_active ? (
                                      isConnected ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Connecté {sessionCount > 1 ? `(${sessionCount})` : ''}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          Déconnecté
                                        </span>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Désactivé
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {/* Bouton de déconnexion (visible uniquement pour les utilisateurs connectés) */}
                                      {isConnected && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                          onClick={() => handleLogoutAllSessions(userData.id, userData.email)}
                                          disabled={isActionInProgress}
                                          title={`Déconnecter ${sessionCount > 1 ? 'les sessions' : 'la session'} de ${userData.email}`}
                                        >
                                          <LogOut className="h-4 w-4 mr-1" />
                                          Déconnecter {sessionCount > 1 ? `(${sessionCount})` : ''}
                                        </Button>
                                      )}

                                      {/* Bouton d'activation/désactivation */}
                                      {user && Number(userData.id) !== Number(user.id) && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={userData.is_active ? "text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" : "text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"}
                                            >
                                              {userData.is_active ? (
                                                <UserX className="h-4 w-4 mr-1" />
                                              ) : (
                                                <UserCheck className="h-4 w-4 mr-1" />
                                              )}
                                              {userData.is_active ? 'Désactiver' : 'Activer'}
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="bg-white border border-blue-100">
                                            <DialogHeader>
                                              <DialogTitle className="text-blue-700">
                                                {userData.is_active ? 'Désactiver' : 'Activer'} le compte
                                              </DialogTitle>
                                              <DialogDescription>
                                                {userData.is_active ? (
                                                  <>
                                                    Êtes-vous sûr de vouloir désactiver le compte de <strong className="text-blue-600">{userData.email}</strong> ?<br />
                                                    L'utilisateur sera déconnecté et ne pourra plus se connecter.
                                                  </>
                                                ) : (
                                                  <>
                                                    Êtes-vous sûr de vouloir réactiver le compte de <strong className="text-blue-600">{userData.email}</strong> ?<br />
                                                    L'utilisateur pourra à nouveau se connecter à l'application.
                                                  </>
                                                )}
                                              </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                              <Button
                                                variant="outline"
                                                onClick={() => { }}
                                                disabled={isActionInProgress}
                                                className="border-blue-100 text-blue-600 hover:bg-blue-50"
                                              >
                                                Annuler
                                              </Button>
                                              <Button
                                                variant={userData.is_active ? "destructive" : "default"}
                                                onClick={() => handleToggleUserActive(userData.id, userData.is_active, userData.email)}
                                                disabled={isActionInProgress}
                                                className={userData.is_active
                                                  ? "bg-red-500 hover:bg-red-600"
                                                  : "bg-green-500 hover:bg-green-600"
                                                }
                                              >
                                                {isActionInProgress && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                                {userData.is_active ? 'Désactiver' : 'Activer'}
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination */}
                    {getFilteredUsers().length > 0 && (
                      <div className="p-4 border-t border-blue-100 flex flex-col md:flex-row justify-between items-center">
                        <div className="text-sm text-gray-500 mb-4 md:mb-0">
                          Affichage de {Math.min((currentPage - 1) * itemsPerPage + 1, getFilteredUsers().length)} à {Math.min(currentPage * itemsPerPage, getFilteredUsers().length)} sur {getFilteredUsers().length} utilisateurs
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="h-8 w-8 border-blue-100"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="h-8 w-8 border-blue-100"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          <span className="px-4 text-sm font-medium">
                            Page {currentPage} sur {totalPages}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 border-blue-100"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 border-blue-100"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;