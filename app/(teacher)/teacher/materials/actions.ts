"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadMaterial(formData: FormData) {
  const subjectId = String(formData.get("subject_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!subjectId || !title || !file || file.size === 0) {
    return { error: "Faltan datos" };
  }
  if (file.type && file.type !== "application/pdf") {
    return { error: "Solo se aceptan PDFs" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${subjectId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("materials")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) return { error: upErr.message };

  const { error: insErr } = await supabase.from("materials").insert({
    subject_id: subjectId,
    title,
    pdf_path: path,
    uploaded_by: user.id,
    // TODO(back): extracted_text via lib/gemini.ts extractTextFromPdf
  });
  if (insErr) {
    // Roll back the storage upload to keep things tidy.
    await supabase.storage.from("materials").remove([path]);
    return { error: insErr.message };
  }

  revalidatePath("/teacher/materials");
  return { ok: true as const };
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("materials")
    .select("pdf_path")
    .eq("id", id)
    .single();

  if (m?.pdf_path) {
    await supabase.storage.from("materials").remove([m.pdf_path]);
  }
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/teacher/materials");
  return { ok: true as const };
}

export async function getMaterialSignedUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
