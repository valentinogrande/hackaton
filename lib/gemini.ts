import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import crypto from "crypto";
import {
  buildQuizPrompt,
  buildFlashcardsPrompt,
  buildClozePrompt,
  buildTrueFalsePrompt,
  buildMixedPrompt,
} from "./prompts";
import type { SessionItem } from "./study-types";

// ============================================================
// Schemas (zod for runtime validation + Gemini responseSchema)
// ============================================================

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});
export const QuizSchema = z.object({ questions: z.array(QuizQuestionSchema).min(1) });

export const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});
export const FlashcardsSchema = z.object({ cards: z.array(FlashcardSchema).min(1) });

export const ClozeItemSchema = z.object({
  sentence: z.string().min(1),
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});
export const ClozeSchema = z.object({ items: z.array(ClozeItemSchema).min(1) });

export const TrueFalseItemSchema = z.object({
  statement: z.string().min(1),
  isTrue: z.boolean(),
  explanation: z.string().min(1),
});
export const TrueFalseSchema = z.object({ items: z.array(TrueFalseItemSchema).min(1) });

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type ClozeItem = z.infer<typeof ClozeItemSchema>;
export type TrueFalseItem = z.infer<typeof TrueFalseItemSchema>;

// ============================================================
// Gemini responseSchema shapes (constrained JSON output)
// ============================================================

const quizResponseSchema = {
  type: Type.OBJECT,
  required: ["questions"],
  properties: {
    questions: {
      type: Type.ARRAY,
      minItems: 1,
      items: {
        type: Type.OBJECT,
        required: ["question", "options", "correctIndex", "explanation"],
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            minItems: 4,
            maxItems: 4,
            items: { type: Type.STRING },
          },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
      },
    },
  },
};

const flashcardsResponseSchema = {
  type: Type.OBJECT,
  required: ["cards"],
  properties: {
    cards: {
      type: Type.ARRAY,
      minItems: 1,
      items: {
        type: Type.OBJECT,
        required: ["front", "back"],
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
        },
      },
    },
  },
};

const clozeResponseSchema = {
  type: Type.OBJECT,
  required: ["items"],
  properties: {
    items: {
      type: Type.ARRAY,
      minItems: 1,
      items: {
        type: Type.OBJECT,
        required: ["sentence", "answer", "options", "correctIndex"],
        properties: {
          sentence: { type: Type.STRING },
          answer: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            minItems: 4,
            maxItems: 4,
            items: { type: Type.STRING },
          },
          correctIndex: { type: Type.INTEGER },
        },
      },
    },
  },
};

const trueFalseResponseSchema = {
  type: Type.OBJECT,
  required: ["items"],
  properties: {
    items: {
      type: Type.ARRAY,
      minItems: 1,
      items: {
        type: Type.OBJECT,
        required: ["statement", "isTrue", "explanation"],
        properties: {
          statement: { type: Type.STRING },
          isTrue: { type: Type.BOOLEAN },
          explanation: { type: Type.STRING },
        },
      },
    },
  },
};

// ============================================================
// Error helpers
// ============================================================

function isServiceUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|UNAVAILABLE|high demand|try again later|overloaded/i.test(msg);
}
function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg);
}

// ============================================================
// Core Gemini call (PDF inline + schema-constrained JSON)
// ============================================================

async function callGeminiPdf<T>(args: {
  pdfBytes: Uint8Array;
  prompt: string;
  responseSchema: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY en el entorno");

  const ai = new GoogleGenAI({ apiKey: key });
  const base64 = Buffer.from(args.pdfBytes).toString("base64");

  let text: string;
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            { text: args.prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: args.responseSchema,
        temperature: args.temperature ?? 0.7,
        maxOutputTokens: 16000,
      },
    });
    text = result.text ?? "";
  } catch (err) {
    if (isServiceUnavailable(err)) {
      throw new Error("Gemini está saturado. Reintentá en 15-30 segundos.");
    }
    if (isRateLimit(err)) {
      throw new Error("Se alcanzó el límite de uso de Gemini. Probá más tarde.");
    }
    throw err;
  }

  if (!text) throw new Error("Gemini devolvió respuesta vacía");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini devolvió un JSON inválido");
  }

  const validated = args.zodSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("La respuesta de Gemini no cumple el esquema");
  }
  return validated.data;
}

// ============================================================
// Public API: one generator per mode
// ============================================================

export async function generateQuizFromPdf(args: {
  pdfBytes: Uint8Array;
  count: number;
}): Promise<QuizQuestion[]> {
  const { questions } = await callGeminiPdf({
    pdfBytes: args.pdfBytes,
    prompt: buildQuizPrompt(args.count),
    responseSchema: quizResponseSchema,
    zodSchema: QuizSchema,
  });
  return questions;
}

