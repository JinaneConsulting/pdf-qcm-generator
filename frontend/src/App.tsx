import { useState, useRef } from 'react'
import { FileUp, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react'
import './App.css'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

import { QCMResponse } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [qcmData, setQcmData] = useState<QCMResponse | null>(null)
  const [numQuestions, setNumQuestions] = useState(5)
  const [activeTab, setActiveTab] = useState('upload')
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
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erreur lors du téléchargement du PDF')
      }

      const data = await response.json()
      setFileId(data.file_id)
      setActiveTab('generate')
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
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erreur lors de la génération du QCM')
      }

      const data = await response.json()
      setQcmData(data)
      setActiveTab('quiz')
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
    setActiveTab('upload')
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">PDF QCM Generator</h1>
            <p className="text-gray-600 mt-2">
              Générez des questionnaires à choix multiples à partir de vos documents PDF
            </p>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={isUploading || isGenerating}>
                1. Télécharger PDF
              </TabsTrigger>
              <TabsTrigger value="generate" disabled={!fileId || isUploading || isGenerating}>
                2. Générer QCM
              </TabsTrigger>
              <TabsTrigger value="quiz" disabled={!qcmData || isUploading || isGenerating}>
                3. Répondre au QCM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Télécharger votre document PDF</CardTitle>
                  <CardDescription>
                    Sélectionnez un fichier PDF pour générer un QCM basé sur son contenu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="pdf-upload"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                        </p>
                        <p className="text-xs text-gray-500">PDF uniquement</p>
                      </div>
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

                  {file && (
                    <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-blue-700">{file.name}</span>
                    </div>
                  )}

                  {uploadError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Erreur</AlertTitle>
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || isUploading}
                    className="w-full"
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
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Générer un QCM</CardTitle>
                  <CardDescription>
                    Configurez les paramètres pour générer votre questionnaire
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleGenerateQCM} 
                    disabled={isGenerating}
                    className="w-full"
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
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-4">
              {qcmData && (
                <Card>
                  <CardHeader>
                    <CardTitle>{qcmData.pdf_title}</CardTitle>
                    <CardDescription>
                      Répondez aux questions générées à partir de votre document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {showResults && (
                      <div className="mb-6">
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

                    {qcmData.questions.map((question, index) => (
                      <div key={question.id} className="space-y-4">
                        <div className="font-medium">
                          Question {index + 1}: {question.text}
                        </div>
                        
                        <RadioGroup
                          value={userAnswers[question.id] || ''}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                          disabled={showResults}
                        >
                          {question.choices.map((choice) => (
                            <div key={choice.id} className="flex items-center space-x-2">
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
                          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                            <AlertTitle>Explication</AlertTitle>
                            <AlertDescription>{question.explanation}</AlertDescription>
                          </Alert>
                        )}
                        
                        {index < qcmData.questions.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {!showResults ? (
                      <Button 
                        onClick={handleSubmitQuiz} 
                        disabled={Object.keys(userAnswers).length !== qcmData.questions.length}
                        className="w-full"
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
                  </CardFooter>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
