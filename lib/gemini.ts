// Gemini integration. Dev BACK implements; called from server actions / route handlers.
// Get key from https://aistudio.google.com/app/apikey and put in GEMINI_API_KEY.

export type GeneratedQuestion =
  | {
      kind: "multiple_choice";
      prompt: string;
      options: string[];
      correctIndex: number;
    }
  | {
      kind: "flashcard";
      front: string;
      back: string;
    }
  | {
      kind: "fill_blank";
      sentence: string; // contains "____"
      answer: string;
    }
  | {
      kind: "open";
      prompt: string;
      expectedKeywords: string[];
    };

export async function extractTextFromPdf(_pdfBytes: ArrayBuffer): Promise<string> {
  // TODO(back): use pdf-parse or @upstash/pdf, or send to Gemini File API.
  throw new Error("TODO: extractTextFromPdf not implemented");
}

export async function generateQuestions(_args: {
  text: string;
  mode: "quiz" | "flashcards" | "fill_blank" | "open";
  count: number;
}): Promise<GeneratedQuestion[]> {
  // TODO(back): call Gemini, parse JSON, validate with zod, return.
  throw new Error("TODO: generateQuestions not implemented");
}

export async function gradeOpenAnswer(_args: {
  prompt: string;
  expectedKeywords: string[];
  response: string;
}): Promise<{ isCorrect: boolean; feedback: string }> {
  // TODO(back): Gemini grades free-text answers, returns boolean + feedback.
  throw new Error("TODO: gradeOpenAnswer not implemented");
}
