// src/components/FolderListComponent.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, BASIC_AUTH } from '../config';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { 
  RefreshCw, 
  Trash2, 
  Edit, 
  Folder, 
  FolderPlus, 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
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
} from './ui/alert-dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
} from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

interface FolderData {
  id: number;
  name: string;
  created_at: string;
  subfolder_count: number;
  file_count: number;
}

interface FolderListComponentProps {
  parentId?: number | null;
  onFolderClick?: (folderId: number, folderName: string) => void;
  onCreateSuccess?: () => void;
}

const FolderListComponent: React.FC<FolderListComponentProps> = ({ 
  parentId = null, 
  onFolderClick,
  onCreateSuccess 
}) => {
  const { token } = useAuth();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [deleteRecursive, setDeleteRecursive] = useState<boolean>(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [editFolderName, setEditFolderName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fonction pour récupérer la liste des dossiers
  const fetchFolders = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = parentId 
        ? `${API_URL}/folders/list?parent_id=${parentId}` 
        : `${API_URL}/folders/list`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.folders)) {
        setFolders(data.folders);
      } else {
        setFolders([]);
      }
    } catch (error) {
      setError((error as Error).message || 'Une erreur est survenue lors de la récupération des dossiers');
      console.error('Erreur lors de la récupération des dossiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer la liste des dossiers au chargement du composant
  useEffect(() => {
    fetchFolders();
  }, [token, parentId]);

  // Fonction pour créer un dossier
  const handleCreateFolder = async () => {
    if (!token || !newFolderName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/folders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_id: parentId
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Réinitialiser le formulaire
      setNewFolderName('');
      
      // Rafraîchir la liste des dossiers
      await fetchFolders();
      
      // Notifier le parent si nécessaire
      if (onCreateSuccess) {
        onCreateSuccess();
      }
    } catch (error) {
      setError((error as Error).message || 'Une erreur est survenue lors de la création du dossier');
      console.error('Erreur lors de la création du dossier:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Fonction pour supprimer un dossier
  const handleDeleteFolder = async (folderId: number) => {
    if (!token) return;

    setIsDeleting(folderId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/folders/${folderId}?recursive=${deleteRecursive}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur ${response.status}`);
      }

      // Mettre à jour la liste des dossiers en supprimant celui qui vient d'être supprimé
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      
      // Réinitialiser l'option de suppression récursive
      setDeleteRecursive(false);
    } catch (error) {
      setError((error as Error).message || 'Une erreur est survenue lors de la suppression du dossier');
      console.error('Erreur lors de la suppression du dossier:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  // Fonction pour modifier un dossier
  const handleEditFolder = async () => {
    if (!token || !editingFolder || !editFolderName.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editFolderName.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Mettre à jour la liste des dossiers
      setFolders(prev => 
        prev.map(folder => 
          folder.id === editingFolder.id 
            ? { ...folder, name: editFolderName.trim() } 
            : folder
        )
      );
      
      // Réinitialiser le formulaire d'édition
      setEditingFolder(null);
      setEditFolderName('');
    } catch (error) {
      setError((error as Error).message || 'Une erreur est survenue lors de la modification du dossier');
      console.error('Erreur lors de la modification du dossier:', error);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Card className="border border-blue-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl text-blue-600">
            {parentId ? "Contenu du dossier" : "Mes dossiers"}
          </CardTitle>
          <CardDescription>
            {parentId ? "Parcourez le contenu de ce dossier" : "Gérez vos dossiers et leur contenu"}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 border-blue-200 text-blue-600"
            onClick={fetchFolders}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 border-blue-200 text-blue-600"
              >
                <FolderPlus className="h-4 w-4" />
                Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un nouveau dossier</DialogTitle>
                <DialogDescription>
                  Entrez un nom pour le nouveau dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom du dossier</Label>
                  <Input
                    id="name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Mon dossier"
                    className="border-blue-100 focus:border-blue-300"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="border-blue-100 text-blue-600">
                    Annuler
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={!newFolderName.trim() || isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    handleCreateFolder();
                    document.querySelector('[data-radix-dialog-close]')?.dispatchEvent(
                      new MouseEvent('click', { bubbles: true })
                    );
                  }}
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-blue-100">
            <Folder className="h-16 w-16 mx-auto text-blue-200 mb-4" />
            <h3 className="text-xl font-medium text-blue-600 mb-2">
              Aucun dossier trouvé
            </h3>
            <p className="text-blue-400 mb-6">
              {parentId 
                ? "Ce dossier est vide. Créez un nouveau dossier ou ajoutez des documents." 
                : "Vous n'avez pas encore de dossiers. Créez-en un pour commencer."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Nom</TableHead>
                <TableHead>Contenu</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <TableRow key={folder.id} className="hover:bg-blue-50 cursor-pointer">
                  <TableCell 
                    className="font-medium"
                    onClick={() => onFolderClick && onFolderClick(folder.id, folder.name)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-blue-500" />
                      <span>{folder.name}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onFolderClick && onFolderClick(folder.id, folder.name)}>
                    <div className="flex gap-4">
                      <span className="text-sm text-gray-500">
                        {folder.subfolder_count} {folder.subfolder_count === 1 ? 'dossier' : 'dossiers'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {folder.file_count} {folder.file_count === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onFolderClick && onFolderClick(folder.id, folder.name)}>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolder(folder);
                              setEditFolderName(folder.name);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Modifier</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Modifier le dossier</DialogTitle>
                            <DialogDescription>
                              Modifiez le nom du dossier.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-name">Nom du dossier</Label>
                              <Input
                                id="edit-name"
                                value={editFolderName}
                                onChange={(e) => setEditFolderName(e.target.value)}
                                className="border-blue-100 focus:border-blue-300"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline" className="border-blue-100 text-blue-600">
                                Annuler
                              </Button>
                            </DialogClose>
                            <Button 
                              type="submit" 
                              disabled={!editFolderName.trim() || isEditing}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                handleEditFolder();
                                document.querySelector('[data-radix-dialog-close]')?.dispatchEvent(
                                  new MouseEvent('click', { bubbles: true })
                                );
                              }}
                            >
                              {isEditing ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Modification...
                                </>
                              ) : (
                                "Enregistrer"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce dossier ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible et supprimera le dossier "{folder.name}".
                              {(folder.subfolder_count > 0 || folder.file_count > 0) && (
                                <div className="mt-2">
                                  <div className="flex items-center space-x-2 mt-4">
                                    <Checkbox 
                                      id="recursive" 
                                      checked={deleteRecursive} 
                                      onCheckedChange={(checked) => 
                                        setDeleteRecursive(checked === true)
                                      } 
                                    />
                                    <label 
                                      htmlFor="recursive" 
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Supprimer également tout le contenu ({folder.subfolder_count} dossier{folder.subfolder_count > 1 ? 's' : ''} et {folder.file_count} document{folder.file_count > 1 ? 's' : ''})
                                    </label>
                                  </div>
                                  {!deleteRecursive && (folder.subfolder_count > 0 || folder.file_count > 0) && (
                                    <p className="text-red-500 text-sm mt-2">
                                      <AlertCircle className="h-4 w-4 inline-block mr-1" />
                                      Le dossier n'est pas vide. Vous devez cocher la case ci-dessus pour le supprimer avec son contenu.
                                    </p>
                                  )}
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-blue-100 text-blue-600">
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDeleteFolder(folder.id)}
                              disabled={
                                isDeleting === folder.id || 
                                ((folder.subfolder_count > 0 || folder.file_count > 0) && !deleteRecursive)
                              }
                            >
                              {isDeleting === folder.id ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Suppression...
                                </>
                              ) : (
                                "Supprimer"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderClick && onFolderClick(folder.id, folder.name);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Ouvrir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default FolderListComponent;