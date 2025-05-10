// src/components/FolderPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UnifiedSidebar from './layout/UnifiedSidebar';
import FolderListComponent from './FolderListComponent';
import PdfUploader from './PdfUpLoader'; // Import your existing PDF uploader
import { 
  ChevronRight, 
  Home, 
  Folder 
} from 'lucide-react';
import { Button } from './ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from './ui/breadcrumb';

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

const FolderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Racine' }
  ]);

  // Récupérer l'ID du dossier depuis les paramètres d'URL
  useEffect(() => {
    const folderId = searchParams.get('folderId');
    const folderName = searchParams.get('folderName');
    
    if (folderId) {
      const parsedId = parseInt(folderId, 10);
      if (!isNaN(parsedId)) {
        setCurrentFolderId(parsedId);
        
        // Mettre à jour le nom du dossier si disponible
        if (folderName) {
          setCurrentFolderName(folderName);
          
          // Ajouter au fil d'Ariane si ce n'est pas déjà le dernier élément
          const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
          if (!lastBreadcrumb || lastBreadcrumb.id !== parsedId) {
            setBreadcrumbs(prev => [...prev, { id: parsedId, name: folderName }]);
          }
        }
      }
    } else {
      setCurrentFolderId(null);
      setCurrentFolderName(null);
      setBreadcrumbs([{ id: null, name: 'Racine' }]);
    }
  }, [searchParams]);

  const handleFolderClick = (folderId: number, folderName: string) => {
    setSearchParams({ folderId: folderId.toString(), folderName });
  };

  const handleBreadcrumbClick = (index: number) => {
    // Si on clique sur le dernier élément, ne rien faire
    if (index === breadcrumbs.length - 1) return;
    
    // Sinon, naviguer vers le dossier correspondant
    const breadcrumb = breadcrumbs[index];
    
    // Mettre à jour les miettes de pain pour inclure seulement jusqu'à cet élément
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    
    if (breadcrumb.id === null) {
      // Naviguer vers la racine
      setSearchParams({});
    } else {
      // Naviguer vers le dossier spécifié
      setSearchParams({ 
        folderId: breadcrumb.id.toString(), 
        folderName: breadcrumb.name 
      });
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-blue-50">
      <UnifiedSidebar 
        currentPage="folders"
        onNavigate={handleNavigate}
      />

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Mes dossiers</h1>
              <p className="text-blue-400">Organisez vos documents dans des dossiers</p>
            </div>
          </div>

          {/* Fil d'Ariane */}
          <Breadcrumb className="my-4">
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                  )}
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      asChild
                      className={`flex items-center ${index === breadcrumbs.length - 1 ? 'font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                      onClick={() => handleBreadcrumbClick(index)}
                    >
                      <Button variant="ghost" className="p-0 m-0 h-auto">
                        {index === 0 ? (
                          <Home className="h-4 w-4 mr-1" />
                        ) : (
                          <Folder className="h-4 w-4 mr-1" />
                        )}
                        {breadcrumb.name}
                      </Button>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="grid grid-cols-1 gap-6">
            {/* Liste des dossiers */}
            <FolderListComponent 
              parentId={currentFolderId}
              onFolderClick={handleFolderClick}
              onCreateSuccess={() => {
                // Rafraîchir les données si nécessaire
              }}
            />

            {/* Uploader de PDF dans le dossier courant */}
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4 text-blue-600">
                Ajouter un document dans {currentFolderName || 'ce dossier'}
              </h2>
              <PdfUploader />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderPage;