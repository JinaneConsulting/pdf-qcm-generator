import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import UnifiedSidebar from '../layout/UnifiedSidebar';
import PdfUploader from '../PdfUpLoader';
import ProfileSessionsTab from '../user/ProfileSessionsTab'; // Chemin absolu pour être sûr
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, UserRound, Mail, CheckCircle, AlertCircle, FileTextIcon, Shield } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('profile');

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Chargement de votre profil...</h2>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const firstLetter = user.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-blue-50">
      <UnifiedSidebar
        currentPage="profile"
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-blue-600">Mon profil</h1>

          <Tabs
            defaultValue="profile"
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="mb-2 bg-white border border-blue-100">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
              >
                <FileTextIcon className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="sessions"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card className="border border-blue-100 shadow-sm">
                <CardHeader className="pb-4 pt-6 px-6">
                  <CardTitle className="text-xl text-blue-600">
                    Vos informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0 w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt="Photo de profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold">{firstLetter}</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-blue-700">{user.full_name || user.email.split('@')[0]}</h2>
                        <div className="flex items-center text-blue-500 mt-1">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>{user.email}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1 border rounded-md p-4 bg-blue-50 border-blue-100">
                          <p className="text-sm text-blue-400 font-medium">Status du compte</p>
                          <div className="flex items-center gap-2">
                            {user.is_active ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-green-600">Actif</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span className="font-medium text-red-600">Désactivé</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 border rounded-md p-4 bg-blue-50 border-blue-100">
                          <p className="text-sm text-blue-400 font-medium">Vérification de l'email</p>
                          <div className="flex items-center gap-2">
                            {user.is_verified ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-green-600">Vérifié</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                <span className="font-medium text-yellow-600">Non vérifié</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => navigate('/')}
                        >
                          Retour au tableau de bord
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card className="border border-blue-100 shadow-sm">
                <CardHeader className="pb-4 pt-6 px-6">
                  <CardTitle className="text-xl text-blue-600">
                    Gérer vos documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <PdfUploader />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nouvel onglet pour les sessions */}
            <TabsContent value="sessions" className="space-y-6">
              <ProfileSessionsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;