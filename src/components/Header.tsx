import React from 'react';
import { AppMode, Quiz } from '../types';
import { BookOpen, GraduationCap, Users, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  activeQuiz: Quiz;
  resultsCount: number;
  totalStudents: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  activeQuiz,
  resultsCount,
  totalStudents,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const copyStudentLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'student');
    url.searchParams.set('quizId', activeQuiz.id);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top MEB Banner */}
      <div className="bg-linear-to-r from-red-600 via-rose-600 to-amber-600 text-white py-1.5 px-4 text-xs font-semibold">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide">
              T.C. MEB
            </span>
            <span className="hidden sm:inline">Milli Eğitim Bakanlığı 4. Sınıf Müfredatına Tam Uyumlu</span>
            <span className="sm:hidden">MEB 4. Sınıf Portalı</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-white/90">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Yapay Zekâ Destekli</span>
            </span>
            <button
              onClick={copyStudentLink}
              id="header-copy-link-btn"
              className="bg-white/15 hover:bg-white/25 transition-colors px-2 py-0.5 rounded text-[11px] flex items-center gap-1 cursor-pointer"
              title="Öğrenci Sınav Linkini Kopyala"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span className="text-emerald-200">Link Kopyalandı!</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3 h-3" />
                  <span>Öğrenci Linki</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Logo & Active Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-800 text-lg leading-tight tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                  4. Sınıf Sınav Portalı
                </h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  v4.0
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate max-w-[260px] sm:max-w-md">
                <span className="font-semibold text-slate-700">{activeQuiz.subjectName}:</span>
                <span className="truncate">{activeQuiz.topic}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600 font-semibold">{activeQuiz.questions.length} Soru</span>
              </p>
            </div>
          </div>

          {/* Quick Counter for Mobile */}
          <div className="sm:hidden flex items-center gap-1 text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{resultsCount}/{totalStudents}</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full sm:w-auto justify-center border border-slate-200/80">
          <button
            onClick={() => setMode('student')}
            id="nav-student-mode-btn"
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'student'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Öğrenci Sınavı</span>
          </button>

          <button
            onClick={() => setMode('teacher')}
            id="nav-teacher-mode-btn"
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'teacher'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Öğretmen Paneli</span>
            <span className="hidden md:inline-block bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded text-[10px]">
              {resultsCount}/{totalStudents}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
