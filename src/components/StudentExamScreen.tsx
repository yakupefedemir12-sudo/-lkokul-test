import React, { useState, useEffect, useMemo } from 'react';
import { Quiz, Student, ExamResult, StudentAnswer } from '../types';
import { Storage } from '../utils/storage';
import { notifyWebhookOrMessagingService } from '../utils/notifications';
import {
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Smile,
  BookOpen,
  HelpCircle,
  Trophy,
  Filter,
  Printer,
  UserCheck,
  RotateCcw,
  Lightbulb,
  Check,
  X,
  Lock,
} from 'lucide-react';

interface StudentExamScreenProps {
  quiz: Quiz;
  students: Student[];
  results: ExamResult[];
  refreshData: () => void;
}

export const StudentExamScreen: React.FC<StudentExamScreenProps> = ({
  quiz,
  students,
  results,
  refreshData,
}) => {
  // Session storage key for locking the student to this quiz
  const studentSessionKey = `meb_student_session_${quiz.id}`;

  // Screen phase: 'select_student' | 'taking_exam' | 'submitted'
  const [phase, setPhase] = useState<'select_student' | 'taking_exam' | 'submitted'>('select_student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [showConfirmFinish, setShowConfirmFinish] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<ExamResult | null>(null);

  // Review filter for the Karne: 'all' | 'wrong' | 'correct'
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  // Completed student results mapped by studentId
  const studentResultMap = useMemo(() => {
    const map = new Map<string, ExamResult>();
    results
      .filter((r) => r.quizId === quiz.id)
      .forEach((r) => map.set(r.studentId, r));
    return map;
  }, [results, quiz.id]);

  const completedStudentIds = useMemo(() => {
    return new Set(studentResultMap.keys());
  }, [studentResultMap]);

  // Check on mount if student already finished this quiz in this browser session
  useEffect(() => {
    const savedStudentId = localStorage.getItem(studentSessionKey);
    if (savedStudentId) {
      const existingResult = studentResultMap.get(savedStudentId);
      if (existingResult) {
        setSelectedStudentId(savedStudentId);
        setActiveResult(existingResult);
        setPhase('submitted');
        return;
      }
    }
  }, [studentSessionKey, studentResultMap]);

  // Selected student object
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Timer effect during taking_exam
  useEffect(() => {
    let interval: any = null;
    if (phase === 'taking_exam') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase]);

  // Format seconds into "04:12"
  const formatTimerDigital = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format seconds into verbose "14 dk 22 sn"
  const formatTimerVerbose = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs} sn`;
    return `${mins} dk ${secs} sn`;
  };

  // Start exam
  const handleStartExam = () => {
    if (!selectedStudentId) return;

    // Strict lock: if student already completed, redirect to karne instead of allowing retake
    const existing = studentResultMap.get(selectedStudentId);
    if (existing) {
      setActiveResult(existing);
      setPhase('submitted');
      localStorage.setItem(studentSessionKey, selectedStudentId);
      return;
    }

    setPhase('taking_exam');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSecondsElapsed(0);
  };

  // Directly view completed student's report card
  const handleViewExistingKarne = () => {
    if (!selectedStudentId) return;
    const existing = studentResultMap.get(selectedStudentId);
    if (existing) {
      setActiveResult(existing);
      setPhase('submitted');
      localStorage.setItem(studentSessionKey, selectedStudentId);
    }
  };

  // Select Option
  const handleSelectOption = (questionId: number, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Current question data
  const currentQuestion = quiz.questions[currentQuestionIndex] || quiz.questions[0];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const emptyCount = totalQuestions - answeredCount;

  // Submit test
  const handleConfirmFinish = async () => {
    if (!selectedStudent) return;

    // Calculate score
    let correct = 0;
    let wrong = 0;
    let empty = 0;

    const detailedAnswers: StudentAnswer[] = quiz.questions.map((q) => {
      const selected = answers[q.id] || null;
      if (!selected) {
        empty++;
        return {
          questionId: q.id,
          selectedOption: null,
          isCorrect: false,
        };
      }

      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      else wrong++;

      return {
        questionId: q.id,
        selectedOption: selected,
        isCorrect,
      };
    });

    const calculatedScore = Math.round((correct / totalQuestions) * 100);

    const newResult: ExamResult = {
      id: `res-${Date.now()}-${selectedStudent.id}`,
      quizId: quiz.id,
      studentId: selectedStudent.id,
      studentNo: selectedStudent.no,
      studentName: selectedStudent.name,
      subjectName: quiz.subjectName,
      topic: quiz.topic,
      totalQuestions,
      correctCount: correct,
      wrongCount: wrong,
      emptyCount: empty,
      score: calculatedScore,
      durationSeconds: secondsElapsed,
      formattedDuration: formatTimerVerbose(secondsElapsed),
      submittedAt: new Date().toISOString(),
      answers: detailedAnswers,
    };

    // Save to local storage
    Storage.saveResult(newResult);

    // Lock student to this quiz in localStorage so page refresh preserves their karne
    localStorage.setItem(studentSessionKey, selectedStudent.id);

    // Call ready-made webhook / messaging notification function
    await notifyWebhookOrMessagingService(newResult);

    setActiveResult(newResult);
    setPhase('submitted');
    setShowConfirmFinish(false);
    refreshData();
  };

  // Switch student / logout from session
  const handleSwitchStudent = () => {
    localStorage.removeItem(studentSessionKey);
    setSelectedStudentId('');
    setActiveResult(null);
    setAnswers({});
    setPhase('select_student');
  };

  // ==========================================
  // 1. PHASE: STUDENT SELECTION SCREEN
  // ==========================================
  if (phase === 'select_student') {
    const isSelectedCompleted = selectedStudentId ? completedStudentIds.has(selectedStudentId) : false;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl border-2 border-amber-200/80 p-6 sm:p-10 text-center relative overflow-hidden">
          {/* Background motifs */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100/60 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-100/60 rounded-full blur-xl pointer-events-none"></div>

          {/* Child-friendly Mascot / Icon */}
          <div className="w-20 h-20 rounded-3xl bg-linear-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25 transform hover:scale-105 transition-transform">
            <BookOpen className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>MEB 4. Sınıf Online Değerlendirme</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
            {quiz.subjectName} Sınavına Hoş Geldin!
          </h2>
          <p className="text-sm font-semibold text-slate-600 mb-6">
            Konu: <span className="text-amber-600 font-extrabold">{quiz.topic}</span>
          </p>

          {/* Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 text-center">
            <div className="p-2">
              <span className="block text-[11px] font-bold text-slate-400 uppercase">Soru Sayısı</span>
              <span className="text-lg font-black text-slate-800">{totalQuestions} Soru</span>
            </div>
            <div className="p-2 border-x border-slate-200">
              <span className="block text-[11px] font-bold text-slate-400 uppercase">Seçenek</span>
              <span className="text-lg font-black text-slate-800">4 Şıklı</span>
            </div>
            <div className="p-2">
              <span className="block text-[11px] font-bold text-slate-400 uppercase">Süreç</span>
              <span className="text-lg font-black text-emerald-600">Süreli Test</span>
            </div>
          </div>

          {/* Student Dropdown */}
          <div className="text-left mb-6">
            <label htmlFor="student-dropdown" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              1. Adım: Sınıf Listesinden Adını Seç
            </label>
            <div className="relative">
              <select
                id="student-dropdown"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
              >
                <option value="">-- Adını ve Soyadını Seç --</option>
                {students.map((std) => {
                  const isCompleted = completedStudentIds.has(std.id);
                  return (
                    <option key={std.id} value={std.id}>
                      {std.no} - {std.name} {isCompleted ? '🔒 (Tamamlandı - Karneyi Gör)' : '✅'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* If selected student already took the test */}
            {isSelectedCompleted && (
              <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900">
                      Bu Testi Daha Önce Tamamladın!
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Sistem her öğrenciye tek bir sınav hakkı tanır. Cevapların öğretmenine kaydedildi. Aşağıdaki butona basarak sınav sonuç karneni ve tüm soruların çözümlerini dilediğin gibi inceleyebilirsin:
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleViewExistingKarne}
                  id="view-completed-karne-btn"
                  className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Sınav Sonuç Karnemi ve Yanıtlarımı Gör</span>
                </button>
              </div>
            )}
          </div>

          {/* Start Button - only enabled for students who have NOT completed yet */}
          {!isSelectedCompleted && (
            <button
              onClick={handleStartExam}
              disabled={!selectedStudentId}
              id="start-exam-btn"
              className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-black py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sınava Başla 🚀</span>
            </button>
          )}

          <p className="text-xs text-slate-400 mt-4">
            * "Sınava Başla" butonuna bastığında süren işlemeye başlayacaktır. Başarılar dileriz!
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. PHASE: SINAV SONUÇ KARNESİ VE CEVAP İNCELEME
  // ==========================================
  if (phase === 'submitted') {
    const result = activeResult || studentResultMap.get(selectedStudentId);

    if (!result) {
      return (
        <div className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-600 font-bold mb-4">Sınav sonucu bulunamadı.</p>
          <button
            onClick={handleSwitchStudent}
            className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs"
          >
            Öğrenci Girişine Dön
          </button>
        </div>
      );
    }

    // Filter questions according to reviewFilter
    const filteredQuestions = quiz.questions.filter((q) => {
      const studentAns = result.answers?.find((a) => a.questionId === q.id);
      const isCorrect = studentAns?.isCorrect === true;

      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'wrong') return !isCorrect;
      return true; // 'all'
    });

    const isHighSuccess = result.score >= 85;
    const isMediumSuccess = result.score >= 65 && result.score < 85;

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 print:p-0">
        {/* 🔒 Top Lock Notice */}
        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sky-900 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-200 text-sky-800 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-sky-200 px-2 py-0.5 rounded-md text-sky-800">
                  Sınav Kilitli
                </span>
                <span className="text-xs text-sky-700 font-bold">
                  Öğrenci: <strong>{result.studentName}</strong> (No: {result.studentNo})
                </span>
              </div>
              <p className="text-xs text-sky-800 mt-0.5">
                Bu test tamamlanmış ve yanıtların öğretmenine başarıyla iletilmiştir. Tekrar çözülemez, karneni istediğin zaman inceleyebilirsin.
              </p>
            </div>
          </div>
          <button
            onClick={handleSwitchStudent}
            id="switch-student-from-karne-btn"
            className="shrink-0 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Farklı Öğrenci Girişi</span>
          </button>
        </div>

        {/* 🏆 1. BÖLÜM: KUTLAMA DOLU ŞIK "SINAV SONUÇ KARNESİ" */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200/90 overflow-hidden relative">
          {/* Top Decorative Banner */}
          <div className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white text-center relative">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xs text-amber-200 border-4 border-white/30 flex items-center justify-center mx-auto mb-3 shadow-inner animate-bounce">
              <Trophy className="w-10 h-10 text-amber-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>MEB 4. Sınıf Sınav Sonuç Karnesi</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
              {isHighSuccess
                ? 'Harika İş Çıkardın! 🌟'
                : isMediumSuccess
                ? 'Tebrikler, Çok Güzel Bir Sonuç! 👏'
                : 'Gayretin İçin Tebrikler! 📚'}
            </h2>

            <p className="text-sm font-semibold text-white/90 max-w-lg mx-auto">
              Sevgili <strong className="text-white underline underline-offset-4">{result.studentName}</strong>,{' '}
              {result.subjectName} dersi <span className="font-bold">"{result.topic}"</span> değerlendirme testini başarıyla tamamladın.
            </p>
          </div>

          {/* 4 Metric Cards Grid */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* 1. Doğru Sayısı */}
              <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="block text-[11px] font-black text-emerald-800 uppercase tracking-wide">
                  Doğru Sayısı
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {result.correctCount}
                </span>
                <span className="block text-xs font-semibold text-emerald-600 mt-0.5">
                  / {result.totalQuestions} Soru
                </span>
              </div>

              {/* 2. Yanlış Sayısı */}
              <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-2">
                  <XCircle className="w-6 h-6" />
                </div>
                <span className="block text-[11px] font-black text-rose-800 uppercase tracking-wide">
                  Yanlış Sayısı
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-700">
                  {result.wrongCount}
                </span>
                <span className="block text-xs font-semibold text-rose-600 mt-0.5">
                  {result.emptyCount > 0 ? `+ ${result.emptyCount} Boş` : 'Yanıt'}
                </span>
              </div>

              {/* 3. Başarı Puanı */}
              <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <span className="block text-[11px] font-black text-amber-800 uppercase tracking-wide">
                  Başarı Puanı
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-700">
                  %{result.score}
                </span>
                <span className="block text-xs font-semibold text-amber-600 mt-0.5">
                  100 Üzerinden
                </span>
              </div>

              {/* 4. Bitirme Süresi */}
              <div className="bg-sky-50/70 border-2 border-sky-200 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="block text-[11px] font-black text-sky-800 uppercase tracking-wide">
                  Bitirme Süresi
                </span>
                <span className="text-lg sm:text-xl font-black text-sky-800 py-1">
                  {result.formattedDuration}
                </span>
                <span className="block text-xs font-semibold text-sky-600 mt-0.5">
                  Harcanan Süre
                </span>
              </div>
            </div>

            {/* Score Bar & Pedagogical Evaluation Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Başarı Çubuğu (% {result.score})</span>
                <span className="text-amber-700 font-extrabold">
                  {result.score >= 85
                    ? '🌟 Pekiyi (Kazanımlar Tam Kavrandı)'
                    : result.score >= 70
                    ? '👍 Çok İyi (Küçük Eksikler Var)'
                    : result.score >= 50
                    ? '📘 Orta (Tekrar Önerilir)'
                    : '💪 Geliştirilmeli (Çözümleri Dikkatle Oku)'}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.score >= 85
                      ? 'bg-emerald-500'
                      : result.score >= 65
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(5, result.score)}%` }}
                ></div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                💡 <strong>Öğretmen Tavsiyesi:</strong> Aşağıda senin için hazırlanan{' '}
                <span className="text-amber-700 font-bold">"Cevaplarını ve Yanlışlarını İncele"</span> bölümünden yanlış yaptığın soruların çözümlerini dikkatle okuyabilir, eksiklerini anında giderebilirsin!
              </p>
            </div>

            {/* Print button */}
            <div className="flex justify-end pt-4 print:hidden">
              <button
                onClick={() => window.print()}
                id="print-karne-btn"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Karneyi Yazdır / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🔍 2. BÖLÜM: "CEVAPLARINI VE YANLIŞLARINI İNCELE" */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 font-['Plus_Jakarta_Sans',sans-serif]">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span>Cevaplarını ve Yanlışlarını İncele</span>
              </h3>
              <p className="text-xs text-slate-500">
                Doğru bildiğin sorular yeşil, yanlış yaptığın sorular kırmızı çerçeveyle gösterilir.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold print:hidden">
              <button
                onClick={() => setReviewFilter('all')}
                id="filter-all-btn"
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({quiz.questions.length})
              </button>
              <button
                onClick={() => setReviewFilter('wrong')}
                id="filter-wrong-btn"
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  reviewFilter === 'wrong'
                    ? 'bg-rose-500 text-white shadow-xs font-black'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Yanlışlarım ({result.wrongCount})</span>
              </button>
              <button
                onClick={() => setReviewFilter('correct')}
                id="filter-correct-btn"
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  reviewFilter === 'correct'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Doğrularım ({result.correctCount})</span>
              </button>
            </div>
          </div>

          {/* List of Questions with Detailed Review */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                {reviewFilter === 'wrong' ? (
                  <div className="space-y-2">
                    <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="font-bold text-slate-700">Harika! Hiç yanlışın yok, tüm soruları doğru yanıtladın!</p>
                  </div>
                ) : (
                  <p className="font-bold">Bu filtreye uygun soru bulunamadı.</p>
                )}
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const studentAnswer = result.answers?.find((a) => a.questionId === q.id);
                const selectedKey = studentAnswer?.selectedOption || null;
                const isCorrect = studentAnswer?.isCorrect === true;
                const isBlank = !selectedKey;

                return (
                  <div
                    key={q.id}
                    id={`review-question-${q.id}`}
                    className={`rounded-2xl border-2 p-5 sm:p-6 transition-all bg-white shadow-xs ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : isBlank
                        ? 'border-amber-400 bg-amber-50/20'
                        : 'border-rose-500 bg-rose-50/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {q.id}. Soru
                        </span>
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>DOĞRU CEVAP</span>
                          </span>
                        ) : isBlank ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>BOŞ BIRAKILDI</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>YANLIŞ CEVAP</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <p className="text-base sm:text-lg font-bold text-slate-900 mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
                      {q.question}
                    </p>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                      {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                        const isStudentChoice = selectedKey === optKey;
                        const isCorrectKey = q.correctAnswer === optKey;

                        let optStyle = 'border-slate-200 bg-slate-50/50 text-slate-700';
                        let badgeText = null;

                        if (isCorrectKey) {
                          optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-300';
                          badgeText = 'Doğru Cevap';
                        } else if (isStudentChoice && !isCorrectKey) {
                          optStyle = 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-1 ring-rose-300';
                          badgeText = 'Senin Cevabın';
                        }

                        return (
                          <div
                            key={optKey}
                            className={`p-3 rounded-xl border-2 flex items-start gap-2.5 text-xs sm:text-sm ${optStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                isCorrectKey
                                  ? 'bg-emerald-600 text-white'
                                  : isStudentChoice
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {optKey}
                            </span>
                            <div className="flex-1 leading-snug">
                              <span>{q.options[optKey]}</span>
                              {badgeText && (
                                <span
                                  className={`ml-2 inline-block text-[10px] font-black uppercase px-1.5 py-0.2 rounded ${
                                    isCorrectKey
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : 'bg-rose-200 text-rose-800'
                                  }`}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Compare Section for Wrong / Blank Answers */}
                    {!isCorrect && (
                      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                        <div className="p-3 bg-rose-100/70 border border-rose-300 rounded-xl text-rose-900 flex items-center justify-between">
                          <span>Senin Cevabın:</span>
                          <strong className="font-black text-rose-800">
                            {selectedKey ? `${selectedKey}) ${q.options[selectedKey]}` : 'Boş Bıraktın'}
                          </strong>
                        </div>
                        <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-900 flex items-center justify-between">
                          <span>Doğru Cevap:</span>
                          <strong className="font-black text-emerald-800">
                            {q.correctAnswer}) {q.options[q.correctAnswer]}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* 💡 Çözüm ve Açıklama Metni */}
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-amber-800 block mb-0.5 uppercase tracking-wide text-[11px]">
                          Çözüm ve Açıklama:
                        </span>
                        <p className="leading-relaxed font-medium">
                          {q.explanation || `${q.correctAnswer} seçeneği doğru cevaptır.`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Switch Student Button */}
        <div className="text-center pt-4 print:hidden">
          <button
            onClick={handleSwitchStudent}
            id="bottom-return-btn"
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            Farklı Bir Öğrenci Seçimine Dön
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. PHASE: ACTIVE EXAM SCREEN
  // ==========================================
  const selectedOptionForCurrent = answers[currentQuestion.id] || null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Floating Exam Status Card */}
      <div className="bg-white rounded-2xl border-2 border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Student & Quiz Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0 border border-amber-300">
            {selectedStudent?.no}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm">{selectedStudent?.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {quiz.subjectName} • {quiz.topic}
            </p>
          </div>
        </div>

        {/* Stopwatch & Progress */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Stopwatch */}
          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 font-mono font-black text-sm px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs">
            <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>{formatTimerDigital(secondsElapsed)}</span>
          </div>

          {/* Question Counter */}
          <div className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Soru <span className="text-amber-600 text-sm">{currentQuestionIndex + 1}</span> / {totalQuestions}
          </div>

          {/* Finish Button */}
          <button
            onClick={() => setShowConfirmFinish(true)}
            id="open-finish-confirm-btn"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Testi Bitir</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-linear-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        ></div>
      </div>

      {/* Question Navigation Map (1-20 buttons for 4th graders) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Soru Gezinti Haritası ({answeredCount}/{totalQuestions} Yanıtlandı)</span>
          <span className="text-[11px] text-emerald-600">Yeşil: Cevaplandı</span>
        </div>
        <div className="grid grid-cols-10 sm:grid-cols-20 gap-1 sm:gap-1.5">
          {quiz.questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentQuestionIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                id={`q-nav-btn-${idx + 1}`}
                className={`h-8 sm:h-9 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center border ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                    : isAnswered
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Big Question Box (Primary School Friendly Typography) */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Question Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            {currentQuestionIndex + 1}. Soru
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Kazanım Değerlendirme
          </span>
        </div>

        {/* Question Text */}
        <div className="text-base sm:text-lg md:text-xl font-bold text-slate-800 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
          {currentQuestion.question}
        </div>

        {/* 4 Options (A, B, C, D) */}
        <div className="space-y-3 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
            const isSelected = selectedOptionForCurrent === optKey;

            const letterColors: Record<string, string> = {
              A: 'bg-rose-500 text-white',
              B: 'bg-sky-500 text-white',
              C: 'bg-amber-500 text-white',
              D: 'bg-emerald-500 text-white',
            };

            return (
              <button
                key={optKey}
                onClick={() => handleSelectOption(currentQuestion.id, optKey)}
                id={`q-${currentQuestion.id}-opt-${optKey}`}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 cursor-pointer text-sm sm:text-base font-semibold ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20 text-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {/* Option Letter Circle */}
                <div
                  className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                    isSelected ? 'bg-amber-600 text-white scale-105' : letterColors[optKey]
                  }`}
                >
                  {optKey}
                </div>

                {/* Option Text */}
                <span className="flex-1 leading-snug">{currentQuestion.options[optKey]}</span>

                {/* Checkmark indicator */}
                {isSelected && (
                  <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Navigation (Previous - Next) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            id="prev-question-btn"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Önceki Soru</span>
          </button>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              id="next-question-btn"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              <span>Sonraki Soru</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmFinish(true)}
              id="finish-from-last-btn"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Testi Bitir</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirm Finish Modal */}
      {showConfirmFinish && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl border-2 border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
              Sınavı Bitirmek İstediğine Emin misin?
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Toplam Soru:</span>
                <strong className="text-slate-900">{totalQuestions}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cevaplanan Soru:</span>
                <strong className="text-emerald-700">{answeredCount}</strong>
              </div>
              {emptyCount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Boş Bırakılan Soru:</span>
                  <span>{emptyCount} adet soru boş!</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Geçen Süre:</span>
                <strong className="text-slate-900">{formatTimerVerbose(secondsElapsed)}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Testi bitirdiğinde sınav karnen ve tüm soruların çözümleri anında açılacaktır. Test tekrar çözülemez.
            </p>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowConfirmFinish(false)}
                id="cancel-finish-btn"
                className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Sorulara Geri Dön
              </button>
              <button
                onClick={handleConfirmFinish}
                id="confirm-finish-btn"
                className="flex-1 py-3 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Evet, Sınavı Bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
