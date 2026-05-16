"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("year") ?? 0);
  if (!name || !year) return { error: "Faltan datos" };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({ name, year });
  if (error) return { error: error.message };

  revalidatePath("/admin/courses");
  return { ok: true as const };
}

export async function deleteCourse(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/courses");
  return { ok: true as const };
}
