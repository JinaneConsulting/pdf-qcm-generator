// src/components/folders/FoldersPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import UnifiedSidebar from '../layout/UnifiedSidebar';

import { Button } from '../ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';

import { 
  Folder, 
  FolderPlus, 
  FolderX, 
  Search, 
  Loader2, 
  FileTextIcon,
  FolderOpen,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';

// Types pour les dossiers
interface FolderType {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  createdAt: string;
}

// Données de démonstration pour les dossiers
const demoFolders: FolderType[] = [
  {
    id: '1',
    name: 'Cours de Français',
    description: 'Documents pour les cours de français',
    documentCount: 5,
    createdAt: '2025-04-01T14:32:00Z'
  },
  {
    id: '2',
    name: 'Cours de Mathématiques',
    description: 'Exercices et leçons de mathématiques',
    documentCount: 3,
    createdAt: '2025-04-02T09:15:00Z'
  },
  {
    id: '3',
    name: 'Projets',
    description: 'Documents liés aux projets personnels',
    documentCount: 2,
    createdAt: '2025-04-05T16:45:00Z'
  }
];

const FoldersPage: React.FC = () => {
  const { token, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Effet pour charger les dossiers (simulé avec les données de démo)
  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // Simuler un délai de chargement
    const timer = setTimeout(() => {
      setFolders(demoFolders);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [token, navigate]);

  // Fonction pour filtrer les dossiers en fonction de la recherche
  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Fonction pour créer un nouveau dossier
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      setError('Veuillez entrer un nom de dossier');
      return;
    }

    setIsCreatingFolder(true);
    setError(null);

    // Simuler un délai de création
    setTimeout(() => {
      const newFolder: FolderType = {
        id: `folder-${Date.now()}`,
        name: newFolderName,
        description: newFolderDescription || undefined,
        documentCount: 0,
        createdAt: new Date().toISOString()
      };

      setFolders([newFolder, ...folders]);
      setNewFolderName('');
      setNewFolderDescription('');
      setIsCreatingFolder(false);
      setShowForm(false);
    }, 800);
  };

  // Fonction pour ouvrir un dossier
  const handleOpenFolder = (folderId: string) => {
    // Dans une vraie application, cela redirigerait vers une page de détails du dossier
    alert(`Ouverture du dossier ${folderId}`);
  };

  // Fonction pour supprimer un dossier
  const handleDeleteFolder = (folderId: string, event: React.MouseEvent) => {
    // Empêcher la propagation pour éviter d'ouvrir le dossier en même temps
    event.stopPropagation();
    
    // Confirmation de suppression
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier ?')) {
      setFolders(folders.filter(folder => folder.id !== folderId));
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Fonction pour basculer l'ordre de tri
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Chargement...</h2>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <UnifiedSidebar
        currentPage="folders"
        onNavigate={(path) => navigate(path)}
      />

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-blue-600">Mes Dossiers</h1>
          <p className="text-blue-500 mb-6">Organisez vos documents en dossiers pour un meilleur accès</p>

          {/* Barre de recherche et création de dossier */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-blue-400" />
              <Input
                type="text"
                placeholder="Rechercher un dossier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-100 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? (
                  <>Annuler</>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Nouveau dossier
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="ml-auto border-blue-200 text-blue-600"
                onClick={toggleSortOrder}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
              </Button>
            </div>
          </div>

          {/* Formulaire de création de dossier */}
          {showForm && (
            <Card className="mb-6 border-blue-100 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-blue-600">Créer un nouveau dossier</CardTitle>
                <CardDescription>
                  Ajoutez un nouveau dossier pour organiser vos documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="folder-name" className="text-sm font-medium text-blue-600">
                    Nom du dossier *
                  </label>
                  <Input
                    id="folder-name"
                    placeholder="Entrez un nom pour le dossier"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="border-blue-100 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="folder-description" className="text-sm font-medium text-blue-600">
                    Description (optionnelle)
                  </label>
                  <Input
                    id="folder-description"
                    placeholder="Décrivez le contenu de ce dossier"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    className="border-blue-100 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder}
                >
                  {isCreatingFolder ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderPlus className="h-4 w-4 mr-2" />
                  )}
                  Créer le dossier
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Message d'erreur */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Liste des dossiers */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
            </div>
          ) : filteredFolders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFolders.map((folder) => (
                <Card
                  key={folder.id}
                  className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleOpenFolder(folder.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <Folder className="h-5 w-5 mr-2 text-blue-500" />
                        <CardTitle className="text-lg text-blue-600">{folder.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                      >
                        <FolderX className="h-4 w-4" />
                      </Button>
                    </div>
                    {folder.description && (
                      <CardDescription className="mt-1">{folder.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2 flex justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <FileTextIcon className="h-4 w-4 mr-1" />
                      <span>{folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(folder.createdAt)}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-blue-50">
                    <Button
                      variant="ghost"
                      className="p-0 h-8 text-blue-600 hover:text-blue-800 hover:bg-transparent"
                      onClick={() => handleOpenFolder(folder.id)}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" />
                      <span>Ouvrir</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-blue-100">
              <Folder className="h-16 w-16 mx-auto text-blue-200 mb-4" />
              <h3 className="text-xl font-medium text-blue-600 mb-2">
                {searchQuery ? "Aucun dossier trouvé" : "Vous n'avez pas encore de dossiers"}
              </h3>
              <p className="text-blue-400 mb-6">
                {searchQuery
                  ? `Aucun dossier ne correspond à "${searchQuery}"`
                  : "Créez un dossier pour commencer à organiser vos documents"}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600"
                  onClick={() => setSearchQuery('')}
                >
                  Effacer la recherche
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoldersPage;