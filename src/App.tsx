import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, Quiz, Student, ExamResult } from './types';
import { Storage } from './utils/storage';
import { Header } from './components/Header';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentExamScreen } from './components/StudentExamScreen';
import { ShieldCheck, Heart, Sparkles, BookCheck } from 'lucide-react';

export default function App() {
  // Determine mode from query param ?mode=... or default to student
  const [mode, setModeState] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    return m === 'teacher' ? 'teacher' : 'student';
  });

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(() => Storage.getActiveQuiz());
  const [students, setStudents] = useState<Student[]>(() => Storage.getStudents());
  const [results, setResults] = useState<ExamResult[]>(() => Storage.getResults());
  
  // Specific quiz if URL contains ?quizId=...
  const [specificQuiz, setSpecificQuiz] = useState<Quiz | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quizId');
    if (qId) {
      return Storage.getQuizById(qId);
    }
    return null;
  });

  // Function to reload data from Storage
  const refreshData = useCallback(() => {
    setActiveQuiz(Storage.getActiveQuiz());
    setStudents(Storage.getStudents());
    setResults(Storage.getResults());

    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quizId');
    if (qId) {
      const found = Storage.getQuizById(qId);
      if (found) {
        setSpecificQuiz(found);
      }
    }
  }, []);

  // Sync with server on initial mount and when URL or storage updates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quizId');

    const syncWithServer = async () => {
      try {
        if (qId) {
          // If a specific quiz is requested by student/parent link, fetch it
          const serverQ = await Storage.fetchServerQuizById(qId);
          if (serverQ) {
            setSpecificQuiz(serverQ);
          }
        } else {
          // If no specific quizId in URL, fetch the latest active quiz from server
          const serverActive = await Storage.fetchServerActiveQuiz();
          setActiveQuiz(serverActive);
        }

        // Also sync results across devices
        await Storage.fetchServerResults();
        refreshData();
      } catch (err) {
        console.warn('Server sync error on mount:', err);
      }
    };

    syncWithServer();
  }, [refreshData]);

  // Set mode and update URL without reload
  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    if (newMode === 'student' && !url.searchParams.has('quizId')) {
      if (activeQuiz) {
        url.searchParams.set('quizId', activeQuiz.id);
      } else {
        url.searchParams.delete('quizId');
      }
    }
    window.history.pushState({}, '', url.toString());
  };

  // Sync across storage updates
  useEffect(() => {
    const handleStorageChange = () => {
      refreshData();
    };

    window.addEventListener('meb-storage-updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('meb-storage-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshData]);

  // Current quiz to render for the student
  const currentStudentQuiz = (mode === 'student' && specificQuiz) ? specificQuiz : activeQuiz;

  // Current quiz results count
  const currentQuizResults = currentStudentQuiz 
    ? results.filter((r) => r.quizId === currentStudentQuiz.id)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header with Navigation & MEB Banner */}
      <Header
        mode={mode}
        setMode={setMode}
        activeQuiz={currentStudentQuiz}
        resultsCount={currentQuizResults.length}
        totalStudents={students.length}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-4 sm:py-6">
        {mode === 'student' ? (
          <StudentExamScreen
            quiz={currentStudentQuiz}
            students={students}
            results={results}
            refreshData={refreshData}
          />
        ) : (
          <TeacherDashboard
            activeQuiz={activeQuiz}
            setActiveQuiz={setActiveQuiz}
            students={students}
            setStudents={setStudents}
            results={results}
            refreshData={refreshData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookCheck className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-700">T.C. MEB 4. Sınıf Müfredat Uyumlu İlkokul Portalı</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tek Giriş Korumalı</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gemini 3.8 Flash AI</span>
            </span>
            <span>•</span>
            <span>35 Kişilik Sınıf Takip Sistemi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
