export interface Diagram {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  googleSearchUrl?: string;
  svg?: string;
  keyPoints: string[];
}

export interface NEBQuestion {
  question: string;
  marks: string; // e.g. "2 Marks" | "4 Marks" | "5 Marks"
  solution: string;
  keyConcepts: string[];
}

export interface CEEQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  trickNote: string;
}

export interface AssistantResponse {
  mainAnswer: string;
  isSimpleFact?: boolean;
  isQuickFire?: boolean;
  needsDiagrams?: boolean;
  simplifiedAnswer: string;
  quickSummary: string[];
  diagrams: Diagram[];
  isDiagramsLoading?: boolean;
  nebQuestions: NEBQuestion[];
  ceeQuestions: CEEQuestion[];
  followUps: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: AssistantResponse;
  timestamp: number;
  isSimplified?: boolean;
  activeTab?: 'main' | 'simplified' | 'summary' | 'diagrams' | 'exams';
  userAnswerSelections?: Record<string, number>; // ceeQuestionId -> selectedOptionIndex
}

export type SubjectCategory =
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Mathematics'
  | 'Computer Science'
  | 'General Science'
  | 'General';
