import { createClient } from "@/lib/supabase/server";

export async function listMaterialsForSubject(subjectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, pdf_path, created_at, uploaded_by")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMaterialsForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select(
      "id, title, pdf_path, created_at, subject_id, subjects(name, courses(name))"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  void studentId;
  return data ?? [];
}

export async function getMaterial(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
