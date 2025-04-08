import { useState, useRef } from 'react'
import { FileUp, Loader2, FileText, CheckCircle, XCircle, Plus, LogOut } from 'lucide-react'
import './App.css'

import { Button } from './components/ui/button'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Input } from './components/ui/input'
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group'
import { Label } from './components/ui/label'
import { Progress } from './components/ui/progress'

import { QCMResponse } from './types'
import { useAuth } from './components/auth/AuthContext'
import AuthPage from './components/auth/AuthPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const { user, token, logout } = useAuth();
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [qcmData, setQcmData] = useState<QCMResponse | null>(null)
  const [numQuestions, setNumQuestions] = useState(5)
  const [view, setView] = useState<'home' | 'quiz'>('home')
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  
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

      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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
      setUploadError((error as Error).message)
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
          'Authorization': `Bearer ${token}`
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
      setUploadError((error as Error).message)
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

  if (!token || !user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Sidebar */}
      <div className="w-72 bg-black text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">Q</span>
          </div>
          <span className="text-xl font-semibold">PDF QCM</span>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-zinc-800">
          <div className="bg-zinc-800 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-sm font-medium truncate">{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Info - Only shown when a PDF is uploaded */}
        {file && fileId && (
          <div className="p-4 border-b border-zinc-800">
            <div className="bg-zinc-800 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-10 bg-red-500 rounded flex items-center justify-center text-white text-xs">PDF</div>
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-400">{Math.round(file.size / 1024)} KB</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <button 
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
            onClick={resetQuiz}
          >
            <Plus size={18} />
            <span>Nouveau QCM</span>
          </button>
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-zinc-800">
          <div 
            className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded-md cursor-pointer"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Home View - Upload PDF and Generate QCM */}
        {view === 'home' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Main Heading */}
            <div className="text-center mb-6">
              <h1 className="text-5xl font-bold mb-4">
                Générez des <span className="bg-purple-600 text-white px-2 py-1 rounded">QCM</span> à partir de PDF
              </h1>
              <p className="text-lg text-gray-700">
                Créez facilement des questionnaires à choix multiples à partir de vos documents PDF
              </p>
            </div>

            {/* Upload Area */}
            <div className="relative mt-12 mb-16">
              {/* Handwritten note */}
              <div className="absolute -top-12 right-16 text-purple-700 font-handwriting transform rotate-[-5deg]">
                <div>GLISSEZ-DÉPOSEZ</div>
                <div>VOTRE PDF ICI</div>
                <svg
                  className="w-16 h-16 ml-8 transform rotate-[30deg]"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22L3 15L7 13L12 16L17 13L21 15L12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 16L12 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Upload box */}
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

              {/* File info */}
              {file && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-purple-600 mr-2" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  
                  {/* Upload button */}
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
                </div>
              )}

              {/* Error message */}
              {uploadError && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* QCM Generation - Only shown when a PDF is uploaded */}
            {fileId && (
              <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
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
          </div>
        )}

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

            {/* Quiz Content */}
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
  )
}

export default App
