import React, { useState, useMemo } from 'react';
import { Quiz, Student, ExamResult, SubjectId } from '../types';
import { MEB_CURRICULUM, getFallbackQuestions } from '../data/mebCurriculum';
import { Storage } from '../utils/storage';
import {
  Sparkles,
  Users,
  Copy,
  Download,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  Eye,
  LogOut,
  Share2,
  Lock,
  BookOpen,
  Send,
  HelpCircle,
  X,
  ChevronRight,
  RotateCcw,
  FileText,
  UploadCloud,
  FileUp,
  FolderArchive,
  Calendar,
  Play,
  Filter,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';

interface TeacherDashboardProps {
  activeQuiz: Quiz;
  setActiveQuiz: (quiz: Quiz) => void;
  students: Student[];
  setStudents: (students: Student[]) => void;
  results: ExamResult[];
  refreshData: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeQuiz,
  setActiveQuiz,
  students,
  setStudents,
  results,
  refreshData,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Storage.isTeacherLoggedIn());
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Tabs: 'results' | 'archive' | 'create_quiz' | 'students'
  const [activeTab, setActiveTab] = useState<'results' | 'archive' | 'create_quiz' | 'students'>('results');

  // Archive & Selected Quiz State
  const [selectedQuizId, setSelectedQuizId] = useState<string>(activeQuiz.id);
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState<'all' | SubjectId>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [newQuizNotice, setNewQuizNotice] = useState<boolean>(false);
  const [quizActionToast, setQuizActionToast] = useState<string | null>(null);
  const [quizToDeleteConfirm, setQuizToDeleteConfirm] = useState<Quiz | null>(null);
  const [expandedQuizIds, setExpandedQuizIds] = useState<Record<string, boolean>>({});

  // Toggle question accordion for a quiz
  const toggleQuizQuestions = (quizId: string) => {
    setExpandedQuizIds((prev) => ({
      ...prev,
      [quizId]: !prev[quizId],
    }));
  };

  // All quizzes available in archive & active
  const allQuizzes = useMemo(() => {
    return Storage.getAllQuizzes();
  }, [activeQuiz, results]);

  // Current viewed quiz (either active or historical)
  const currentViewQuiz = useMemo(() => {
    return allQuizzes.find((q) => q.id === selectedQuizId) || activeQuiz;
  }, [allQuizzes, selectedQuizId, activeQuiz]);

  const isViewingActive = currentViewQuiz.id === activeQuiz.id;

  const pastQuizzes = useMemo(() => {
    return allQuizzes.filter((q) => q.id !== activeQuiz.id);
  }, [allQuizzes, activeQuiz.id]);

  // Results for the currently viewed quiz
  const viewingResults = useMemo(() => {
    return results.filter((r) => r.quizId === currentViewQuiz.id);
  }, [results, currentViewQuiz.id]);

  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((q) => {
      if (archiveSubjectFilter !== 'all' && q.subjectId !== archiveSubjectFilter) {
        return false;
      }
      if (archiveSearchQuery.trim()) {
        const query = archiveSearchQuery.toLowerCase();
        const matchesTopic = q.topic.toLowerCase().includes(query);
        const matchesSubject = q.subjectName.toLowerCase().includes(query);
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesId = q.id.toLowerCase().includes(query);
        if (!matchesTopic && !matchesSubject && !matchesTitle && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [allQuizzes, archiveSubjectFilter, archiveSearchQuery]);

  // Quiz Creator sub-tab: 'curriculum' | 'pdf'
  const [createMode, setCreateMode] = useState<'curriculum' | 'pdf'>('curriculum');

  // PDF Upload & AI Quiz state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<'reading_comprehension' | 'worksheet_test'>('reading_comprehension');
  const [pdfSubjectName, setPdfSubjectName] = useState<string>('Türkçe');
  const [pdfTopicName, setPdfTopicName] = useState<string>('');
  const [pdfTeacherNote, setPdfTeacherNote] = useState<string>('');
  const [pdfDragActive, setPdfDragActive] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Curriculum Quiz Creator state
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>('matematik');
  const [selectedTopic, setSelectedTopic] = useState<string>(MEB_CURRICULUM[0].topics[0]);
  const [customTeacherNote, setCustomTeacherNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState(activeQuiz.questions);
  const [justGenerated, setJustGenerated] = useState(false);

  // Student Manager state
  const [newStudentName, setNewStudentName] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');

  // UI status
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [parentMsgCopied, setParentMsgCopied] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<ExamResult | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const selectedSubject = MEB_CURRICULUM.find((s) => s.id === selectedSubjectId) || MEB_CURRICULUM[0];

  // Helper to format date
  const formatQuizDate = (isoString?: string) => {
    if (!isoString) return 'Tarih belirtilmedi';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Helper to generate full student exam URL
  const getStudentExamUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'student');
    return url.toString();
  };

  // Helper to copy the parent group message for the current viewed quiz
  const handleCopyParentMessage = () => {
    const link = getStudentExamUrl();
    const text = `Değerli Velilerimiz ve Sevgili Öğrencilerim,\n${currentViewQuiz.subjectName} dersi '${currentViewQuiz.topic}' pekiştirme testimiz hazırdır. Aşağıdaki linke tıklayarak listeden adınızı seçip teste başlayabilirsiniz:\n🔗 Sınav Linki: ${link}`;

    navigator.clipboard.writeText(text);
    setParentMsgCopied(true);
    setTimeout(() => setParentMsgCopied(false), 3500);
  };

  // Helper to activate a past quiz for students
  const handleMakeQuizActive = (quizToActivate: Quiz) => {
    Storage.setActiveQuiz(quizToActivate);
    setActiveQuiz(quizToActivate);
    setSelectedQuizId(quizToActivate.id);
    setQuizActionToast(`"${quizToActivate.subjectName} - ${quizToActivate.topic}" sınavı öğrenci ekranında yayına alındı!`);
    setTimeout(() => setQuizActionToast(null), 4000);
    refreshData();
  };

  // Helper for "Yeni Sınav Başlat" button
  const handleStartNewQuizFlow = () => {
    Storage.saveQuizToArchive(activeQuiz);
    setActiveTab('create_quiz');
    setNewQuizNotice(true);
    setTimeout(() => setNewQuizNotice(false), 8000);
  };

  // Delete quiz request (opens modal)
  const handleDeleteQuiz = (quizId: string) => {
    const quizToDelete = allQuizzes.find((q) => q.id === quizId);
    if (!quizToDelete) return;
    setQuizToDeleteConfirm(quizToDelete);
  };

  // Perform permanent deletion of quiz and its results
  const handleConfirmDeleteQuiz = () => {
    if (!quizToDeleteConfirm) return;
    const deletedId = quizToDeleteConfirm.id;
    const deletedTitle = `${quizToDeleteConfirm.subjectName} - ${quizToDeleteConfirm.topic}`;

    Storage.deleteQuiz(deletedId);
    setQuizToDeleteConfirm(null);

    // If deleted quiz was currently viewed, fallback to active or first available
    if (selectedQuizId === deletedId) {
      const remaining = Storage.getAllQuizzes();
      if (remaining.length > 0) {
        setSelectedQuizId(remaining[0].id);
      }
    }

    setQuizActionToast(`"${deletedTitle}" sınavı ve tüm öğrenci sonuçları kalıcı olarak silindi.`);
    setTimeout(() => setQuizActionToast(null), 4000);
    refreshData();
  };

  // Render question list and answer key accordion for any quiz
  const renderQuizQuestionsAccordion = (quiz: Quiz) => {
    const qList = quiz.questions || [];
    return (
      <div className="mt-4 pt-4 border-t border-slate-200/90 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Accordion Top Header */}
        <div className="bg-sky-50/90 border border-sky-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-base shadow-inner">
              📝
            </div>
            <div>
              <h5 className="font-black text-sm text-sky-950 flex items-center gap-2 flex-wrap">
                <span>{quiz.subjectName} — {quiz.topic}</span>
                <span className="text-[11px] font-bold bg-sky-100/90 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">
                  {qList.length} Soru
                </span>
              </h5>
              <p className="text-xs text-sky-800/80 font-medium mt-0.5">
                Yeşil işaretler MEB müfredatına uygun doğru cevap anahtarını, sarı kutular soru kazanım/çözüm açıklamalarını gösterir.
              </p>
            </div>
          </div>

          <button
            onClick={() => toggleQuizQuestions(quiz.id)}
            className="text-xs font-black text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-100 border border-sky-300 hover:border-sky-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer self-end sm:self-center flex items-center gap-1 shadow-2xs"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Soruları Kapat</span>
          </button>
        </div>

        {/* Quick Answer Key Summary Ribbon */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Hızlı Cevap Anahtarı ({qList.length} Soru)
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">Öğretmen Kontrol Şeridi</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {qList.map((item, idx) => (
              <span
                key={item.id || idx}
                className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-200 px-2 py-1 rounded-lg shadow-2xs"
              >
                <span className="text-slate-500 font-semibold">{idx + 1}:</span>
                <span className="text-emerald-700 font-black">{item.correctAnswer}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Question Cards (2-column responsive grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {qList.map((question, qIndex) => {
            return (
              <div
                key={question.id || qIndex}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-sky-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Soru no + Doğru Cevap Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                    <span className="bg-slate-100 text-slate-800 font-black text-xs px-2.5 py-1 rounded-lg">
                      Soru {qIndex + 1}
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Doğru Şık: {question.correctAnswer}
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed mb-3">
                    {question.question}
                  </p>

                  {/* 4 Options: A, B, C, D */}
                  <div className="space-y-1.5 mb-2.5">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const isCorrect = question.correctAnswer === optKey;
                      const optText = question.options ? question.options[optKey] : '';
                      return (
                        <div
                          key={optKey}
                          className={`text-xs p-2 rounded-xl border flex items-start gap-2 transition-colors ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                              : 'bg-slate-50/70 border-slate-200/70 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-600'
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="pt-0.5 leading-snug break-words flex-1">
                            {optText}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-black shrink-0">
                              Doğru Şık
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation / Solution */}
                {question.explanation && (
                  <div className="mt-2 bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 text-[11px] text-amber-950 font-medium leading-relaxed flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-amber-900 block mb-0.5">Çözüm / Açıklama:</strong>
                      <span>{question.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Close Bar */}
        <div className="text-center pt-1">
          <button
            onClick={() => toggleQuizQuestions(quiz.id)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Soruları ve Cevap Anahtarını Kapat</span>
          </button>
        </div>
      </div>
    );
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    if (clean === '1051hmz+') {
      Storage.setTeacherLoggedIn(true);
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Hatalı şifre! Lütfen kontrol ediniz. (Şifre: ogretmen123)');
    }
  };

  const handleLogout = () => {
    Storage.setTeacherLoggedIn(false);
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Generate 20 questions using Gemini API (or fallback)
  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setGenerationSource(null);
    setJustGenerated(false);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject.name,
          topic: selectedTopic,
          customPrompt: customTeacherNote,
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setPreviewQuestions(data.questions);
        setGenerationSource('Gemini 3.8 Flash AI');

        const newQuiz: Quiz = {
          id: `quiz_${Date.now()}`,
          title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          topic: selectedTopic,
          createdAt: new Date().toISOString(),
          questions: data.questions,
        };

        Storage.setActiveQuiz(newQuiz);
        setActiveQuiz(newQuiz);
        setSelectedQuizId(newQuiz.id);
        setActiveTab('results');
        setJustGenerated(true);
        refreshData();
      } else {
        // Use rich curriculum fallback
        console.warn('API returned fallback or key not set. Using curriculum generator.');
        const fallback = getFallbackQuestions(selectedSubject.name, selectedTopic);
        setPreviewQuestions(fallback);
        setGenerationSource('MEB 4. Sınıf Soru Bankası');

        const newQuiz: Quiz = {
          id: `quiz_${Date.now()}`,
          title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          topic: selectedTopic,
          createdAt: new Date().toISOString(),
          questions: fallback,
        };

        Storage.setActiveQuiz(newQuiz);
        setActiveQuiz(newQuiz);
        setSelectedQuizId(newQuiz.id);
        setActiveTab('results');
        setJustGenerated(true);
        refreshData();
      }
    } catch (err) {
      console.error('Quiz creation error:', err);
      // Resilient fallback
      const fallback = getFallbackQuestions(selectedSubject.name, selectedTopic);
      setPreviewQuestions(fallback);
      setGenerationSource('MEB 4. Sınıf Soru Bankası (Çevrimdışı)');

      const newQuiz: Quiz = {
        id: `quiz_${Date.now()}`,
        title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        topic: selectedTopic,
        createdAt: new Date().toISOString(),
        questions: fallback,
      };

      Storage.setActiveQuiz(newQuiz);
      setActiveQuiz(newQuiz);
      setSelectedQuizId(newQuiz.id);
      setActiveTab('results');
      setJustGenerated(true);
      refreshData();
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF File handling
  const handlePdfFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPdfError('Lütfen sadece .pdf uzantılı bir dosya seçiniz.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfError('PDF dosyası boyutu en fazla 20 MB olabilir.');
      return;
    }
    setPdfError('');
    setPdfFile(file);

    // Auto-populate topic name from file name if empty
    const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim();
    if (!pdfTopicName) {
      setPdfTopicName(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.onerror = () => {
      setPdfError('Dosya okunamadı. Lütfen dosyayı tekrar seçiniz.');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateQuizFromPdf = async () => {
    if (!pdfBase64) {
      setPdfError('Lütfen önce bir PDF dosyası yükleyiniz.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError('');
    setGenerationSource(null);
    setJustGenerated(false);

    try {
      const response = await fetch('/api/generate-quiz-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          pdfName: pdfFile?.name || 'belge.pdf',
          mode: pdfMode,
          subjectName: pdfSubjectName || 'Türkçe',
          topicName: pdfTopicName || pdfFile?.name?.replace(/\.pdf$/i, '') || 'PDF Çalışması',
          customPrompt: pdfTeacherNote,
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setPreviewQuestions(data.questions);
        setGenerationSource(data.source || 'Gemini Multimodal PDF Analizi');

        const titleSubject = pdfSubjectName || 'PDF Destekli';
        const titleTopic = pdfTopicName || pdfFile?.name?.replace(/\.pdf$/i, '') || 'PDF Çalışması';

        let subId: SubjectId = 'turkce';
        const sLower = titleSubject.toLowerCase();
        if (sLower.includes('mat')) subId = 'matematik';
        else if (sLower.includes('fen')) subId = 'fen_bilimleri';
        else if (sLower.includes('sosyal')) subId = 'sosyal_bilgiler';

        const newQuiz: Quiz = {
          id: `quiz_pdf_${Date.now()}`,
          title: `${titleSubject} 4. Sınıf - ${titleTopic} Değerlendirme Testi`,
          subjectId: subId,
          subjectName: titleSubject,
          topic: titleTopic,
          createdAt: new Date().toISOString(),
          questions: data.questions,
        };

        Storage.setActiveQuiz(newQuiz);
        setActiveQuiz(newQuiz);
        setSelectedQuizId(newQuiz.id);
        setActiveTab('results');
        setJustGenerated(true);
        refreshData();
      } else {
        throw new Error(data.error || 'Sorular oluşturulamadı.');
      }
    } catch (err: any) {
      console.error('PDF quiz generation error:', err);
      setPdfError(err?.message || 'PDF analiz edilirken hata oluştu. Lütfen dosyanızı kontrol ediniz.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Student management
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const maxNo = students.reduce((max, s) => Math.max(max, s.no), 100);
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      no: maxNo + 1,
      name: newStudentName.trim(),
    };

    const updated = [...students, newStudent];
    setStudents(updated);
    Storage.setStudents(updated);
    setNewStudentName('');
  };

  const handleUpdateStudent = (id: string) => {
    if (!editingStudentName.trim()) return;
    const updated = students.map((s) => (s.id === id ? { ...s, name: editingStudentName.trim() } : s));
    setStudents(updated);
    Storage.setStudents(updated);
    setEditingStudentId(null);
    setEditingStudentName('');
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) {
      const updated = students.filter((s) => s.id !== id);
      setStudents(updated);
      Storage.setStudents(updated);
    }
  };

  const handleResetDefaultStudents = () => {
    if (confirm('35 kişilik standart MEB sınıf listesine dönmek istiyor musunuz?')) {
      const def = Storage.resetStudentsToDefault();
      setStudents(def);
    }
  };

  // Completed & Uncompleted students for the currently viewed quiz
  const completedStudentIds = new Set(viewingResults.map((r) => r.studentId));
  const uncompletedStudents = students.filter((s) => !completedStudentIds.has(s.id));
  const totalCompleted = viewingResults.length;
  const totalPossible = students.length;
  const participationRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const averageScore =
    viewingResults.length > 0 ? Math.round(viewingResults.reduce((acc, r) => acc + r.score, 0) / viewingResults.length) : 0;
  const averageCorrect =
    viewingResults.length > 0
      ? (viewingResults.reduce((acc, r) => acc + r.correctCount, 0) / viewingResults.length).toFixed(1)
      : '0';

  // Overall stats across all archived quizzes
  const overallAverageScore =
    results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

  // Format Duration for WhatsApp (e.g. 14 dk)
  const formatDurationMin = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return mins <= 0 ? '1 dk' : `${mins} dk`;
  };

  // Copy WhatsApp summary for the currently viewed quiz
  const handleCopyWhatsApp = () => {
    handleCopyWhatsAppForQuiz(currentViewQuiz);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 3000);
  };

  // Copy WhatsApp summary for any specific quiz
  const handleCopyWhatsAppForQuiz = (q: Quiz) => {
    const qResults = results.filter((r) => r.quizId === q.id);
    const sorted = [...qResults].sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds);
    const completedIds = new Set(qResults.map((r) => r.studentId));
    const missing = students.filter((s) => !completedIds.has(s.id));

    let text = `📊 ${q.subjectName} - ${q.topic} Testi Sonuçları (${formatQuizDate(q.createdAt)}):\n`;

    if (sorted.length === 0) {
      text += `Henüz sınava katılan öğrenci bulunmamaktadır.\n`;
    } else {
      sorted.forEach((r, idx) => {
        text += `${idx + 1}. ${r.studentName}: ${r.correctCount}/${r.totalQuestions} Doğru (${formatDurationMin(r.durationSeconds)})\n`;
      });
    }

    text += `\n❌ Katılmayanlar: `;
    if (missing.length === 0) {
      text += `Tüm öğrenciler katıldı 🎉`;
    } else {
      text += missing.map((s) => s.name).join(', ');
    }

    navigator.clipboard.writeText(text);
    setQuizActionToast(`"${q.topic}" WhatsApp sonuç özeti panoya kopyalandı!`);
    setTimeout(() => setQuizActionToast(null), 3500);
  };

  // Export to Excel / CSV with UTF-8 BOM for currently viewed quiz
  const handleExportCSV = () => {
    handleExportCSVForQuiz(currentViewQuiz);
  };

  // Export to Excel / CSV for any specific quiz
  const handleExportCSVForQuiz = (q: Quiz) => {
    const qResults = results.filter((r) => r.quizId === q.id);
    const sorted = [...qResults].sort((a, b) => b.score - a.score);
    const completedIds = new Set(qResults.map((r) => r.studentId));
    const missing = students.filter((s) => !completedIds.has(s.id));

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += 'Sıra;Okul No;Öğrenci Adı Soyadı;Ders;Konu;Doğru;Yanlış;Boş;Puan;Harcanan Süre;Tamamlanma Tarihi;Sınav Tarihi;Sınav Kimliği\n';

    sorted.forEach((r, idx) => {
      csvContent += `${idx + 1};${r.studentNo};"${r.studentName}";"${r.subjectName}";"${r.topic}";${r.correctCount};${r.wrongCount};${r.emptyCount};${r.score};"${r.formattedDuration}";"${new Date(r.submittedAt).toLocaleString('tr-TR')}";"${formatQuizDate(q.createdAt)}";"${q.id}"\n`;
    });

    if (missing.length > 0) {
      csvContent += '\n--- HENÜZ SINAVA GİRMEYENLER ---\n';
      missing.forEach((s) => {
        csvContent += `-;${s.no};"${s.name}";"${q.subjectName}";"${q.topic}";0;0;20;0;"-";"Katılmadı";"${formatQuizDate(q.createdAt)}";"${q.id}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTopic = `${q.subjectName}_${q.topic}`.replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_');
    link.setAttribute('download', `${safeTopic}_Sonuclari.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear results for currently viewed exam
  const handleClearResults = () => {
    Storage.clearQuizResults(currentViewQuiz.id);
    refreshData();
    setShowClearConfirm(false);
    setQuizActionToast(`"${currentViewQuiz.topic}" sınavının sonuçları temizlendi.`);
    setTimeout(() => setQuizActionToast(null), 3000);
  };

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-xl font-extrabold text-slate-800 mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
            Öğretmen Giriş Paneli
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Test hazırlama, canlı sonuç takip ve sınıf yönetim araçlarına erişmek için öğretmen şifrenizi giriniz.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="teacher-pass" className="block text-xs font-bold text-slate-700 mb-1">
                Öğretmen Şifresi
              </label>
              <input
                id="teacher-pass"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Şifrenizi girin..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-semibold"
                autoFocus
              />
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              id="teacher-login-btn"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Yönetim Paneline Giriş Yap</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>Varsayılan Şifre:</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-black text-slate-700">ogretmen123</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar with Teacher Info, Quiz Selector and Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Header title, live status badge, and action buttons */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Öğretmen Yönetim Paneli
              </span>
              <span className="text-slate-300">•</span>
              {isViewingActive ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  🟢 Şu Anda Yayında (Aktif Sınav)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  <FolderArchive className="w-3 h-3 text-amber-600" />
                  📁 Arşiv Sınavı İnceleniyor
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] mt-1">
              {currentViewQuiz.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-2 flex-wrap">
              <span>Ders: <strong className="text-slate-800">{currentViewQuiz.subjectName}</strong></span>
              <span>•</span>
              <span>Konu: <strong className="text-slate-800">{currentViewQuiz.topic}</strong></span>
              <span>•</span>
              <span>Tarih: <strong className="text-slate-700">{formatQuizDate(currentViewQuiz.createdAt)}</strong></span>
              <span>•</span>
              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                ID: {currentViewQuiz.id}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Veli Grubu İçin Mesajı Kopyala */}
            <button
              onClick={handleCopyParentMessage}
              id="top-copy-parent-msg-btn"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer"
            >
              {parentMsgCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Veli Mesajı Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Veli Grubu İçin Mesajı Kopyala</span>
                </>
              )}
            </button>

            {/* Yeni Sınav Başlat Butonu */}
            <button
              onClick={handleStartNewQuizFlow}
              id="top-start-new-quiz-btn"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 cursor-pointer"
              title="Mevcut sınavı arşive alıp yeni bir sınav oluştur"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Yeni Sınav Başlat</span>
            </button>

            {/* Çıkış Yap */}
            <button
              onClick={handleLogout}
              id="teacher-logout-btn"
              title="Oturumu Kapat"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-auto lg:ml-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Exam Switcher Dropdown & Sub-Navigation Tabs */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Sınav Seçici Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 border border-slate-200/80 p-2 rounded-2xl w-full lg:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 pl-1 shrink-0">
              <FolderArchive className="w-4 h-4 text-indigo-600" />
              <span>İncelenen Sınav:</span>
            </div>

            <select
              id="quiz-selector-dropdown"
              value={selectedQuizId}
              onChange={(e) => {
                setSelectedQuizId(e.target.value);
                if (activeTab === 'archive' || activeTab === 'create_quiz') {
                  setActiveTab('results');
                }
              }}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer w-full sm:w-auto min-w-[240px] max-w-md"
            >
              <optgroup label="🟢 ŞU ANDA YAYINDAKİ AKTİF SINAV">
                <option value={activeQuiz.id}>
                  🟢 [Aktif Sınav] {activeQuiz.subjectName} - {activeQuiz.topic} ({formatQuizDate(activeQuiz.createdAt)})
                </option>
              </optgroup>
              {pastQuizzes.length > 0 && (
                <optgroup label={`📁 GEÇMİŞ SINAVLAR ARŞİVİ (${pastQuizzes.length})`}>
                  {pastQuizzes.map((q) => {
                    const qResultsCount = results.filter((r) => r.quizId === q.id).length;
                    return (
                      <option key={q.id} value={q.id}>
                        📁 {q.subjectName} - {q.topic} • {formatQuizDate(q.createdAt)} ({qResultsCount}/{students.length} Katılım)
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>

            {/* If viewing an archived quiz, option to quickly make it active */}
            {!isViewingActive && (
              <button
                onClick={() => handleMakeQuizActive(currentViewQuiz)}
                id="make-quiz-active-btn"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                title="Bu sınavı öğrencilerin ekranında yayına al"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bu Sınavı Aktif Sınav Yap</span>
              </button>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('results')}
              id="tab-results-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'results' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Sınav Sonuçları ({viewingResults.length}/{students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              id="tab-archive-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'archive' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-indigo-500" />
              <span>Geçmiş Sınavlar ({allQuizzes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create_quiz')}
              id="tab-create-quiz-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'create_quiz' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>20 Soru Üret (AI & PDF)</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              id="tab-students-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'students' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Sınıf Listesi ({students.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CANLI VE ARŞİV SONUÇ PANOSU */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* If viewing an archived exam, show dedicated informational banner */}
          {!isViewingActive && (
            <div className="bg-amber-50/90 border border-amber-200 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-black">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Geçmiş Sınav Kaydı Görüntüleniyor
                    </span>
                    <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      {currentViewQuiz.id}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-800 mt-0.5">
                    {currentViewQuiz.subjectName}: {currentViewQuiz.topic} ({formatQuizDate(currentViewQuiz.createdAt)})
                  </h4>
                  <p className="text-xs text-amber-800/80 font-medium">
                    Bu sınav arşivlenmiştir. Öğrencilerin giriş ekranında aktif değildir. İsterseniz tek tıkla tekrar yayına alabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleMakeQuizActive(currentViewQuiz)}
                  id="results-make-active-btn"
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Bu sınavı öğrencilerin ekranında yayına al"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Bu Sınavı Aktif Sınav Yap</span>
                </button>
                <button
                  onClick={() => setSelectedQuizId(activeQuiz.id)}
                  id="results-return-active-btn"
                  className="bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Aktif Sınava Dön
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Participation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Katılım Oranı</span>
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-800">
                    {totalCompleted}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ {totalPossible} Öğrenci</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${participationRate}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-bold">
                  %{participationRate} katılım sağlandı
                </p>
              </div>
            </div>

            {/* Average Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Sınıf Ortalaması</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-800">
                    {averageScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 100 Puan</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Ortalama: <strong className="text-slate-800 font-black">{averageCorrect}</strong> / 20 Doğru
                </p>
              </div>
            </div>

            {/* Uncompleted Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Girmeyenler</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-rose-600">
                    {uncompletedStudents.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Öğrenci</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {uncompletedStudents.length === 0 ? 'Tüm sınıf tamamladı!' : 'Sınavı bekleyenler'}
                </p>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="text-xs font-black uppercase tracking-wider">Hızlı İletişim</span>
                <Share2 className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                {/* Big Green Veli Grubu Butonu */}
                <button
                  onClick={handleCopyParentMessage}
                  id="results-parent-msg-btn"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  {parentMsgCopied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Veli Mesajı Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Veli Grubu İçin Mesajı Kopyala</span>
                    </>
                  )}
                </button>

                {/* WhatsApp Sonuç Raporu */}
                <button
                  onClick={handleCopyWhatsApp}
                  id="whatsapp-copy-btn"
                  className="w-full bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-bold py-1.5 px-2 rounded-xl text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Sonuçlar Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp Sonuçlarını Kopyala</span>
                    </>
                  )}
                </button>

                {/* Excel CSV */}
                <button
                  onClick={handleExportCSV}
                  id="export-csv-btn"
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-1.5 px-2 rounded-xl text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Excel / CSV İndir</span>
                </button>

                {/* Sınavı Sil Butonu */}
                <button
                  onClick={() => handleDeleteQuiz(currentViewQuiz.id)}
                  id="results-delete-current-quiz-btn"
                  className="w-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 font-extrabold py-1.5 px-2 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Bu sınavı ve tüm öğrenci sonuçlarını kalıcı olarak sil"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bu Sınavı Sil</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Main Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table of Completed Students (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Tamamlanan Sınav Sonuçları ({currentViewQuiz.topic})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Öğrencilerin doğru, yanlış, puan ve harcanan süre tablosu • {viewingResults.length} Öğrenci
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleQuizQuestions(currentViewQuiz.id)}
                    id="results-view-questions-btn"
                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                      expandedQuizIds[currentViewQuiz.id]
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border-sky-200 hover:border-sky-600 shadow-2xs'
                    }`}
                    title="Bu sınavın 20 sorusunu ve cevap anahtarını aç/kapat"
                  >
                    <span>📝</span>
                    <span>{expandedQuizIds[currentViewQuiz.id] ? 'Soruları Kapat' : 'Soruları ve Cevap Anahtarını Gör'}</span>
                    {expandedQuizIds[currentViewQuiz.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => setShowClearConfirm(true)}
                    id="clear-results-btn"
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bu Sınavın Sonuçlarını Temizle</span>
                  </button>
                </div>
              </div>

              {viewingResults.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">
                    {isViewingActive ? 'Henüz Sınav Sonucu Yok' : 'Bu Arşiv Sınavında Kayıtlı Sonuç Bulunmuyor'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    {isViewingActive
                      ? 'Öğrenciler testi tamamladıkça sonuçlar anlık olarak burada listelenecektir.'
                      : 'Bu sınava henüz katılan öğrenci olmamış veya sonuçlar temizlenmiş.'}
                  </p>
                  {isViewingActive && (
                    <button
                      onClick={handleCopyParentMessage}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Veli Grubuna Sınav Linkini Gönder</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Sıra</th>
                        <th className="py-3 px-4">Öğrenci Adı</th>
                        <th className="py-3 px-4 text-center">Doğru / 20</th>
                        <th className="py-3 px-4 text-center">Puan</th>
                        <th className="py-3 px-4 text-center">Süre</th>
                        <th className="py-3 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {[...viewingResults]
                        .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
                        .map((res, index) => (
                          <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{res.studentName}</div>
                              <div className="text-[10px] text-slate-400">No: {res.studentNo}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                {res.correctCount} / {res.totalQuestions}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                                  res.score >= 85
                                    ? 'bg-amber-100 text-amber-800'
                                    : res.score >= 60
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {res.score}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{res.formattedDuration}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedStudentDetail(res)}
                                id={`detail-btn-${res.id}`}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detay</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List of Students Who Haven't Taken the Exam (1 Col) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <span>Sınava Girmeyenler</span>
                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {uncompletedStudents.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Bu testte sonucu bulunmayanlar</p>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                {uncompletedStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="font-bold text-slate-700">Tebrikler!</span>
                    <p>Sınıftaki tüm {students.length} öğrenci sınavı tamamladı.</p>
                  </div>
                ) : (
                  uncompletedStudents.map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                          {s.no}
                        </span>
                        <span className="font-semibold text-slate-700">{s.name}</span>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-100">
                        Bekliyor
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sınav Soruları ve Cevap Anahtarı Akordeonu (Sonuçlar Sekmesi) */}
          {expandedQuizIds[currentViewQuiz.id] && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
              {renderQuizQuestionsAccordion(currentViewQuiz)}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GEÇMİŞ SINAVLAR / ARŞİV MODÜLÜ */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          {/* Archive Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                    Geçmiş Sınavlar ve Arşiv Modülü
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
                    Her sınav (MEB Müfredatı veya PDF) benzersiz bir kimlik (Quiz ID) ve tarih damgasıyla saklanır. Öğrencilerin karneleri ve kilitleri sınav bazında tutulduğundan önceki ve sonraki testler asla birbirine karışmaz.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartNewQuizFlow}
                id="archive-create-new-quiz-btn"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm shadow-indigo-600/25 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Yeni Sınav Başlat</span>
              </button>
            </div>

            {/* Archive Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Kayıtlı Toplam Sınav
                </span>
                <div className="text-2xl font-black text-slate-800">
                  {allQuizzes.length} <span className="text-xs font-semibold text-slate-400">Sınav</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  1 Aktif Yayında • {pastQuizzes.length} Arşivde
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Toplam Tamamlanan Testler
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  {results.length} <span className="text-xs font-semibold text-slate-400">Öğrenci Karnesi</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Tüm geçmiş sınavların toplamı
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Genel Başarı Ortalaması
                </span>
                <div className="text-2xl font-black text-amber-500">
                  %{overallAverageScore}{' '}
                  <span className="text-xs font-semibold text-slate-400">Puan</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {results.length > 0 ? `${results.length} sonuç üzerinden hesaplandı` : 'Henüz veri yok'}
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Subject Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['all', 'matematik', 'fen_bilimleri', 'turkce', 'sosyal_bilgiler'] as const).map((filter) => {
                const label =
                  filter === 'all'
                    ? 'Tüm Dersler'
                    : filter === 'matematik'
                    ? 'Matematik'
                    : filter === 'fen_bilimleri'
                    ? 'Fen Bilimleri'
                    : filter === 'turkce'
                    ? 'Türkçe'
                    : 'Sosyal Bilgiler';

                const count =
                  filter === 'all'
                    ? allQuizzes.length
                    : allQuizzes.filter((q) => q.subjectId === filter).length;

                return (
                  <button
                    key={filter}
                    onClick={() => setArchiveSubjectFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      archiveSubjectFilter === filter
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        archiveSubjectFilter === filter
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Konu, ders veya kimlik ara..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Archived Quizzes List */}
          <div className="space-y-4">
            {filteredQuizzes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 mb-1">Aramanıza Uygun Sınav Bulunamadı</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Farklı bir arama terimi veya ders filtresi deneyebilirsiniz.
                </p>
                <button
                  onClick={() => {
                    setArchiveSubjectFilter('all');
                    setArchiveSearchQuery('');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              filteredQuizzes.map((q) => {
                const isCurrentActive = q.id === activeQuiz.id;
                const qResults = results.filter((r) => r.quizId === q.id);
                const qTotalCompleted = qResults.length;
                const qParticipation = students.length > 0 ? Math.round((qTotalCompleted / students.length) * 100) : 0;
                const qAvgScore =
                  qResults.length > 0
                    ? Math.round(qResults.reduce((acc, r) => acc + r.score, 0) / qResults.length)
                    : 0;
                const qTopScore = qResults.length > 0 ? Math.max(...qResults.map((r) => r.score)) : 0;

                // Color accent based on subject
                const subjectBadgeColor =
                  q.subjectId === 'matematik'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : q.subjectId === 'fen_bilimleri'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : q.subjectId === 'turkce'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200';

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 shadow-xs ${
                      isCurrentActive
                        ? 'border-emerald-500/70 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Info & Badges */}
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isCurrentActive ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              🟢 YAYINDAKİ AKTİF SINAV
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                              <FolderArchive className="w-3 h-3 text-slate-500" />
                              📁 Arşiv Sınavı
                            </span>
                          )}

                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${subjectBadgeColor}`}>
                            {q.subjectName}
                          </span>

                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                            {q.id}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base sm:text-lg font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                            {q.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatQuizDate(q.createdAt)}
                            </span>
                            <span>•</span>
                            <span>Konu: <strong className="text-slate-700">{q.topic}</strong></span>
                            <span>•</span>
                            <span>{q.questions?.length || 20} Soru</span>
                          </p>
                        </div>

                        {/* Mini Stats Badges */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <div className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-sky-500" />
                            <span>Katılım:</span>
                            <strong className="text-slate-900 font-black">{qTotalCompleted} / {students.length}</strong>
                            <span className="text-slate-400 text-[11px]">(%{qParticipation})</span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>Ortalama:</span>
                            <strong className="text-slate-900 font-black">{qAvgScore} Puan</strong>
                          </div>

                          {qTotalCompleted > 0 && (
                            <div className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                              <span>En Yüksek:</span>
                              <strong className="text-emerald-700 font-black">{qTopScore} Puan</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end">
                        {/* Sonuçları Gör Butonu */}
                        <button
                          onClick={() => {
                            setSelectedQuizId(q.id);
                            setActiveTab('results');
                          }}
                          id={`view-quiz-results-${q.id}`}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Sonuçları İncele ({qTotalCompleted})</span>
                        </button>

                        {/* Mavi Renkli "Soruları ve Cevap Anahtarını Gör" Butonu */}
                        <button
                          onClick={() => toggleQuizQuestions(q.id)}
                          id={`view-quiz-questions-${q.id}`}
                          className={`font-black px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border ${
                            expandedQuizIds[q.id]
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border-sky-200 hover:border-sky-600'
                          }`}
                          title="Bu sınavın sorularını, seçeneklerini ve doğru cevap anahtarını aç/kapat"
                        >
                          <span className="text-xs">📝</span>
                          <span>{expandedQuizIds[q.id] ? 'Soruları Kapat' : 'Soruları ve Cevap Anahtarını Gör'}</span>
                          {expandedQuizIds[q.id] ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        {/* Aktif Sınav Yap Butonu (Eğer şu anda aktif değilse) */}
                        {!isCurrentActive && (
                          <button
                            onClick={() => handleMakeQuizActive(q)}
                            id={`make-active-${q.id}`}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Bu sınavı öğrencilerin giriş ekranında yayına al"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Aktif Sınav Yap</span>
                          </button>
                        )}

                        {/* WhatsApp Özeti */}
                        <button
                          onClick={() => handleCopyWhatsAppForQuiz(q)}
                          id={`copy-wa-${q.id}`}
                          title="WhatsApp Veli Grubu Raporu Kopyala"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        {/* Excel / CSV */}
                        <button
                          onClick={() => handleExportCSVForQuiz(q)}
                          id={`export-csv-${q.id}`}
                          title="Excel / CSV Formatında İndir"
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Excel</span>
                        </button>

                        {/* Sınavı Sil Butonu (Kırmızı renkli, çöp kutusu simgeli) */}
                        <button
                          onClick={() => handleDeleteQuiz(q.id)}
                          id={`delete-quiz-${q.id}`}
                          title="Bu sınavı ve tüm öğrenci sonuçlarını kalıcı olarak sil"
                          className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 font-extrabold px-2.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Sınavı Sil</span>
                        </button>
                      </div>
                    </div>

                    {/* Sorular ve Cevap Anahtarı Akordeonu */}
                    {expandedQuizIds[q.id] && renderQuizQuestionsAccordion(q)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEST OLUŞTURMA (MEB MÜFREDATI VEYA PDF İLE) */}
      {activeTab === 'create_quiz' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
            {/* Top Sub-tabs Switcher: MEB Müfredatından Konu Seç vs PDF Dosyası Yükle (Yeni) */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 mb-6">
              <button
                onClick={() => setCreateMode('curriculum')}
                id="create-mode-curriculum-tab-btn"
                className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  createMode === 'curriculum'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>MEB Müfredatından Konu Seç</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  createMode === 'curriculum' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  Ders / Konu
                </span>
              </button>

              <button
                onClick={() => setCreateMode('pdf')}
                id="create-mode-pdf-tab-btn"
                className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  createMode === 'pdf'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF Dosyası Yükle (Yeni)</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  createMode === 'pdf' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  AI Multimodal
                </span>
              </button>
            </div>

            {/* SEKME 1: MEB MÜFREDATINDAN KONU SEÇ (MEVCUT ÇALIŞAN DROPDOWN YAPISI) */}
            {createMode === 'curriculum' && (
              <div>
                <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-2 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>MEB 4. Sınıf Müfredat Veritabanı & Gemini AI</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                      İki Kademeli Ders ve Konu Seçimiyle 20 Soru Üret
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Ders seçildiğinde altındaki müfredat konuları otomatik dolar. 4. sınıf düzeyinde pedagojik, 4 seçenekli (A, B, C, D) 20 soru üretilir ve anında sınav olarak başlatılır.
                    </p>
                  </div>

                  {generationSource && (
                    <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Kaynak: {generationSource}</span>
                    </div>
                  )}
                </div>

                {/* İKİ KADEMELİ DİNAMİK DROPDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  {/* 1. Menü: Ders Seçimi */}
                  <div>
                    <label
                      htmlFor="select-subject-dropdown"
                      className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between"
                    >
                      <span>1. Menü: Ders Seçimi</span>
                      <span className="text-amber-600 font-bold normal-case text-[11px]">4 Temel MEB Dersi</span>
                    </label>
                    <div className="relative">
                      <select
                        id="select-subject-dropdown"
                        value={selectedSubjectId}
                        onChange={(e) => {
                          const newSub = MEB_CURRICULUM.find((s) => s.id === e.target.value) || MEB_CURRICULUM[0];
                          setSelectedSubjectId(newSub.id as SubjectId);
                          setSelectedTopic(newSub.topics[0]); // Ders seçilince konular otomatik dolsun
                          setJustGenerated(false);
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer shadow-xs"
                      >
                        {MEB_CURRICULUM.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.topics.length} Müfredat Ünitesi)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Menü: Seçilen Derse Ait Ünite / Konu Seçimi */}
                  <div>
                    <label
                      htmlFor="select-topic-dropdown"
                      className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between"
                    >
                      <span>2. Menü: {selectedSubject.name} Konu / Ünite Seçimi</span>
                      <span className="text-slate-400 font-bold normal-case text-[11px]">Otomatik Güncellenir</span>
                    </label>
                    <div className="relative">
                      <select
                        id="select-topic-dropdown"
                        value={selectedTopic}
                        onChange={(e) => {
                          setSelectedTopic(e.target.value);
                          setJustGenerated(false);
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer shadow-xs"
                      >
                        {selectedSubject.topics.map((top) => (
                          <option key={top} value={top}>
                            {top}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Optional Teacher Guidance */}
                <div className="mb-6">
                  <label htmlFor="teacher-custom-note" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Öğretmen Özel Yönergesi (İsteğe Bağlı):
                  </label>
                  <input
                    id="teacher-custom-note"
                    type="text"
                    value={customTeacherNote}
                    onChange={(e) => setCustomTeacherNote(e.target.value)}
                    placeholder="Örn: Sorular günlük hayattan örnekler, problem çözme veya okuduğunu anlama odaklı olsun..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 20 Soru Oluştur ve Başlat Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={isGenerating}
                    id="generate-quiz-btn"
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black px-7 py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Gemini AI ile 20 Soru Oluşturuluyor ve Başlatılıyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>20 Soru Oluştur ve Başlat 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SEKME 2: PDF DOSYASI YÜKLE (YENİ) */}
            {createMode === 'pdf' && (
              <div className="space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full mb-2 uppercase tracking-wide">
                      <FileUp className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gemini Multimodal Vision & Document Intelligence</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                      PDF Dosyasından 20 Soru Oluştur ve Başlat
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Okuma metni, hikaye veya hazır yaprak test PDF'inizi yükleyin. Gemini yapay zekâsı belgeyi multimodal olarak analiz eder ve MEB 4. sınıf düzeyinde 20 interaktif soruya dönüştürür.
                    </p>
                  </div>

                  {generationSource && (
                    <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span>Kaynak: {generationSource}</span>
                    </div>
                  )}
                </div>

                {/* SÜRÜKLE - BIRAK VE TIKLA SEÇ ALANI (YALNIZCA .PDF) */}
                <div>
                  <input
                    type="file"
                    id="pdf-upload-input"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePdfFile(e.target.files[0]);
                      }
                    }}
                  />

                  {!pdfFile ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPdfDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPdfDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPdfDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handlePdfFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => document.getElementById('pdf-upload-input')?.click()}
                      className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        pdfDragActive
                          ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base mb-1">
                        PDF dosyasını buraya sürükleyip bırakın veya seçmek için tıklayın
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md">
                        Yalnızca <strong className="text-slate-700">.pdf</strong> formatındaki dosyalar kabul edilir (Hikaye, ders notu veya yaprak test, maks. 20 MB).
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 border border-indigo-200 shadow-xs">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>PDF Dosyası Seç</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/25">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800 break-all">{pdfFile.name}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Yüklendi
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Boyut: {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Dosya tipi: PDF
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPdfFile(null);
                          setPdfBase64(null);
                          setPdfError('');
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-end sm:self-center"
                      >
                        Farklı PDF Seç
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF İÇERİK TÜRÜ SEÇİMİ: SEÇENEK A ve SEÇENEK B */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                    PDF İçerik Türü ve Soru Üretim Amacını Seçin:
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Seçenek A: Okuma Metni / Konu Anlatımı */}
                    <div
                      onClick={() => setPdfMode('reading_comprehension')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        pdfMode === 'reading_comprehension'
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="pdfMode"
                          id="mode-reading"
                          checked={pdfMode === 'reading_comprehension'}
                          onChange={() => setPdfMode('reading_comprehension')}
                          className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="mode-reading" className="font-black text-slate-800 text-sm block cursor-pointer">
                            Seçenek A: Okuma Metni / Konu Anlatımıdır
                          </label>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Yüklediğiniz hikaye, masal veya ders anlatım metnine uygun <strong>tam 20 adet anlama, kavrama ve çıkarım sorusu</strong> üretir.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-700">
                        <span>📖 Metne Dayalı 20 Özgün Soru</span>
                        <span className="bg-indigo-100 px-2 py-0.5 rounded-md">Önerilen</span>
                      </div>
                    </div>

                    {/* Seçenek B: Hazır Bir Yaprak Testtir */}
                    <div
                      onClick={() => setPdfMode('worksheet_test')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        pdfMode === 'worksheet_test'
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="pdfMode"
                          id="mode-worksheet"
                          checked={pdfMode === 'worksheet_test'}
                          onChange={() => setPdfMode('worksheet_test')}
                          className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="mode-worksheet" className="font-black text-slate-800 text-sm block cursor-pointer">
                            Seçenek B: Hazır Bir Yaprak Testtir
                          </label>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            PDF belgesindeki mevcut soruları algılar, 4 seçenekli (A, B, C, D) <strong>dijital interaktif teste dönüştürür</strong> ve 20 soruya tamamlar.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-700">
                        <span>📝 Soru Algılama & Dijitalleştirme</span>
                        <span className="bg-indigo-100 px-2 py-0.5 rounded-md">OCR & Vision</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sınav Başlığı ve Ders Bilgisi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pdf-subject-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ders Adı:
                    </label>
                    <select
                      id="pdf-subject-input"
                      value={pdfSubjectName}
                      onChange={(e) => setPdfSubjectName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Türkçe">Türkçe</option>
                      <option value="Matematik">Matematik</option>
                      <option value="Fen Bilimleri">Fen Bilimleri</option>
                      <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                      <option value="Genel Değerlendirme">Genel Değerlendirme</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pdf-topic-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Sınav / Konu Başlığı:
                    </label>
                    <input
                      id="pdf-topic-input"
                      type="text"
                      value={pdfTopicName}
                      onChange={(e) => setPdfTopicName(e.target.value)}
                      placeholder="Örn: Küçük Prens Okuma Testi / Kesirler Yaprak Test"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Öğretmen Özel Yönergesi */}
                <div>
                  <label htmlFor="pdf-teacher-note" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Öğretmen Özel Yönergesi (İsteğe Bağlı):
                  </label>
                  <input
                    id="pdf-teacher-note"
                    type="text"
                    value={pdfTeacherNote}
                    onChange={(e) => setPdfTeacherNote(e.target.value)}
                    placeholder="Örn: İlk 10 soru doğrudan metin anlama, son 10 soru ise kelime bilgisi ve ana fikir olsun..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Hata Uyarısı */}
                {pdfError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-bold">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{pdfError}</span>
                  </div>
                )}

                {/* PDF'ten 20 Soru Oluştur ve Başlat Butonu */}
                <div>
                  <button
                    onClick={handleGenerateQuizFromPdf}
                    disabled={isGeneratingPdf || !pdfFile}
                    id="generate-quiz-from-pdf-btn"
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black px-8 py-4 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>PDF Analiz Ediliyor ve 20 Soru Hazırlanıyor... (~10-15 sn)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>PDF'ten 20 Soru Oluştur ve Başlat 🚀</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    Sınav oluşturulduğu anda öğrenciler sınav ekranında bu 20 soruyu süre sayacı ve karne sistemiyle çözebilir.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* YEŞİL RENKLİ BÜYÜK "VELİ GRUBU İÇİN MESAJI KOPYALA" ALANI */}
          <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aktif Sınav: {activeQuiz.subjectName} - {activeQuiz.topic}</span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                  Veli Grubu İçin Hazır Mesajı Kopyala
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Öğrencilerinizin sınava başlayabilmesi için aşağıdaki yeşil butona basarak hazır WhatsApp / Telegram duyuru mesajını tek tıkla kopyalayabilirsiniz.
                </p>
              </div>

              {/* BÜYÜK YEŞİL BUTON */}
              <button
                onClick={handleCopyParentMessage}
                id="parent-share-big-green-btn"
                className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base py-4 px-7 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                {parentMsgCopied ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Mesaj Kopyalandı! ✅</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    <span>Veli Grubu İçin Mesajı Kopyala 📋</span>
                  </>
                )}
              </button>
            </div>

            {/* Hazır Metin Önizlemesi */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap select-all shadow-inner">
{`Değerli Velilerimiz ve Sevgili Öğrencilerim,
${activeQuiz.subjectName} dersi '${activeQuiz.topic}' pekiştirme testimiz hazırdır. Aşağıdaki linke tıklayarak listeden adınızı seçip teste başlayabilirsiniz:
🔗 Sınav Linki: ${getStudentExamUrl()}`}
            </div>

            {parentMsgCopied && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mesaj panoya kopyalandı! Şimdi WhatsApp veli grubunuza yapıştırabilirsiniz (Ctrl+V).</span>
              </div>
            )}
          </div>

          {/* Generated Questions Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <span>Üretilen Sorular ve Cevap Anahtarı</span>
                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {previewQuestions.length} Soru
                </span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Aktif Test: <strong className="text-slate-800">{activeQuiz.topic}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewQuestions.map((q) => (
                <div key={q.id} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Soru {q.id}
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Doğru Şık: {q.correctAnswer}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 leading-snug">{q.question}</p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                      <div
                        key={opt}
                        className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                          q.correctAnswer === opt
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="w-4 h-4 rounded text-[10px] flex items-center justify-center font-black bg-slate-200">
                          {opt}
                        </span>
                        <span className="truncate">{q.options[opt]}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100 font-medium">
                      💡 <strong>Çözüm/Açıklama:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SINIF LİSTESİ YÖNETİMİ (35 Kişilik Liste) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
                  4. Sınıf Öğrenci Listesi ({students.length} Kişi)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Öğrenciler sınav ekranında adlarını bu listeden seçerek teste başlar. İsim ekleyebilir, silebilir veya MEB 35 kişilik varsayılan listeye dönebilirsiniz.
                </p>
              </div>

              <button
                onClick={handleResetDefaultStudents}
                id="reset-default-students-btn"
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>35 Kişilik Listeye Sıfırla</span>
              </button>
            </div>

            {/* Add Student Form */}
            <form onSubmit={handleAddStudent} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Yeni öğrenci adı ve soyadı girin..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                id="add-student-btn"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Öğrenci Ekle</span>
              </button>
            </form>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {students.map((std) => (
                <div
                  key={std.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                      {std.no}
                    </span>
                    {editingStudentId === std.id ? (
                      <input
                        type="text"
                        value={editingStudentName}
                        onChange={(e) => setEditingStudentName(e.target.value)}
                        onBlur={() => handleUpdateStudent(std.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateStudent(std.id)}
                        autoFocus
                        className="text-xs font-bold text-slate-800 px-1 py-0.5 bg-white border border-amber-500 rounded"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-800 truncate">{std.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {editingStudentId === std.id ? (
                      <button
                        onClick={() => handleUpdateStudent(std.id)}
                        className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Kaydet
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStudentId(std.id);
                          setEditingStudentName(std.name);
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        Düzenle
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteStudent(std.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Exam Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {selectedStudentDetail.studentName} — Sınav Kağıdı
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedStudentDetail.subjectName} • {selectedStudentDetail.topic} • Harcanan Süre:{' '}
                  {selectedStudentDetail.formattedDuration}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score pill */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Puan</span>
                <span className="text-base text-amber-600">{selectedStudentDetail.score} / 100</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Doğru</span>
                <span className="text-base text-emerald-600">{selectedStudentDetail.correctCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Yanlış</span>
                <span className="text-base text-rose-600">{selectedStudentDetail.wrongCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Boş</span>
                <span className="text-base text-slate-600">{selectedStudentDetail.emptyCount}</span>
              </div>
            </div>

            {/* Answers Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Soru Soru Yanıtlar:</h4>
              {selectedStudentDetail.answers.map((ans, idx) => {
                const questionObj = activeQuiz.questions.find((q) => q.id === ans.questionId);
                return (
                  <div
                    key={ans.questionId}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      ans.isCorrect
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : ans.selectedOption === null
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Soru {idx + 1}: {questionObj?.question}</span>
                      <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-black">
                        {ans.isCorrect ? '✅ Doğru' : ans.selectedOption === null ? '⚪ Boş' : '❌ Yanlış'}
                      </span>
                    </div>

                    <div className="flex gap-4 text-[11px] pt-1">
                      <span>Öğrencinin Yanıtı: <strong>{ans.selectedOption || 'İşaretlenmedi'}</strong></span>
                      <span>Doğru Cevap: <strong className="text-emerald-700">{questionObj?.correctAnswer}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clear Results Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              Tüm Sonuçları Temizlemek İstiyor musunuz?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Bu işlem mevcut sınava ait tüm öğrenci yanıtlarını ve puanlarını sıfırlar.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleClearResults}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Evet, Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Quiz Confirmation Modal */}
      {quizToDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-block">
                Kalıcı Silme Onayı
              </span>
              <h3 className="text-lg font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] pt-1">
                Sınavı Silmek İstiyor musunuz?
              </h3>
            </div>

            <div className="bg-rose-50/70 border border-rose-150 rounded-2xl p-3.5 text-left text-xs space-y-1 text-slate-700">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{quizToDeleteConfirm.subjectName} — {quizToDeleteConfirm.topic}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {quizToDeleteConfirm.title} ({quizToDeleteConfirm.questions?.length || 20} Soru)
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Sınav ID: {quizToDeleteConfirm.id}
              </p>
            </div>

            <p className="text-xs text-rose-700 font-bold bg-rose-50/50 p-2.5 rounded-xl border border-rose-200/60">
              Bu sınavı ve tüm öğrenci sonuçlarını kalıcı olarak silmek istediğinize emin misiniz?
            </p>

            <p className="text-[11px] text-slate-500">
              Bu işlem geri alınamaz. Sınava ait tüm öğrenci karne kayıtları, cevaplar ve puanlar sistemden tamamen temizlenir.
            </p>

            <div className="flex gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={() => setQuizToDeleteConfirm(null)}
                id="cancel-delete-quiz-btn"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuiz}
                id="confirm-delete-quiz-btn"
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Evet, Kalıcı Olarak Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {quizActionToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{quizActionToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};
