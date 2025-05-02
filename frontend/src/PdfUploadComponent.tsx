import React, { useState, useRef } from 'react';
import { FileUp, Loader2, FileText, CheckCircle, XCircle, Upload } from 'lucide-react';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { Progress } from './components/ui/progress';
import { useAuth } from './components/auth/AuthContext';
import { BASIC_AUTH } from './config';

interface PdfUploadComponentProps {
  onUploadSuccess?: (fileId: string, fileName: string) => void;
  apiUrl: string;
}

const PdfUploadComponent: React.FC<PdfUploadComponentProps> = ({ onUploadSuccess, apiUrl }) => {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: false, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  
  // Référence vers l'input de fichier
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour déclencher le clic sur l'input de fichier
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gérer la sélection du fichier
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Vérifier si c'est un PDF
      if (file.type !== 'application/pdf') {
        setStatus({
          show: true,
          success: false,
          message: 'Veuillez sélectionner un fichier PDF.'
        });
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setStatus({ show: false, success: false, message: '' });
    }
  };

  // Gérer le glisser-déposer
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Vérifier si c'est un PDF
      if (file.type !== 'application/pdf') {
        setStatus({
          show: true,
          success: false,
          message: 'Veuillez sélectionner un fichier PDF.'
        });
        return;
      }
      
      setSelectedFile(file);
      setStatus({ show: false, success: false, message: '' });
    }
  };

  // Télécharger le fichier
  const uploadFile = async () => {
    if (!selectedFile || !token) return;
    
    setIsUploading(true);
    setProgress(0);
    setStatus({ show: false, success: false, message: '' });
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      // Enregistrer l'URL complète pour le débogage
      console.log('Uploading to:', `${apiUrl}/pdf/upload`);
      console.log('Token:', token ? `${token.slice(0, 10)}...` : 'No token');
      
      const xhr = new XMLHttpRequest();
      
      // Suivi de la progression
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progressPercent = Math.round((event.loaded / event.total) * 100);
          setProgress(progressPercent);
        }
      });
      
      // Configurer la promesse pour attendre la réponse
      const uploadPromise = new Promise<{file_id: string | number, filename: string}>((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Response from server:', response);
              resolve({
                file_id: response.file_id || response.id || 'unknown',
                filename: response.filename || selectedFile.name
              });
            } catch (error) {
              console.error('Error parsing response:', error);
              resolve({
                file_id: 'unknown',
                filename: selectedFile.name
              });
            }
          } else {
            try {
              const responseText = xhr.responseText;
              console.error('Error response:', responseText);
              let errorMessage = 'Erreur lors du téléchargement';
              
              try {
                const response = JSON.parse(responseText);
                errorMessage = response.detail || errorMessage;
              } catch {
                // Si la réponse n'est pas du JSON, utilisez le texte brut
                errorMessage = responseText || `Erreur: ${xhr.status}`;
              }
              
              reject(new Error(errorMessage));
            } catch {
              reject(new Error(`Erreur: ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function() {
          console.error('Network error during upload');
          reject(new Error('Erreur réseau lors du téléchargement'));
        };
        
        xhr.ontimeout = function() {
          console.error('Upload timed out');
          reject(new Error('Le téléchargement a pris trop de temps'));
        };
      });
      
      // Configurer et envoyer la requête
      xhr.open('POST', `${apiUrl}/pdf/upload`, true);
      
      // Configurer les en-têtes d'autorisation
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Authorization-Tunnel', BASIC_AUTH);
      
      xhr.send(formData);
      
      // Attendre la fin du téléchargement
      const result = await uploadPromise;
      
      setStatus({
        show: true,
        success: true,
        message: 'Fichier PDF téléchargé avec succès!'
      });

      // Appeler le callback de succès si fourni
      if (onUploadSuccess) {
        onUploadSuccess(result.file_id.toString(), result.filename);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setStatus({
        show: true,
        success: false,
        message: (error as Error).message || 'Erreur lors du téléchargement du PDF'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-purple-600 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          id="pdf-upload"
          className="hidden"
          accept="application/pdf"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center">
          <FileUp className="h-12 w-12 text-gray-400 mb-3" />
          
          <p className="text-lg mb-4">
            Glissez-déposez votre fichier PDF ici ou
          </p>
          
          {/* Bouton pour déclencher la boîte de dialogue */}
          <Button 
            onClick={triggerFileInput}
            className="bg-quizzai-gradient-strong hover:opacity-90 text-white py-2 px-4 rounded-md inline-block cursor-pointer"
          >
            Sélectionner un fichier
          </Button>
          
          <p className="text-sm text-gray-500 mt-2">
            Format accepté: PDF uniquement (max. 10 MB)
          </p>
        </div>
      </div>

      {/* Informations sur le fichier */}
      {selectedFile && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{selectedFile.name}</h3>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            {!isUploading && (
             <Button 
              onClick={uploadFile}
              className="bg-quizzai-gradient-strong hover:opacity-90"
            >
              <Upload className="h-4 w-4 mr-2 text-white" style={{ color: 'white' }} />
              Envoyer
            </Button>
            )}
          </div>
          
          {/* Barre de progression */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-purple-600" />
                <span className="text-sm text-gray-600">Téléchargement en cours...</span>
              </div>
              <div className="mt-2">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="text-sm text-gray-600 text-right mt-1">{progress}%</div>
            </div>
          )}
        </div>
      )}

      {/* Messages de statut */}
      {status.show && (
        <Alert
          variant={status.success ? "default" : "destructive"}
          className="mt-6"
        >
          {status.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PdfUploadComponent;