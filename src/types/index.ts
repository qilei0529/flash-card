export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Deck {
  id: string;
  name: string;
  createdAt: string; // ISO string
  updatedAt: string;
  deletedAt?: string | null;
  cardsPerSession?: number; // Default: 30, number of cards to show per session
  language?: string; // Language for TTS (e.g., "French", "English", "German")
}

export type CardType = 'word' | 'sentence';

export interface WordCardData {
  word: string; // 单词
  translation: string; // 翻译
  pronunciation?: string; // 音标 / 发音
  partOfSpeech?: string; // 词性 (noun, verb, adj 等)
  definition?: string; // 详细释义
  exampleSentence?: string; // 例句
  level?: CefrLevel; // 难度等级（A1-C2，可选）
}

export interface SentenceCardData {
  sentence: string; // 句子
  translation: string; // 翻译
}

export interface Card {
  id: string;
  deckId: string;
  type: CardType; // 卡片类型
  data: WordCardData | SentenceCardData; // 卡片数据
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // FSRS state (aligned with ts-fsrs Card)
  due: string; // ISO string
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number; // State enum: New=0, Learning=1, Review=2, Relearning=3
  lastReview?: string | null; // ISO string
  // Legacy fields for migration compatibility (will be removed after migration)
  front?: string;
  back?: string;
}

export interface ReviewRecord {
  id: string;
  cardId: string;
  rating: number; // Rating enum: 1=Again, 2=Hard, 3=Good, 4=Easy
  reviewedAt: string; // ISO string
  scheduledDays: number;
}

export type SessionMode = "learning" | "test";

export interface Session {
  id: string;
  deckId: string;
  mode: SessionMode;
  cardIds: string[]; // Array of card IDs selected for this session
  createdAt: string; // ISO string
  completedAt: string | null; // ISO string, null if session is incomplete
  totalCards: number;
  completedCards: number; // Number of cards reviewed in this session
}
