// src/components/admin/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import UnifiedSidebar from '../layout/UnifiedSidebar';
import { adminService, UserData, SessionData } from '../../services/adminService';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
  UserX,
  UserCheck,
  RefreshCw,
  Search,
  AlertCircle,
  Loader2,
  LogOut
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

const AdminPage: React.FC = () => {
  const { user, token, isLoading: authLoading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>('');
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  // Vérifier l'autorisation seulement quand le contexte d'authentification est initialisé
  useEffect(() => {
    console.log("AdminPage: Auth state change", {
      userExists: !!user,
      tokenExists: !!token,
      is_superuser: user?.is_superuser,
      email: user?.email,
      authLoading,
      isInitialized
    });

    // Ne vérifier que lorsque l'initialisation est terminée
    if (!isInitialized) {
      console.log("AdminPage: Auth not yet initialized, waiting...");
      return;
    }

    if (!user || !token) {
      console.log("AdminPage: User not authenticated, redirecting to home");
      navigate('/');
      return;
    }

    if (!user.is_superuser) {
      console.log("AdminPage: User is not admin, redirecting to home");
      setError('Vous n\'avez pas les droits d\'administration');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else {
      console.log("AdminPage: User is admin, staying on page and loading data");
      // Charger les données des utilisateurs maintenant que nous savons que l'utilisateur est admin
      fetchAdminData();
    }
  }, [user, token, navigate, isInitialized]);

  // Fonction pour charger les données admin
  const fetchAdminData = async () => {
    if (!token || !user?.is_superuser) {
      console.log("AdminPage: Not fetching admin data - conditions not met");
      return;
    }

    console.log("AdminPage: Fetching admin data");
    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer la liste des utilisateurs
      const usersResponse = await adminService.getUsers(token);

      // 2. Récupérer les sessions actives
      const sessionsResponse = await adminService.getSessions(token);

      if (usersResponse && usersResponse.users) {
        console.log("AdminPage: Got users", usersResponse.users.length);
        setUsers(usersResponse.users);
      } else {
        console.log("AdminPage: No users in response");
        setUsers([]);
      }

      if (sessionsResponse && sessionsResponse.sessions) {
        console.log("AdminPage: Got sessions", sessionsResponse.sessions.length);
        setSessions(sessionsResponse.sessions);
      } else {
        console.log("AdminPage: No sessions in response");
        setSessions([]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
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
    } catch (err) {
      setError((err as Error).message || `Erreur lors de ${isActive ? 'la désactivation' : 'l\'activation'} du compte`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Fonction pour déconnecter un utilisateur
  const handleLogoutUser = async (sessionId: number, userEmail: string) => {
    if (!token) return;

    setIsActionInProgress(true);
    try {
      // Appel API pour révoquer la session
      await adminService.revokeSession(token, sessionId);

      // Mettre à jour l'état local
      setSessions(prev => prev.filter(session => session.token_id !== sessionId));

      setError(`Session de ${userEmail} révoquée avec succès`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError((err as Error).message || `Erreur lors de la déconnexion de l'utilisateur`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Récupérer les sessions actives pour un utilisateur spécifique
  const getUserSessions = (userId: number) => {
    return sessions.filter(session => session.user_id === userId && session.is_active);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userFilter.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(userFilter.toLowerCase()))
  );

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
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-blue-700">Liste des utilisateurs ({users.length})</h2>
                  <div className="w-72">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-400" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="pl-8 border-blue-100 focus:border-blue-300 focus:ring-blue-200"
                      />
                    </div>
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
                            <TableHead className="text-blue-600">Email</TableHead>
                            <TableHead className="text-blue-600">Nom</TableHead>
                            <TableHead className="text-blue-600">Date d'inscription</TableHead>
                            <TableHead className="text-blue-600">Type de compte</TableHead>
                            <TableHead className="text-blue-600">Statut</TableHead>
                            <TableHead className="text-right text-blue-600">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                Aucun utilisateur trouvé
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => {
                              const userSessions = getUserSessions(user.id);
                              const isConnected = userSessions.length > 0;

                              return (
                                <TableRow key={user.id} className={user.is_superuser ? 'bg-blue-50' : ''}>
                                  <TableCell className="font-medium">{user.email}</TableCell>
                                  <TableCell>{user.full_name || '-'}</TableCell>
                                  <TableCell title={format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}>
                                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
                                  </TableCell>
                                  <TableCell>
                                    {user.login_type === 'oauth' ? (
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
                                    {user.is_active ? (
                                      isConnected ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Connecté
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          Actif
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
                                      {isConnected && userSessions.map(session => (
                                        <Button
                                          key={session.token_id}
                                          variant="outline"
                                          size="sm"
                                          className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                          onClick={() => handleLogoutUser(session.token_id, user.email)}
                                          disabled={isActionInProgress}
                                          title={`Déconnecter la session de ${user.email} (${format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')})`}
                                        >
                                          <LogOut className="h-4 w-4 mr-1" />
                                          Déconnecter
                                        </Button>
                                      ))}

                                      {/* Bouton d'activation/désactivation */}
                                      {user.id !== user?.id && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={user.is_active ? "text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" : "text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"}
                                            >
                                              {user.is_active ? (
                                                <UserX className="h-4 w-4 mr-1" />
                                              ) : (
                                                <UserCheck className="h-4 w-4 mr-1" />
                                              )}
                                              {user.is_active ? 'Désactiver' : 'Activer'}
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="bg-white border border-blue-100">
                                            <DialogHeader>
                                              <DialogTitle className="text-blue-700">
                                                {user.is_active ? 'Désactiver' : 'Activer'} le compte
                                              </DialogTitle>
                                              <DialogDescription>
                                                {user.is_active ? (
                                                  <>
                                                    Êtes-vous sûr de vouloir désactiver le compte de <strong className="text-blue-600">{user.email}</strong> ?<br />
                                                    L'utilisateur sera déconnecté et ne pourra plus se connecter.
                                                  </>
                                                ) : (
                                                  <>
                                                    Êtes-vous sûr de vouloir réactiver le compte de <strong className="text-blue-600">{user.email}</strong> ?<br />
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
                                                variant={user.is_active ? "destructive" : "default"}
                                                onClick={() => handleToggleUserActive(user.id, user.is_active, user.email)}
                                                disabled={isActionInProgress}
                                                className={user.is_active
                                                  ? "bg-red-500 hover:bg-red-600"
                                                  : "bg-green-500 hover:bg-green-600"
                                                }
                                              >
                                                {isActionInProgress && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                                {user.is_active ? 'Désactiver' : 'Activer'}
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