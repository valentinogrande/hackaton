"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadMaterial(formData: FormData) {
  // TODO(back): upload PDF to Storage bucket "materials", extract text via Gemini,
  // then insert row in `materials`.
  const subjectId = String(formData.get("subject_id") ?? "");
  const title = String(formData.get("title") ?? "");
  const file = formData.get("file") as File | null;

  if (!subjectId || !title || !file) return { error: "Faltan datos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const path = `${subjectId}/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("materials")
    .upload(path, file);
  if (upErr) return { error: upErr.message };

  const { error: insErr } = await supabase.from("materials").insert({
    subject_id: subjectId,
    title,
    pdf_path: path,
    uploaded_by: user.id,
    // TODO(back): set extracted_text by calling lib/gemini.ts extractTextFromPdf
  });
  if (insErr) return { error: insErr.message };

  revalidatePath("/teacher/materials");
  return { ok: true as const };
}

export async function deleteMaterial(id: string) {
  // TODO(back): also remove the PDF from Storage.
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/materials");
  return { ok: true as const };
}
