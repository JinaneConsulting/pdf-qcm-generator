import UnifiedSidebar from './components/layout/UnifiedSidebar';
import { useState, useRef, useEffect } from 'react';
import { FileUp, Loader2, FileText, CheckCircle, XCircle, Upload, Shield, UserRound } from 'lucide-react';
import './App.css';
import { Button } from './components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Input } from './components/ui/input';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { useAuth } from './components/auth/AuthContext';
import AuthPage from './components/auth/AuthPage';
import AuthCallback from './components/auth/AuthCallback';
import GoogleAuthCallback from './components/auth/GoogleAuthCallback';
import OAuthErrorPage from './components/auth/OAuthErrorPage';
import ProfilePage from './components/user/ProfilePage';

// Définir les types
interface Question {
  id: string;
  text: string;
  choices: Choice[];
  correct_answer_id: string;
  explanation?: string;
}

interface Choice {
  id: string;
  text: string;
}

interface QCMResponseType {
  pdf_title: string;
  questions: Question[];
}

// Configuration API simplifiée
const API_URL = import.meta.env.VITE_API_URL || 'https://pdf-qcm-generator-tunnel-sjxi7x37.devinapps.com';
const API_CREDENTIALS = import.meta.env.VITE_API_BASIC_AUTH || 'user:f6f93d86265ff53a7a7e0ac885597bf3';
const BASIC_AUTH = `Basic ${btoa(API_CREDENTIALS)}`;

