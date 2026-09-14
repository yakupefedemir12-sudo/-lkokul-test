import { Quiz, Student, ExamResult } from '../types';
import { DEFAULT_STUDENTS } from '../data/defaultStudents';
import { getFallbackQuestions } from '../data/mebCurriculum';

const STORAGE_KEYS = {
  ACTIVE_QUIZ: 'meb4_active_quiz',
  STUDENTS: 'meb4_students',
  RESULTS: 'meb4_results',
  TEACHER_LOGGED_IN: 'meb4_teacher_auth',
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

      return parsed;
    } catch {
      return DEFAULT_QUIZ;
    }
  },

  setActiveQuiz(quiz: Quiz): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(quiz));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.ACTIVE_QUIZ } }));
    } catch (e) {
      console.error('Failed to save active quiz:', e);
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
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    this.setActiveQuiz(DEFAULT_QUIZ);
    this.setStudents(DEFAULT_STUDENTS);
    window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: 'all' } }));
  },
};
