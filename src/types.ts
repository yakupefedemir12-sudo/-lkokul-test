export type SubjectId = 'matematik' | 'turkce' | 'fen_bilimleri' | 'sosyal_bilgiler';

export interface SubjectInfo {
  id: SubjectId;
  name: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  topics: string[];
}

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId: SubjectId;
  subjectName: string;
  topic: string;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface Student {
  id: string;
  no: number;
  name: string;
}

export interface StudentAnswer {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
}

export interface ExamResult {
  id: string;
  quizId: string;
  studentId: string;
  studentNo: number;
  studentName: string;
  subjectName: string;
  topic: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  score: number; // 0 - 100
  durationSeconds: number;
  formattedDuration: string; // "14 dk 22 sn"
  submittedAt: string; // ISO string
  answers: StudentAnswer[];
}

export type AppMode = 'student' | 'teacher';
