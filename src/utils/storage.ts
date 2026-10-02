import { Quiz, Student, ExamResult } from '../types';
import { DEFAULT_STUDENTS } from '../data/defaultStudents';

const STORAGE_KEYS = {
  ACTIVE_QUIZ: 'meb4_active_quiz',
  STUDENTS: 'meb4_students',
  RESULTS: 'meb4_results',
  TEACHER_LOGGED_IN: 'meb4_teacher_auth',
  QUIZZES_ARCHIVE: 'meb4_quizzes_archive',
  STUDENT_NOTES: 'meb4_student_notes',
};

export const Storage = {
  // ========================================================
  // 1. SUNUCU SENKRONİZASYONU & OTOMATİK KURTARMA (AUTO-REHYDRATION)
  // ========================================================
  async syncWithServer(): Promise<{
    activeQuiz: Quiz | null;
    archiveQuizzes: Quiz[];
    students: Student[];
    results: ExamResult[];
    studentNotes: Record<string, { studentId: string; note: string; updatedAt: string }>;
  } | null> {
    try {
      // 1. Yerel hafızadaki sahte / seed verileri filtrele
      const localActive = this.getActiveQuiz();
      const localArchive = this.getQuizzesArchive();
      const localResults = this.getResults();
      const localStudents = this.getStudents();
      const localNotes = this.getStudentNotes();

      const res = await fetch('/api/sync');
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success) return null;

      const serverQuizzes: Quiz[] = Array.isArray(data.archiveQuizzes)
        ? data.archiveQuizzes.filter((q: Quiz) => q && q.id && q.id !== 'quiz-meb-4-default')
        : [];
      const serverActive: Quiz | null =
        data.activeQuiz && data.activeQuiz.id !== 'quiz-meb-4-default' ? data.activeQuiz : null;
      const serverResults: ExamResult[] = Array.isArray(data.results)
        ? data.results.filter((r: ExamResult) => r && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1')
        : [];

      // 2. OTOMATİK REHİDRASYON (Render deploy veya disk sıfırlanma kalkanı):
      // Eğer sunucuda 0 sınav ve 0 aktif sınav varsa, ancak öğretmenin tarayıcısında gerçek sınavlar varsa:
      if (serverQuizzes.length === 0 && !serverActive && (localArchive.length > 0 || localActive || localResults.length > 0)) {
        console.log('[Auto-Rehydration] Sunucu diski sıfırlanmış tespit edildi, yerel hafızadaki gerçek veriler sunucuya geri yükleniyor...');
        try {
          await fetch('/api/rehydrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activeQuiz: localActive,
              archiveQuizzes: localArchive,
              results: localResults,
              students: localStudents,
              studentNotes: localNotes,
            }),
          });
        } catch (rehydrateErr) {
          console.warn('[Auto-Rehydration] Sunucuya otomatik kurtarma uyarısı:', rehydrateErr);
        }

        return {
          activeQuiz: localActive,
          archiveQuizzes: localArchive,
          students: localStudents,
          results: localResults,
          studentNotes: localNotes,
        };
      }

      // 3. Akıllı Birleştirme (ID Union): Hem sunucu hem tarayıcı verileri birleştirilir, hiçbir sınav veya karne kaybolmaz
      const quizMap = new Map<string, Quiz>();
      serverQuizzes.forEach((q) => quizMap.set(q.id, q));
      localArchive.forEach((q) => {
        if (!quizMap.has(q.id)) quizMap.set(q.id, q);
      });
      const mergedQuizzes = Array.from(quizMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      const resultMap = new Map<string, ExamResult>();
      serverResults.forEach((r) => resultMap.set(`${r.quizId}_${r.studentId}`, r));
      localResults.forEach((r) => {
        const key = `${r.quizId}_${r.studentId}`;
        if (!resultMap.has(key)) resultMap.set(key, r);
      });
      const mergedResults = Array.from(resultMap.values());

      const mergedNotes = { ...localNotes, ...(data.studentNotes || {}) };
      const effectiveActiveQuiz = serverActive || (localActive && quizMap.has(localActive.id) ? localActive : null);

      // LocalStorage Master Backup güncelle
      if (effectiveActiveQuiz) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(effectiveActiveQuiz));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ);
      }
      localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(mergedQuizzes));
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(mergedResults));
      if (Array.isArray(data.students) && data.students.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
      }
      localStorage.setItem(STORAGE_KEYS.STUDENT_NOTES, JSON.stringify(mergedNotes));

      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: 'all' } }));

      return {
        activeQuiz: effectiveActiveQuiz,
        archiveQuizzes: mergedQuizzes,
        students: (Array.isArray(data.students) && data.students.length > 0) ? data.students : DEFAULT_STUDENTS,
        results: mergedResults,
        studentNotes: mergedNotes,
      };
    } catch (err) {
      console.warn('Sunucu senkronizasyon uyarısı:', err);
      return null;
    }
  },

  getActiveQuiz(): Quiz | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ);
      if (!data) {
        return null;
      }
      const parsed = JSON.parse(data);
      if (!parsed || !parsed.id || parsed.id === 'quiz-meb-4-default' || !Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
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

      // Synchronize active quiz with server so all devices (mobile, student, tablet) immediately update
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
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Sahte veya mock sınavları tamamen temizle
      const cleaned = parsed.filter((q) => q && q.id && q.id !== 'quiz-meb-4-default');

      // Sort by createdAt descending (newest first)
      return cleaned.sort((a, b) => {
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
      if (!quiz || !quiz.id || quiz.id === 'quiz-meb-4-default') return;
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
    if (!quizId || quizId === 'quiz-meb-4-default') return null;
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
        if (!data.quiz || data.quiz.id === 'quiz-meb-4-default') {
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
    if (!quizId || quizId === 'quiz-meb-4-default') return null;
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
        local.forEach((r) => {
          if (r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1') {
            map.set(`${r.quizId}_${r.studentId}`, r);
          }
        });
        data.results.forEach((r: ExamResult) => {
          if (r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1') {
            map.set(`${r.quizId}_${r.studentId}`, r);
          }
        });
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
    if (active && active.id !== 'quiz-meb-4-default') map.set(active.id, active);
    archive.forEach((q) => {
      if (q && q.id && q.id !== 'quiz-meb-4-default') map.set(q.id, q);
    });
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

      // Sync with server
      fetch('/api/update-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      }).catch((err) => console.warn('Sunucu öğrenci eşitleme hatası:', err));
    } catch (e) {
      console.error('Failed to save students:', e);
    }
  },

  getResults(quizId?: string): ExamResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      const all: ExamResult[] = data ? JSON.parse(data) : [];
      const cleaned = all.filter((r) => r && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1');
      if (quizId) {
        return cleaned.filter((r) => r.quizId === quizId);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveResult(result: ExamResult): void {
    try {
      if (!result || result.quizId === 'quiz-meb-4-default' || result.id === 'res-test-1') return;
      const all = this.getResults();
      const existingIndex = all.findIndex((r) => r.quizId === result.quizId && r.studentId === result.studentId);
      if (existingIndex >= 0) {
        all[existingIndex] = result;
      } else {
        all.push(result);
      }
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.RESULTS } }));

      // Synchronize result with server (both submit-exam and results endpoints for reliability)
      fetch('/api/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      }).catch((err) => console.warn('Sunucu /submit-exam eşitleme hatası:', err));
    } catch (e) {
      console.error('Failed to save exam result:', e);
    }
  },

  // Alias for saveResult
  submitExam(result: ExamResult): void {
    this.saveResult(result);
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

  // ========================================================
  // ÖĞRETMEN ÖĞRENCİ GÖZLEM NOTLARI
  // ========================================================
  getStudentNotes(): Record<string, { studentId: string; note: string; updatedAt: string }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENT_NOTES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getStudentNote(studentId: string): string {
    const notes = this.getStudentNotes();
    return notes[studentId]?.note || '';
  },

  async saveStudentNote(studentId: string, note: string): Promise<void> {
    try {
      const notes = this.getStudentNotes();
      notes[studentId] = {
        studentId,
        note: note.trim(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.STUDENT_NOTES, JSON.stringify(notes));
      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: STORAGE_KEYS.STUDENT_NOTES } }));

      // Sync with server
      await fetch('/api/student-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, note }),
      });
    } catch (e) {
      console.error('Failed to save student note:', e);
    }
  },

  // ========================================================
  // 3. JSON YEDEKLEME VE GERİ YÜKLEME (OFFLINE MASTER BACKUP)
  // ========================================================
  exportBackupJson(): string {
    const backupData = {
      app: 'MEB 4. Sınıf Test ve Sınav Portalı',
      school: 'Tokat Erbaa Atatürk İlkokulu',
      gradeClass: '4-D',
      exportDate: new Date().toISOString(),
      activeQuiz: this.getActiveQuiz(),
      archiveQuizzes: this.getQuizzesArchive(),
      results: this.getResults(),
      students: this.getStudents(),
      studentNotes: this.getStudentNotes(),
    };
    return JSON.stringify(backupData, null, 2);
  },

  async importBackupJson(jsonString: string): Promise<{
    success: boolean;
    quizCount: number;
    resultCount: number;
    error?: string;
  }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, quizCount: 0, resultCount: 0, error: 'Geçersiz yedek dosyası formatı.' };
      }

      const rawQuizzes: Quiz[] = Array.isArray(parsed.archiveQuizzes)
        ? parsed.archiveQuizzes
        : Array.isArray(parsed.quizzes)
        ? parsed.quizzes
        : [];

      const rawResults: ExamResult[] = Array.isArray(parsed.results) ? parsed.results : [];
      const rawStudents: Student[] = Array.isArray(parsed.students) && parsed.students.length > 0 ? parsed.students : DEFAULT_STUDENTS;
      const rawNotes = parsed.studentNotes && typeof parsed.studentNotes === 'object' ? parsed.studentNotes : {};
      const rawActiveQuiz = parsed.activeQuiz && parsed.activeQuiz.id ? parsed.activeQuiz : null;

      // Sahte verileri filtrele
      const cleanedQuizzes = rawQuizzes.filter((q) => q && q.id && q.id !== 'quiz-meb-4-default');
      const cleanedResults = rawResults.filter((r) => r && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1');
      const cleanedActive = rawActiveQuiz && rawActiveQuiz.id !== 'quiz-meb-4-default' ? rawActiveQuiz : null;

      // 1. Tarayıcıya kaydet
      if (cleanedActive) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(cleanedActive));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ);
      }
      localStorage.setItem(STORAGE_KEYS.QUIZZES_ARCHIVE, JSON.stringify(cleanedQuizzes));
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(cleanedResults));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(rawStudents));
      localStorage.setItem(STORAGE_KEYS.STUDENT_NOTES, JSON.stringify(rawNotes));

      window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: 'all' } }));

      // 2. Sunucuya rehydrate ile anında bas
      await fetch('/api/rehydrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeQuiz: cleanedActive,
          archiveQuizzes: cleanedQuizzes,
          results: cleanedResults,
          students: rawStudents,
          studentNotes: rawNotes,
        }),
      });

      return {
        success: true,
        quizCount: cleanedQuizzes.length,
        resultCount: cleanedResults.length,
      };
    } catch (err: any) {
      return {
        success: false,
        quizCount: 0,
        resultCount: 0,
        error: err?.message || 'Yedek dosyası işlenirken hata oluştu.',
      };
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
    localStorage.removeItem(STORAGE_KEYS.STUDENT_NOTES);
    localStorage.removeItem('meb4_seeded');
    this.setStudents(DEFAULT_STUDENTS);
    window.dispatchEvent(new CustomEvent('meb-storage-updated', { detail: { key: 'all' } }));

    // Reset server data
    fetch('/api/reset-data', { method: 'POST' }).catch(() => {});
  },
};
