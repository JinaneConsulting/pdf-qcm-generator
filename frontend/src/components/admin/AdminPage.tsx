// src/components/admin/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import UnifiedSidebar from '../layout/UnifiedSidebar';
import { adminService, UserData } from '../../services/adminService';  // Importez UserData du service
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
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

// Supprimez complètement l'interface UserData locale

const AdminPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  // Check if current user is the admin
  useEffect(() => {
    if (!user || !token) {
      navigate('/');
      return;
    }

    if (!user.is_superuser) {
      setError('Vous n\'avez pas les droits d\'administration');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [user, token, navigate]);

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!token || !user?.is_superuser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const usersResponse = await adminService.getUsers(token);
        
        // Vérifier que la réponse contient des utilisateurs
        if (usersResponse && usersResponse.users) {
          setUsers(usersResponse.users);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError((err as Error).message || 'Erreur lors de la récupération des données d\'administration');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, [token, user, refreshTrigger]);

  // Rest of the component remains exactly the same...
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
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

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(userFilter.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(userFilter.toLowerCase()))
  );

  // Show error page if not authorized
  if (user && !user.is_superuser) {
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
      <UnifiedSidebar 
        currentPage="admin"
        onNavigate={(path) => navigate(path)}
      />

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
                            <TableRow key={user.id} className={user.is_superuser ? 'bg-purple-50' : ''}>
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
                                {user.id !== user?.id && (
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
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;