import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { buildQuizPrompt } from "./prompts";

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

const responseSchema = {
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

function isServiceUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|UNAVAILABLE|high demand|try again later|overloaded/i.test(msg);
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg);
}

export async function generateQuizFromPdf(args: {
  pdfBytes: Uint8Array;
  count: number;
}): Promise<QuizQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY en el entorno");

  const ai = new GoogleGenAI({ apiKey: key });
  const base64 = Buffer.from(args.pdfBytes).toString("base64");
  const prompt = buildQuizPrompt(args.count);

  let text: string;
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
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

  const validated = QuizSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("La respuesta de Gemini no cumple el esquema");
  }
  return validated.data.questions;
}
