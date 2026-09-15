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
  getActiveQuiz(): Quiz {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ);
      if (!data) {
        this.setActiveQuiz(DEFAULT_QUIZ);
        return DEFAULT_QUIZ;
      }
      const parsed = JSON.parse(data);

      // Check if existing stored quiz contains old loop artifact "(Kazanım Alıştırması" or invalid questions
      const hasCorruptedLoop = parsed?.questions?.some((q: any) =>
        typeof q?.question === 'string' && q.question.includes('Kazanım Alıştırması')
      );

      if (hasCorruptedLoop || !Array.isArray(parsed?.questions) || parsed.questions.length < 20) {
        const freshQuestions = getFallbackQuestions(
          parsed?.subjectName || 'Matematik',
          parsed?.topic || 'Doğal Sayılar ve Basamak Değeri'
        );
        const fixedQuiz: Quiz = {
          ...parsed,
          questions: freshQuestions,
        };
        this.setActiveQuiz(fixedQuiz);
        return fixedQuiz;
      }

      // Ensure active quiz is also in archive
      this.saveQuizToArchive(parsed, false);

      return parsed;
    } catch {
      return DEFAULT_QUIZ;
    }
  },

  setActiveQuiz(quiz: Quiz): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(quiz));
      this.saveQuizToArchive(quiz, false);
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));
    } catch (e) {
      console.error('Failed to save active quiz:', e);
    }
  },

  getQuizzesArchive(): Quiz[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUIZZES_ARCHIVE);
      if (!data) {
        const initial = [DEFAULT_QUIZ];
        localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = [DEFAULT_QUIZ];
        localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(initial));
        return initial;
      }

      // Sort by createdAt descending (newest first)
      return parsed.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } catch {
      return [DEFAULT_QUIZ];
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
    } catch (e) {
      console.error('Failed to save quiz to archive:', e);
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
      let archive = this.getQuizzesArchive().filter((q) => q.id !== quizId);
      if (archive.length === 0) {
        archive = [DEFAULT_QUIZ];
      }
      localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(archive));
      this.clearQuizResults(quizId);

      // If deleted quiz was active quiz, switch active to the first remaining quiz
      const currentActive = this.getActiveQuiz();
      if (currentActive.id === quizId) {
        this.setActiveQuiz(archive[0]);
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
