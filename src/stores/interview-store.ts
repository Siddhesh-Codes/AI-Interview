import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InterviewPhase =
  | 'loading'
  | 'welcome'
  | 'mic-check'
  | 'in-progress'
  | 'uploading'
  | 'completed'
  | 'terminated';

interface InterviewQuestion {
  id: string;
  question_text: string;
  category: string;
  difficulty: string;
  time_limit_seconds: number;
  order_index: number;
}

interface InterviewAnswer {
  question_id: string;
  audio_blob: Blob | null;
  duration_seconds: number;
  uploaded: boolean;
  score?: number;
}

interface InterviewState {
  // Session
  sessionId: string | null;
  token: string | null;
  candidateName: string;
  jobRoleTitle: string;
  orgName: string;

  // Phase
  phase: InterviewPhase;

  // Questions
  questions: InterviewQuestion[];
  currentQuestionIndex: number;

  // Answers
  answers: Map<string, InterviewAnswer>;

  // Anti-cheat
  violations: number;
  maxViolations: number;

  // Results
  overallScore: number | null;
  recommendation: string | null;

  // Actions
  setSession: (data: {
    sessionId: string;
    token: string;
    candidateName: string;
    jobRoleTitle: string;
    orgName: string;
    questions: InterviewQuestion[];
    maxViolations: number;
  }) => void;
  setPhase: (phase: InterviewPhase) => void;
  nextQuestion: () => void;
  saveAnswer: (questionId: string, answer: Partial<InterviewAnswer>) => void;
  markAnswerUploaded: (questionId: string, score?: number) => void;
  addViolation: () => void;
  setResults: (score: number, recommendation: string) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  token: null,
  candidateName: '',
  jobRoleTitle: '',
  orgName: '',
  phase: 'loading' as InterviewPhase,
  questions: [],
  currentQuestionIndex: 0,
  answers: new Map<string, InterviewAnswer>(),
  violations: 0,
  maxViolations: 3,
  overallScore: null,
  recommendation: null,
};

export const useInterviewStore = create<InterviewState>()((set, get) => ({
  ...initialState,

  setSession: (data) =>
    set({
      sessionId: data.sessionId,
      token: data.token,
      candidateName: data.candidateName,
      jobRoleTitle: data.jobRoleTitle,
      orgName: data.orgName,
      questions: data.questions,
      maxViolations: data.maxViolations,
      phase: 'welcome',
    }),

  setPhase: (phase) => set({ phase }),

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  saveAnswer: (questionId, answer) => {
    const answers = new Map(get().answers);
    const existing = answers.get(questionId) || {
      question_id: questionId,
      audio_blob: null,
      duration_seconds: 0,
      uploaded: false,
    };
    answers.set(questionId, { ...existing, ...answer });
    set({ answers });
  },

  markAnswerUploaded: (questionId, score) => {
    const answers = new Map(get().answers);
    const existing = answers.get(questionId);
    if (existing) {
      answers.set(questionId, { ...existing, uploaded: true, score });
    }
    set({ answers });
  },

  addViolation: () => {
    const { violations, maxViolations } = get();
    const next = violations + 1;
    set({ violations: next });
    if (next >= maxViolations) {
      set({ phase: 'terminated' });
    }
  },

  setResults: (score, recommendation) =>
    set({ overallScore: score, recommendation, phase: 'completed' }),

  reset: () => set(initialState),
}));