export async function generateFlashcardsFromPdf(args: {
  pdfBytes: Uint8Array;
  count: number;
}): Promise<Flashcard[]> {
  const { cards } = await callGeminiPdf({
    pdfBytes: args.pdfBytes,
    prompt: buildFlashcardsPrompt(args.count),
    responseSchema: flashcardsResponseSchema,
    zodSchema: FlashcardsSchema,
    temperature: 0.6,
  });
  return cards;
}

export async function generateClozeFromPdf(args: {
  pdfBytes: Uint8Array;
  count: number;
}): Promise<ClozeItem[]> {
  const { items } = await callGeminiPdf({
    pdfBytes: args.pdfBytes,
    prompt: buildClozePrompt(args.count),
    responseSchema: clozeResponseSchema,
    zodSchema: ClozeSchema,
  });
  // Sanity filter: drop items where the answer doesn't match options[correctIndex].
  return items.filter((it) => it.options[it.correctIndex] === it.answer);
}

export async function generateTrueFalseFromPdf(args: {
  pdfBytes: Uint8Array;
  count: number;
}): Promise<TrueFalseItem[]> {
  const { items } = await callGeminiPdf({
    pdfBytes: args.pdfBytes,
    prompt: buildTrueFalsePrompt(args.count),
    responseSchema: trueFalseResponseSchema,
    zodSchema: TrueFalseSchema,
  });
  return items;
}

// ============================================================
// Text extraction + mixed generation
// ============================================================

export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const buffer = Buffer.from(pdfBytes);
  const data = await pdfParse(buffer);
  return (data.text as string).trim();
}

function hashItem(type: string, key: string): string {
  return crypto.createHash("sha256").update(`${type}:${key}`).digest("hex").slice(0, 16);
}

function shuffleOptions<T extends { options: string[]; correctIndex: number }>(item: T): T {
  const opts = [...item.options];
  const correct = opts[item.correctIndex];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...item, options: opts, correctIndex: opts.indexOf(correct) };
}

const MixedResponseSchema = z.object({
  quiz: z.array(QuizQuestionSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(1),
  cloze: z.array(ClozeItemSchema).min(1),
  trueFalse: z.array(TrueFalseItemSchema).min(1),
});

const mixedResponseSchema = {
  type: Type.OBJECT,
  required: ["quiz", "flashcards", "cloze", "trueFalse"],
  properties: {
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["question", "options", "correctIndex", "explanation"],
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, minItems: 4, maxItems: 4, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
      },
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["front", "back"],
        properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
      },
    },
    cloze: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["sentence", "answer", "options", "correctIndex"],
        properties: {
          sentence: { type: Type.STRING },
          answer: { type: Type.STRING },
          options: { type: Type.ARRAY, minItems: 4, maxItems: 4, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
        },
      },
    },
    trueFalse: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["statement", "isTrue", "explanation"],
        properties: {
          statement: { type: Type.STRING },
          isTrue: { type: Type.BOOLEAN },
          explanation: { type: Type.STRING },
        },
      },
    },
  },
};

export async function generateMixedItems(text: string): Promise<SessionItem[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY en el entorno");

  const ai = new GoogleGenAI({ apiKey: key });
  let rawText: string;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: buildMixedPrompt(text) }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: mixedResponseSchema,
        temperature: 0.7,
        maxOutputTokens: 16000,
      },
    });
    rawText = result.text ?? "";
  } catch (err) {
    if (isServiceUnavailable(err)) throw new Error("Gemini está saturado. Reintentá en 15-30 segundos.");
    if (isRateLimit(err)) throw new Error("Se alcanzó el límite de uso de Gemini. Probá más tarde.");
    throw err;
  }

  if (!rawText) throw new Error("Gemini devolvió respuesta vacía");

  const parsed = MixedResponseSchema.safeParse(JSON.parse(rawText));
  if (!parsed.success) throw new Error("La respuesta de Gemini no cumple el esquema");

  const { quiz, flashcards, cloze, trueFalse } = parsed.data;

  const items: SessionItem[] = [
    ...flashcards.map((c) => ({
      type: "flashcard" as const,
      front: c.front,
      back: c.back,
      hash: hashItem("flashcard", c.front),
    })),
    ...quiz.map((q) => {
      const shuffled = shuffleOptions(q);
      return {
        type: "quiz" as const,
        question: shuffled.question,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
        explanation: shuffled.explanation,
        hash: hashItem("quiz", shuffled.question),
      };
    }),
    ...cloze.filter((c) => c.options[c.correctIndex] === c.answer).map((c) => {
      const shuffled = shuffleOptions(c);
      return {
        type: "cloze" as const,
        sentence: shuffled.sentence,
        answer: shuffled.answer,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
        hash: hashItem("cloze", shuffled.sentence),
      };
    }),
    ...trueFalse.map((t) => ({
      type: "trueFalse" as const,
      statement: t.statement,
      isTrue: t.isTrue,
      explanation: t.explanation,
      hash: hashItem("trueFalse", t.statement),
    })),
  ];

  return items;
}
