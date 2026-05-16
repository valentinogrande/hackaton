import { NextResponse } from "next/server";

// POST /api/gemini/generate
// Body: { sessionId: string, materialId: string, mode: study_mode, count?: number }
// Returns: { questions: GeneratedQuestion[] }
//
// TODO(back): Wire to lib/gemini.ts. Use createClient() to verify the caller
// owns the session, then call generateQuestions(), insert into `questions`,
// return them.
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "TODO: /api/gemini/generate not implemented" },
    { status: 501 }
  );
}
