export type QuizItem = {
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hash: string;
};

export type FlashcardItem = {
  type: "flashcard";
  front: string;
  back: string;
  hash: string;
};

export type ClozeItem = {
  type: "cloze";
  sentence: string;
  answer: string;
  options: string[];
  correctIndex: number;
  hash: string;
};

export type TrueFalseItem = {
  type: "trueFalse";
  statement: string;
  isTrue: boolean;
  explanation: string;
  hash: string;
};

export type SessionItem = QuizItem | FlashcardItem | ClozeItem | TrueFalseItem;

export const POINTS_MAP: Record<SessionItem["type"], number> = {
  quiz: 5,
  cloze: 7,
  trueFalse: 4,
  flashcard: 3,
};
