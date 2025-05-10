// src/components/user/ProfileSessionsTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RefreshCw, Laptop, Smartphone, Trash, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// L'interface est déjà définie dans AuthContext, pas besoin de la redéfinir
// On la garde en commentaire pour référence
/*
interface Session {
  id: number;
  created_at: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  current: boolean;
}
*/

const ProfileSessionsTab: React.FC = () => {
  const { sessions, refreshSessions, revokeSession, revokeAllSessions } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    handleRefreshSessions();
  }, []);

  const handleRefreshSessions = async () => {
    setIsRefreshing(true);
    await refreshSessions();
    setIsRefreshing(false);
  };

  const handleRevokeSession = async (sessionId: number) => {
    await revokeSession(sessionId);
  };

  const handleRevokeAllSessions = async () => {
    await revokeAllSessions(true); // Conserver la session courante
  };

  // Détermine le type d'appareil basé sur le user-agent
  const getDeviceType = (userAgent: string): { icon: React.ReactNode; name: string } => {
    const userAgentLower = userAgent.toLowerCase();
    
    if (userAgentLower.includes('mobile') || 
        userAgentLower.includes('android') || 
        userAgentLower.includes('iphone')) {
      return { 
        icon: <Smartphone className="h-4 w-4" />, 
        name: 'Mobile' 
      };
    }
    
    return { 
      icon: <Laptop className="h-4 w-4" />, 
      name: 'Ordinateur' 
    };
  };

  // Récupère le nom du navigateur depuis le user-agent
  const getBrowserName = (userAgent: string): string => {
    if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('Safari')) {
      return 'Safari';
    } else if (userAgent.includes('Edge')) {
      return 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      return 'Opera';
    } else {
      return 'Navigateur';
    }
  };

  return (
    <Card className="border border-blue-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
        <div>
          <CardTitle className="text-xl text-blue-600">
            Vos sessions actives
          </CardTitle>
          <CardDescription>
            Gérez vos connexions sur différents appareils et navigateurs
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshSessions}
          disabled={isRefreshing}
          className="flex items-center gap-2 border-blue-200 text-blue-600"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-6">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune session active trouvée
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {sessions.map((session) => {
                  const deviceInfo = getDeviceType(session.user_agent);
                  const browserName = getBrowserName(session.user_agent);
                  const isExpiring = new Date(session.expires_at) <= new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

                  return (
                    <div 
                      key={session.id}
                      className={`p-4 border rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4 
                      ${session.current ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                          {deviceInfo.icon}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {deviceInfo.name} • {browserName}
                            {session.current && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                Session courante
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex flex-col gap-1">
                            <span>IP: {session.ip_address}</span>
                            <span className="flex items-center gap-1">
                              Connexion: {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: fr })}
                            </span>
                            <span className={`flex items-center gap-1 ${isExpiring ? 'text-amber-600' : 'text-gray-500'}`}>
                              Expiration: {format(new Date(session.expires_at), 'dd/MM/yyyy HH:mm')}
                              {isExpiring && ' (bientôt)'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {!session.current && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Déconnecter cet appareil
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir déconnecter cette session sur l'appareil {deviceInfo.name} ?
                                <br />
                                Cette action n'affectera pas votre session actuelle.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-blue-100 text-blue-600">Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700" 
                                onClick={() => handleRevokeSession(session.id)}
                              >
                                Déconnecter
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </div>

              {sessions.length > 1 && (
                <div className="pt-4 border-t border-gray-100">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Déconnecter tous les autres appareils
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la déconnexion multiple</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir déconnecter tous vos autres appareils ?
                          <br />
                          Cette action n'affectera pas votre session actuelle.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-blue-100 text-blue-600">Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700" 
                          onClick={handleRevokeAllSessions}
                        >
                          Déconnecter tous
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSessionsTab;