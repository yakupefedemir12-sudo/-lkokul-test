import { Quiz, Student, ExamResult } from '../types';
import { DEFAULT_STUDENTS } from '../data/defaultStudents';
import { getFallbackQuestions } from '../data/mebCurriculum';

const STORAGE_KEYS = {
  ACTIVE_QUIZ: 'meb4_active_quiz',
  STUDENTS: 'meb4_students',
  RESULTS: 'meb4_results',
  TEACHER_LOGGED_IN: 'meb4_teacher_auth',
  QUIZZES_ARCHIVE: 'meb4_quizzes_archive',
};

const DEFAULT_QUIZ: Quiz = {
  id: 'quiz-meb-4-default',
  title: 'Matematik 4. Sınıf - Doğal Sayılar ve Basamak Değeri Değerlendirme Testi',
  subjectId: 'matematik',
  subjectName: 'Matematik',
  topic: 'Doğal Sayılar ve Basamak Değeri',
  createdAt: new Date().toISOString(),
  questions: getFallbackQuestions('Matematik', 'Doğal Sayılar ve Basamak Değeri'),
};

export const Storage = {
  getActiveQuiz(): Quiz | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ);
      if (!data) {
        return null;
      }
      const parsed = JSON.parse(data);
      if (!parsed || !parsed.id || !Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  setActiveQuiz(quiz: Quiz | null): void {
    try {
      if (!quiz) {
        this.clearActiveQuiz();
        return;
      }

      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(quiz));
      this.saveQuizToArchive(quiz, false);
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));

      // Synchronize active quiz with server so other devices/students immediately see it
      fetch('/api/active-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz }),
      }).catch((err) => console.warn('Sunucu aktif sınav eşitleme uyarısı:', err));
    } catch (e) {
      console.error('Failed to save active quiz:', e);
    }
  },

  clearActiveQuiz(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ);
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));

      fetch('/api/active-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: null }),
      }).catch((err) => console.warn('Sunucu aktif sınav sıfırlama uyarısı:', err));
    } catch (e) {
      console.error('Failed to clear active quiz:', e);
    }
  },

  getQuizzesArchive(): Quiz[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUIZZES_ARCHIVE);
      if (!data) {
        // If first time loaded and never initialized
        const isSeeded = localStorage.getItem('meb4_seeded');
        if (!isSeeded) {
          localStorage.setItem('meb4_seeded', 'true');
          const initial = [DEFAULT_QUIZ];
          localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(initial));
          return initial;
        }
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Sort by createdAt descending (newest first)
      return parsed.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  },

  saveQuizToArchive(quiz: Quiz, emitEvent: boolean = true): void {
    try {
      const archive = this.getQuizzesArchive();
      const existingIndex = archive.findIndex((q) => q.id === quiz.id);
      if (existingIndex >= 0) {
        archive[existingIndex] = quiz;
      } else {
        archive.unshift(quiz);
      }
      localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(archive));
      if (emitEvent) {
        window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.QUIZZES_ARCHIVE } }));
      }

      // Synchronize quiz with server archive
      fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz }),
      }).catch((err) => console.warn('Sunucu arşiv eşitleme uyarısı:', err));
    } catch (e) {
      console.error('Failed to save quiz to archive:', e);
    }
  },

  getQuizById(quizId: string): Quiz | null {
    if (!quizId) return null;
    const all = this.getAllQuizzes();
    return all.find((q) => q.id === quizId) || null;
  },

  // Fetch active quiz from server (for cross-device / student direct links)
  async fetchServerActiveQuiz(): Promise<Quiz | null> {
    try {
      const res = await fetch('/api/active-quiz');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success) {
        if (!data.quiz) {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ);
          window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));
          return null;
        }
        if (Array.isArray(data.quiz.questions) && data.quiz.questions.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(data.quiz));
          this.saveQuizToArchive(data.quiz, false);
          window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));
          return data.quiz;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  // Fetch quiz by specific ID from server (for student ?quizId= links)
  async fetchServerQuizById(quizId: string): Promise<Quiz | null> {
    if (!quizId) return null;
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.quiz && Array.isArray(data.quiz.questions) && data.quiz.questions.length > 0) {
        this.saveQuizToArchive(data.quiz, true);
        return data.quiz;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Fetch results from server
  async fetchServerResults(): Promise<ExamResult[] | null> {
    try {
      const res = await fetch('/api/results');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const local = this.getResults();
        const map = new Map<string, ExamResult>();
        local.forEach((r) => map.set(`${r.quizId}_${r.studentId}`, r));
        data.results.forEach((r: ExamResult) => map.set(`${r.quizId}_${r.studentId}`, r));
        const merged = Array.from(map.values());
        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.RESULTS } }));
        return merged;
      }
      return null;
    } catch {
      return null;
    }
  },

  getAllQuizzes(): Quiz[] {
    const archive = this.getQuizzesArchive();
    const active = this.getActiveQuiz();
    const map = new Map<string, Quiz>();
    if (active) map.set(active.id, active);
    archive.forEach((q) => map.set(q.id, q));
    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  },

  deleteQuiz(quizId: string): void {
    try {
      const archive = this.getQuizzesArchive().filter((q) => q.id !== quizId);
      localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(archive));
      this.clearQuizResults(quizId);

      // Also notify server archive
      fetch(`/api/quizzes/${encodeURIComponent(quizId)}`, { method: 'DELETE' })
        .catch((err) => console.warn('Server delete quiz error:', err));

      // If deleted quiz was active quiz, clear active quiz to null!
      const currentActive = this.getActiveQuiz();
      if (currentActive && currentActive.id === quizId) {
        this.clearActiveQuiz();
      } else {
        window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.QUIZZES_ARCHIVE } }));
      }
    } catch (e) {
      console.error('Failed to delete quiz:', e);
    }
  },

  getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) {
        this.setStudents(DEFAULT_STUDENTS);
        return DEFAULT_STUDENTS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.setStudents(DEFAULT_STUDENTS);
        return DEFAULT_STUDENTS;
      }
      return parsed;
    } catch {
      return DEFAULT_STUDENTS;
    }
  },

  setStudents(students: Student[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.STUDENTS } }));
    } catch (e) {
      console.error('Failed to save students:', e);
    }
  },

  getResults(quizId?: string): ExamResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      const all: ExamResult[] = data ? JSON.parse(data) : [];
      if (quizId) {
        return all.filter((r) => r.quizId === quizId);
      }
      return all;
    } catch {
      return [];
    }
  },

  saveResult(result: ExamResult): void {
    try {
      const all = this.getResults();
      // If student already submitted this quiz, replace or ignore
      const existingIndex = all.findIndex((r) => r.quizId === result.quizId && r.studentId === result.studentId);
      if (existingIndex >= 0) {
        all[existingIndex] = result;
      } else {
        all.push(result);
      }
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.RESULTS } }));

      // Synchronize result with server
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      }).catch((err) => console.warn('Sunucu sonuç eşitleme hatası:', err));
    } catch (e) {
      console.error('Failed to save exam result:', e);
    }
  },

  clearQuizResults(quizId: string): void {
    try {
      const all = this.getResults();
      const filtered = all.filter((r) => r.quizId !== quizId);
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.RESULTS } }));

      // Synchronize clear with server
      fetch(`/api/results/${encodeURIComponent(quizId)}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Sunucu sonuç silme hatası:', err));
    } catch (e) {
      console.error('Failed to clear quiz results:', e);
    }
  },

  isTeacherLoggedIn(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.TEACHER_LOGGED_IN) === 'true';
  },

  setTeacherLoggedIn(val: boolean): void {
    if (val) {
      sessionStorage.setItem(STORAGE_KEYS.TEACHER_LOGGED_IN, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.TEACHER_LOGGED_IN);
    }
  },

  resetStudentsToDefault(): Student[] {
    this.setStudents(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
  },

  resetAllToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ);
    localStorage.removeItem(STORAGE_KEYS.QUIZZES_ARCHIVE);
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    this.setActiveQuiz(DEFAULT_QUIZ);
    this.setStudents(DEFAULT_STUDENTS);
    window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: 'all' } }));
  },
};
