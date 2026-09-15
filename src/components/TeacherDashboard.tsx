import React, { useState } from 'react';
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

  // Tabs: 'results' | 'create_quiz' | 'students'
  const [activeTab, setActiveTab] = useState<'results' | 'create_quiz' | 'students'>('results');

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

  // Helper to generate full student exam URL
  const getStudentExamUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'student');
    return url.toString();
  };

  // Helper to copy the parent group message
  const handleCopyParentMessage = () => {
    const link = getStudentExamUrl();
    const text = `Değerli Velilerimiz ve Sevgili Öğrencilerim,
${activeQuiz.subjectName} dersi '${activeQuiz.topic}' pekiştirme testimiz hazırdır. Aşağıdaki linke tıklayarak listeden adınızı seçip teste başlayabilirsiniz:
🔗 Sınav Linki: ${link}`;

    navigator.clipboard.writeText(text);
    setParentMsgCopied(true);
    setTimeout(() => setParentMsgCopied(false), 3500);
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === '1051hmz+') {
      Storage.setTeacherLoggedIn(true);
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Hatalı şifre! Lütfen kontrol ediniz. (İpucu: ogretmen12)');
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
          id: `quiz-${Date.now()}`,
          title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          topic: selectedTopic,
          createdAt: new Date().toISOString(),
          questions: data.questions,
        };

        setActiveQuiz(newQuiz);
        Storage.setActiveQuiz(newQuiz);
        setJustGenerated(true);
        refreshData();
      } else {
        // Use rich curriculum fallback
        console.warn('API returned fallback or key not set. Using curriculum generator.');
        const fallback = getFallbackQuestions(selectedSubject.name, selectedTopic);
        setPreviewQuestions(fallback);
        setGenerationSource('MEB 4. Sınıf Soru Bankası');

        const newQuiz: Quiz = {
          id: `quiz-${Date.now()}`,
          title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          topic: selectedTopic,
          createdAt: new Date().toISOString(),
          questions: fallback,
        };

        setActiveQuiz(newQuiz);
        Storage.setActiveQuiz(newQuiz);
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
        id: `quiz-${Date.now()}`,
        title: `${selectedSubject.name} 4. Sınıf - ${selectedTopic} Değerlendirme Testi`,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        topic: selectedTopic,
        createdAt: new Date().toISOString(),
        questions: fallback,
      };

      setActiveQuiz(newQuiz);
      Storage.setActiveQuiz(newQuiz);
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
          id: `quiz-pdf-${Date.now()}`,
          title: `${titleSubject} 4. Sınıf - ${titleTopic} Değerlendirme Testi`,
          subjectId: subId,
          subjectName: titleSubject,
          topic: titleTopic,
          createdAt: new Date().toISOString(),
          questions: data.questions,
        };

        setActiveQuiz(newQuiz);
        Storage.setActiveQuiz(newQuiz);
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

  // Completed & Uncompleted students
  const completedStudentIds = new Set(results.map((r) => r.studentId));
  const uncompletedStudents = students.filter((s) => !completedStudentIds.has(s.id));
  const totalCompleted = results.length;
  const totalPossible = students.length;
  const participationRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const averageScore =
    results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;
  const averageCorrect =
    results.length > 0
      ? (results.reduce((acc, r) => acc + r.correctCount, 0) / results.length).toFixed(1)
      : '0';

  // Format Duration for WhatsApp (e.g. 14 dk)
  const formatDurationMin = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return mins <= 0 ? '1 dk' : `${mins} dk`;
  };

  // Copy results for WhatsApp
  const handleCopyWhatsApp = () => {
    const sorted = [...results].sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds);

    let text = `📊 ${activeQuiz.subjectName} - ${activeQuiz.topic} Testi Sonuçları:\n`;

    if (sorted.length === 0) {
      text += `Henüz sınava katılan öğrenci bulunmamaktadır.\n`;
    } else {
      sorted.forEach((r, idx) => {
        text += `${idx + 1}. ${r.studentName}: ${r.correctCount}/${r.totalQuestions} Doğru (${formatDurationMin(r.durationSeconds)})\n`;
      });
    }

    text += `\n❌ Katılmayanlar: `;
    if (uncompletedStudents.length === 0) {
      text += `Tüm öğrenciler katıldı 🎉`;
    } else {
      text += uncompletedStudents.map((s) => s.name).join(', ');
    }

    navigator.clipboard.writeText(text);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 3000);
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const sorted = [...results].sort((a, b) => b.score - a.score);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += 'Sıra;Okul No;Öğrenci Adı Soyadı;Ders;Konu;Doğru;Yanlış;Boş;Puan;Harcanan Süre;Tamamlanma Tarihi\n';

    sorted.forEach((r, idx) => {
      csvContent += `${idx + 1};${r.studentNo};"${r.studentName}";"${r.subjectName}";"${r.topic}";${r.correctCount};${r.wrongCount};${r.emptyCount};${r.score};"${r.formattedDuration}";"${new Date(r.submittedAt).toLocaleString('tr-TR')}"\n`;
    });

    if (uncompletedStudents.length > 0) {
      csvContent += '\n--- HENÜZ SINAVA GİRMEYENLER ---\n';
      uncompletedStudents.forEach((s) => {
        csvContent += `-;${s.no};"${s.name}";"${activeQuiz.subjectName}";"${activeQuiz.topic}";0;0;20;0;"-";"Katılmadı"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeQuiz.subjectName}_${activeQuiz.topic}_Sonuclari.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear results for new exam
  const handleClearResults = () => {
    Storage.clearQuizResults(activeQuiz.id);
    refreshData();
    setShowClearConfirm(false);
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
      {/* Top Bar with Teacher Info and Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Öğretmen Yönetim Paneli
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
            {activeQuiz.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Ders: <strong className="text-slate-800">{activeQuiz.subjectName}</strong> • Konu:{' '}
            <strong className="text-slate-800">{activeQuiz.topic}</strong> • 20 Soru
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Veli Grubu İçin Mesajı Kopyala (Top Action Button) */}
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

          {/* Sub Navigation Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('results')}
              id="tab-results-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'results' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Canlı Sonuçlar ({results.length}/{students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create_quiz')}
              id="tab-create-quiz-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'create_quiz' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>20 Soru Üret (AI)</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              id="tab-students-btn"
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'students' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Sınıf Listesi ({students.length})</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            id="teacher-logout-btn"
            title="Oturumu Kapat"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-auto md:ml-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: CANLI SONUÇ PANOSU */}
      {activeTab === 'results' && (
        <div className="space-y-6">
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
                    Tamamlanan Sınav Sonuçları
                  </h3>
                  <p className="text-xs text-slate-400">
                    Öğrencilerin doğru, yanlış, puan ve harcanan süre tablosu
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    id="clear-results-btn"
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sonuçları Temizle</span>
                  </button>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">Henüz Sınav Sonucu Yok</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Öğrenciler testi tamamladıkça sonuçlar anlık olarak burada listelenecektir.
                  </p>
                  <button
                    onClick={handleCopyParentMessage}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Veli Grubuna Sınav Linkini Gönder</span>
                  </button>
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
                      {[...results]
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
                  <p className="text-xs text-slate-400">Henüz teste başlamamış öğrenciler</p>
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
    </div>
  );
};
