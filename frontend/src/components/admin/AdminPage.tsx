// src/components/admin/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';
import { adminService, UserData, SessionData } from '../../services/adminService';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LogOut,
  Shield,
  Users,
  Lock,
  UserX,
  UserCheck,
  RefreshCw,
  Search,
  AlertCircle
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

// Restrict access to specific admin email
const ADMIN_EMAIL = 'jchraa@jinane-consulting.com';

const AdminPage: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  // Check if current user is the admin
  useEffect(() => {
    if (!user || !token) {
      navigate('/');
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      setError('Vous n\'avez pas les droits d\'administration');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [user, token, navigate]);

  // Observer for sidebar state
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
          if (sidebarElement) {
            const isCollapsed = sidebarElement.className.includes('w-16');
            setIsSidebarCollapsed(isCollapsed);
          }
        }
      });
    });

    const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
    if (sidebarElement) {
      observer.observe(sidebarElement, { attributes: true });
      setIsSidebarCollapsed(sidebarElement.className.includes('w-16'));
    }

    return () => observer.disconnect();
  }, []);

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!token || user?.email !== ADMIN_EMAIL) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch users and sessions in parallel
        const [usersResponse, sessionsResponse] = await Promise.all([
          adminService.getUsers(token),
          adminService.getSessions(token)
        ]);
        
        setUsers(usersResponse.users || []);
        setSessions(sessionsResponse.sessions || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError((err as Error).message || 'Erreur lors de la récupération des données d\'administration');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, [token, user, refreshTrigger]);

  // Handle data refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle session revocation (logout user)
  const handleRevokeSession = async (sessionId: number, userEmail: string) => {
    if (!token) return;
    
    setIsActionInProgress(true);
    try {
      await adminService.revokeSession(token, sessionId);
      setSessions(prev => prev.filter(session => session.token_id !== sessionId));
      // Show success message
      setError(`Session de ${userEmail} révoquée avec succès`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la révocation de la session');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle user account activation/deactivation
  const handleToggleUserActive = async (userId: number, isActive: boolean, userEmail: string) => {
    if (!token) return;
    
    setIsActionInProgress(true);
    try {
      if (isActive) {
        await adminService.disableUser(token, userId);
      } else {
        await adminService.enableUser(token, userId);
      }
      
      // Update local user data
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: !isActive } : user
      ));
      
      // Update sessions data if user is deactivated
      if (isActive) {
        setSessions(prev => prev.filter(session => session.user_id !== userId));
      }
      
      // Show success message
      setError(`Compte de ${userEmail} ${isActive ? 'désactivé' : 'activé'} avec succès`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError((err as Error).message || `Erreur lors de ${isActive ? 'la désactivation' : 'l\'activation'} du compte`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Filter users based on search input
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(userFilter.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(userFilter.toLowerCase()))
  );

  // Filter sessions based on search input
  const filteredSessions = sessions.filter(session => 
    session.user_email.toLowerCase().includes(sessionFilter.toLowerCase()) ||
    (session.user_fullname && session.user_fullname.toLowerCase().includes(sessionFilter.toLowerCase()))
  );

  // Show error page if not authorized
  if (user && user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-red-600">Accès non autorisé</h1>
            <p className="mt-2 text-gray-600">
              Vous n'avez pas les droits nécessaires pour accéder à cette page d'administration.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="mt-6 w-full bg-quizzai-gradient-strong hover:opacity-90"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-quizzai-gradient">
      {/* Sidebar */}
      <Sidebar>
        <div className="flex flex-col h-full bg-zinc-900 text-white overflow-hidden">
          <div className="p-4 flex items-center gap-2 min-h-[64px]">
            <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-semibold">Administration</span>
                <span className="text-sm text-quizzai-purple font-medium">
                  {user?.email}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            <button 
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-3 rounded flex items-center justify-center gap-2"
              onClick={() => navigate('/')}
            >
              <span className="inline-block w-5 h-5 flex-shrink-0">⌂</span>
              {!isSidebarCollapsed && (
                <span>Tableau de bord</span>
              )}
            </button>
            
            <button 
              className="w-full bg-quizzai-gradient-strong hover:opacity-90 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
            >
              <Shield size={18} />
              {!isSidebarCollapsed && (
                <span>Administration</span>
              )}
            </button>
          </div>
          
          <div className="p-4 border-t border-zinc-800">
            <div 
              className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded-md cursor-pointer"
              onClick={logout}
            >
              <LogOut size={18} />
              {!isSidebarCollapsed && (
                <span>Déconnexion</span>
              )}
            </div>
          </div>
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Panel d'administration</h1>
            
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="flex items-center gap-2"
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
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users size={16} />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Lock size={16} />
                Sessions
              </TabsTrigger>
            </TabsList>
            
            {/* Tab: Users */}
            <TabsContent value="users" className="space-y-4">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Liste des utilisateurs ({users.length})</h2>
                <div className="w-72">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Date d'inscription</TableHead>
                          <TableHead>Type de compte</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
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
                          filteredUsers.map((user) => (
                            <TableRow key={user.id} className={user.email === ADMIN_EMAIL ? 'bg-purple-50' : ''}>
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
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Actif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Désactivé
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {user.email !== ADMIN_EMAIL && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className={user.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                                      >
                                        {user.is_active ? (
                                          <UserX className="h-4 w-4 mr-1" />
                                        ) : (
                                          <UserCheck className="h-4 w-4 mr-1" />
                                        )}
                                        {user.is_active ? 'Désactiver' : 'Activer'}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          {user.is_active ? 'Désactiver' : 'Activer'} le compte
                                        </DialogTitle>
                                        <DialogDescription>
                                          {user.is_active ? (
                                            <>
                                              Êtes-vous sûr de vouloir désactiver le compte de <strong>{user.email}</strong> ?<br/>
                                              L'utilisateur sera déconnecté et ne pourra plus se connecter.
                                            </>
                                          ) : (
                                            <>
                                              Êtes-vous sûr de vouloir réactiver le compte de <strong>{user.email}</strong> ?<br/>
                                              L'utilisateur pourra à nouveau se connecter à l'application.
                                            </>
                                          )}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() => {}}
                                          disabled={isActionInProgress}
                                        >
                                          Annuler
                                        </Button>
                                        <Button
                                          variant={user.is_active ? "destructive" : "default"}
                                          onClick={() => handleToggleUserActive(user.id, user.is_active, user.email)}
                                          disabled={isActionInProgress}
                                        >
                                          {isActionInProgress && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                          {user.is_active ? 'Désactiver' : 'Activer'}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Tab: Sessions */}
            <TabsContent value="sessions" className="space-y-4">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Sessions actives ({sessions.length})</h2>
                <div className="w-72">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher une session..."
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Date de connexion</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Statut du compte</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Aucune session active trouvée
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSessions.map((session) => (
                            <TableRow key={session.token_id} className={session.user_email === ADMIN_EMAIL ? 'bg-purple-50' : ''}>
                              <TableCell className="font-medium">
                                {session.user_email}
                                {session.user_fullname && (
                                  <div className="text-sm text-gray-500">{session.user_fullname}</div>
                                )}
                              </TableCell>
                              <TableCell title={format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}>
                                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: fr })}
                              </TableCell>
                              <TableCell title={format(new Date(session.expires_at), 'dd/MM/yyyy HH:mm')}>
                                {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true, locale: fr })}
                              </TableCell>
                              <TableCell>
                                {session.is_active ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Actif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Désactivé
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {session.user_email !== ADMIN_EMAIL && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Lock className="h-4 w-4 mr-1" />
                                        Déconnecter
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Déconnecter l'utilisateur
                                        </DialogTitle>
                                        <DialogDescription>
                                          Êtes-vous sûr de vouloir déconnecter <strong>{session.user_email}</strong> ?<br/>
                                          L'utilisateur devra se reconnecter pour accéder à l'application.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() => {}}
                                          disabled={isActionInProgress}
                                        >
                                          Annuler
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleRevokeSession(session.token_id, session.user_email)}
                                          disabled={isActionInProgress}
                                        >
                                          {isActionInProgress && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                          Déconnecter
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;