// Définir le composant PdfUploadPage
const PdfUploadPage: React.FC = () => {
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
      const xhr = new XMLHttpRequest();
      
      // Suivi de la progression
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progressPercent = Math.round((event.loaded / event.total) * 100);
          setProgress(progressPercent);
        }
      });
      
      // Configurer la promesse pour attendre la réponse
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.detail || 'Erreur lors du téléchargement'));
            } catch {
              reject(new Error(`Erreur: ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Erreur réseau lors du téléchargement'));
        };
      });
      
      // Configurer et envoyer la requête
      xhr.open('POST', `${API_URL}/pdf/upload`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Authorization-Tunnel', BASIC_AUTH);
      xhr.send(formData);
      
      // Attendre la fin du téléchargement
      await uploadPromise;
      
      setStatus({
        show: true,
        success: true,
        message: 'Fichier PDF téléchargé avec succès!'
      });
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <UnifiedSidebar 
        currentPage="upload"
        onNavigate={(path) => {
          if (path === '/') {
            window.location.href = '/';
          } else if (path === '/profile') {
            window.location.href = '/profile';
          }
        }}
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Télécharger un PDF</h1>
          
          <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Téléchargement de PDF</h2>
            
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
                
                <label 
                  htmlFor="pdf-upload" 
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md inline-block cursor-pointer"
                >
                  Sélectionner un fichier
                </label>
                
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
                    <CheckCircle className="h-5 w-5 text-purple-600" />
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
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Envoyer
                    </Button>
                  )}
                </div>
                
                {/* Barre de progression */}
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 text-right">{progress}%</div>
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
        </div>
      </div>
    </div>
  );
};

// Composant principal QCM
const QCMApp: React.FC = () => {
  const { token, user } = useAuth();
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [qcmData, setQcmData] = useState<QCMResponseType | null>(null)
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [view, setView] = useState<'home' | 'quiz'>('home')
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState<boolean>(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setUploadError('Veuillez sélectionner un fichier PDF')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setUploadError(null)
      setFileId(null)
      setQcmData(null)
      setShowResults(false)
      setUserAnswers({})
      
      // Créer une URL pour afficher le PDF
      const fileUrl = URL.createObjectURL(selectedFile);
      setPdfUrl(fileUrl);
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Veuillez sélectionner un fichier PDF')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Utiliser exactement les mêmes en-têtes que dans le code original
      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erreur lors du téléchargement du PDF')
      }

      const data = await response.json()
      setFileId(data.file_id)
    } catch (error) {
      setUploadError((error as Error).message || 'Une erreur est survenue')
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerateQCM = async () => {
    if (!fileId) return

    setIsGenerating(true)

    try {
      const formData = new FormData()
      formData.append('num_questions', numQuestions.toString())

      const response = await fetch(`${API_URL}/generate-qcm/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Authorization-Tunnel': BASIC_AUTH
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erreur lors de la génération du QCM')
      }

      const data = await response.json()
      setQcmData(data)
      setView('quiz')
    } catch (error) {
      setUploadError((error as Error).message || 'Une erreur est survenue')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }))
  }

  const handleSubmitQuiz = () => {
    setShowResults(true)
  }

  const resetQuiz = () => {
    setFile(null)
    setFileId(null)
    setQcmData(null)
    setUserAnswers({})
    setShowResults(false)
    setView('home')
    setPdfUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getScore = () => {
    if (!qcmData) return 0
    
    let correctAnswers = 0
    qcmData.questions.forEach(question => {
      if (userAnswers[question.id] === question.correct_answer_id) {
        correctAnswers++
      }
    })
    
    return correctAnswers
  }

  useEffect(() => {
    // Nettoyage de l'URL du PDF lors du démontage du composant
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleNavigate = (path: string) => {
    if (path === '/upload-pdf') {
      window.location.href = '/upload-pdf';
    } else if (path === '/profile') {
      window.location.href = '/profile';
    } else if (path === '/') {
      resetQuiz();
    }
  };

  const renderHomeContent = () => {
    if (!file) {
      // Affiche les liens quand aucun PDF n'est sélectionné
      return (
        <div className="max-w-full mx-auto px-4 py-8">
          {/* Cartes de navigation */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Carte Télécharger PDF */}
            <div 
              onClick={() => window.location.href = '/upload-pdf'}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
                <FileUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Télécharger un PDF</h3>
              <p className="text-gray-600 text-center">
                Importez vos documents pour créer des questionnaires
              </p>
            </div>

            {/* Carte Mon Profile */}
            <div 
              onClick={() => window.location.href = '/profile'}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
                <UserRound className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Mon profil</h3>
              <p className="text-gray-600 text-center">
                Gérez vos informations personnelles
              </p>
            </div>

            {/* Carte Admin - visible uniquement pour les administrateurs */}
          {user && user.is_superuser && (
            <div 
              onClick={() => window.location.href = '/admin'}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Administration</h3>
              <p className="text-gray-600 text-center">
                Accédez au panneau d'administration
              </p>
            </div>
          )}
          </div>

          
        </div>
      );
    }

    // Interface existante quand un PDF est sélectionné
    return (
      file && pdfUrl ? (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Partie gauche - Affichage du PDF */}
          <div className="w-1/2 border-r border-gray-300 pr-4 h-full">
            <h2 className="text-xl font-bold mb-4">Document PDF</h2>
            <div className="h-[calc(100%-40px)] bg-white rounded-lg border border-gray-200">
              <iframe
                src={pdfUrl}
                title="PDF Viewer"
                className="w-full h-full rounded-lg"
              />
            </div>
          </div>
          
          {/* Partie droite - Génération de QCM */}
          <div className="w-1/2 pl-4 h-full overflow-auto">
            <h2 className="text-xl font-bold mb-4">Générer un QCM</h2>
            
            {/* File info */}
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-purple-600 mr-2" />
                <span className="font-medium">{file.name}</span>
              </div>
              
              {/* Upload button si pas encore téléchargé */}
              {!fileId && (
                <div className="mt-4">
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || isUploading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      'Télécharger PDF'
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Error message */}
            {uploadError && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            
            {/* QCM Generation - Only shown when a PDF is uploaded */}
            {fileId && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-2xl font-bold mb-4">Générer un QCM</h2>
                <p className="text-gray-600 mb-4">
                  Configurez les paramètres pour générer votre questionnaire à choix multiples
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="num-questions">Nombre de questions</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                       id="num-questions"
                       type="number"
                       min={1}
                       max={20}
                       value={numQuestions}
                       onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                       className="w-24"
                     />
                     <span className="text-sm text-gray-500">(1-20 questions)</span>
                   </div>
                 </div>
                 
                 <Button 
                   onClick={handleGenerateQCM} 
                   disabled={isGenerating}
                   className="w-full bg-purple-600 hover:bg-purple-700"
                 >
                   {isGenerating ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Génération en cours...
                     </>
                   ) : (
                     'Générer QCM'
                   )}
                 </Button>
               </div>
             </div>
           )}
           
           {/* Choix de nouveau fichier */}
           <div className="mt-4">
             <Label htmlFor="pdf-upload-new" className="mb-2 block">Changer de fichier PDF :</Label>
             <div className="flex gap-2">
               <label htmlFor="pdf-upload-new" className="flex-1">
                 <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md flex items-center justify-center gap-2">
                   <FileUp size={18} />
                   Nouveau PDF
                 </Button>
                 <Input
                   id="pdf-upload-new"
                   type="file"
                   accept=".pdf"
                   className="hidden"
                   onChange={handleFileChange}
                 />
               </label>
               <Button 
                 onClick={resetQuiz}
                 className="bg-red-600 hover:bg-red-700"
               >
                 Réinitialiser
               </Button>
             </div>
           </div>
         </div>
       </div>
     ) : (
       <div className="relative mt-12 mb-16">
         <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center bg-white">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
             <FileUp className="h-8 w-8 text-gray-500" />
           </div>
           <p className="text-lg mb-6">Cliquez pour télécharger, ou glissez votre PDF ici</p>
           <label htmlFor="pdf-upload">
             <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md flex items-center gap-2">
               <FileUp size={18} />
               Télécharger PDF
             </Button>
             <Input
               id="pdf-upload"
               ref={fileInputRef}
               type="file"
               accept=".pdf"
               className="hidden"
               onChange={handleFileChange}
             />
           </label>
         </div>
         {uploadError && (
           <Alert variant="destructive" className="mt-4">
             <XCircle className="h-4 w-4" />
             <AlertTitle>Erreur</AlertTitle>
             <AlertDescription>{uploadError}</AlertDescription>
           </Alert>
         )}
       </div>
     )
   );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <UnifiedSidebar 
        currentPage="home"
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {view === 'home' && renderHomeContent()}
        
        {/* Quiz View - Answer QCM questions */}
        {view === 'quiz' && qcmData && (
          <div className="flex-1 flex flex-col">
            {/* Quiz Header */}
            <div className="border-b p-4 bg-white">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold">{qcmData.pdf_title}</h1>
                <p className="text-gray-600">
                  Répondez aux questions générées à partir de votre document
                </p>
              </div>
            </div>

            {/* Écran partagé pour le quiz */}
            <div className="flex-1 flex">
              {/* PDF Viewer - Left Side */}
              {pdfUrl && (
                <div className="w-1/2 border-r border-gray-300 p-4 overflow-auto">
                  <h2 className="text-xl font-bold mb-4">Document de référence</h2>
                  <div className="h-[calc(100%-40px)] bg-white rounded-lg border border-gray-200">
                    <iframe
                      src={pdfUrl}
                      title="PDF Viewer"
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                </div>
              )}
              
              {/* Quiz Content - Right Side */}
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-4xl mx-auto">
                  {/* Score display */}
                  {showResults && (
                    <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
                      <h2 className="text-xl font-bold mb-2">Résultats</h2>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                          Score: {getScore()} / {qcmData.questions.length}
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round((getScore() / qcmData.questions.length) * 100)}%
                        </span>
                      </div>
                      <Progress value={(getScore() / qcmData.questions.length) * 100} className="h-2" />
                    </div>
                  )}

                  {/* Questions */}
                  {qcmData.questions.map((question, index) => (
                    <div key={question.id} className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
                      <div className="font-medium text-lg mb-4">
                        Question {index + 1}: {question.text}
                      </div>
                      
                      <RadioGroup
                        value={userAnswers[question.id] || ''}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                        disabled={showResults}
                        className="space-y-3"
                      >
                        {question.choices.map((choice) => (
                          <div 
                            key={choice.id} 
                            className={`flex items-center space-x-2 p-3 rounded-md ${
                              showResults && choice.id === question.correct_answer_id
                                ? 'bg-green-50'
                                : showResults && userAnswers[question.id] === choice.id && choice.id !== question.correct_answer_id
                                ? 'bg-red-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <RadioGroupItem 
                              value={choice.id} 
                              id={`${question.id}-${choice.id}`}
                            />
                            <Label 
                              htmlFor={`${question.id}-${choice.id}`}
                              className={
                                showResults
                                  ? choice.id === question.correct_answer_id
                                    ? 'text-green-600 font-medium'
                                    : userAnswers[question.id] === choice.id
                                    ? 'text-red-600 font-medium'
                                    : ''
                                  : ''
                              }
                            >
                              {choice.text}
                              {showResults && choice.id === question.correct_answer_id && (
                                <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                              )}
                              {showResults && 
                                userAnswers[question.id] === choice.id && 
                                choice.id !== question.correct_answer_id && (
                                <XCircle className="inline-block ml-2 h-4 w-4 text-red-600" />
                              )}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      {showResults && question.explanation && (
                        <Alert className="mt-4 bg-blue-50 text-blue-800 border-blue-200">
                          <AlertTitle>Explication</AlertTitle>
                          <AlertDescription>{question.explanation}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiz Footer */}
            <div className="border-t p-4 bg-white">
              <div className="max-w-4xl mx-auto">
                {!showResults ? (
                  <Button 
                    onClick={handleSubmitQuiz} 
                    disabled={Object.keys(userAnswers).length !== qcmData.questions.length}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Soumettre les réponses
                  </Button>
                ) : (
                  <Button 
                    onClick={resetQuiz} 
                    variant="outline"
                    className="w-full"
                  >
                    Nouveau QCM
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Interface pour les props de App
interface AppProps {
  page?: string;
}

// Composant principal de l'application
function App({ page }: AppProps) {
  // Vérifier l'authentification
  const { token, isLoading } = useAuth();
  
  // Afficher un loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  // Routes pour les callbacks d'authentification
  if (page === 'callback') return <AuthCallback />;
  if (page === 'google-callback') return <GoogleAuthCallback />;
  if (page === 'error') return <OAuthErrorPage />;
  
  // Si l'utilisateur n'est pas connecté, afficher la page de connexion
  if (!token) {
    return <AuthPage />;
  }
  
  // Sinon, afficher la page demandée
  if (page === 'upload-pdf') {
    return <PdfUploadPage />;
  }
  
  if (page === 'profile') {
    return <ProfilePage />;
  }
  
  return <QCMApp />;
}

export default App;