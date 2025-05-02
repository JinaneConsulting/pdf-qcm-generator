// src/components/PdfUploader.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_URL = 'http://localhost:8000';

const PdfUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Seuls les fichiers PDF sont acceptés');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setMessage('Téléchargement en cours...');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vous devez être connecté pour télécharger un fichier');
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_URL}/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setMessage(result.message || 'Fichier téléchargé avec succès');
      
      // Réinitialiser le formulaire
      setSelectedFile(null);
      const fileInput = document.getElementById('pdfFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Télécharger un fichier PDF</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <input
            type="file"
            id="pdfFileInput"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          {selectedFile && (
            <div className="text-sm text-gray-600">
              Fichier sélectionné: {selectedFile.name}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && !error && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="bg-quizzai-gradient-strong hover:opacity-90"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Téléchargement en cours...' : 'Télécharger'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PdfUploader;