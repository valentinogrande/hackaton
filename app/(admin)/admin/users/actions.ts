"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["user_role"];

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Solo admin");
}

export async function updateUserRole(userId: string, role: Role) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function createUser(formData: FormData) {
  await assertAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "student") as Role;

  if (!email || !password || !fullName) return { error: "Faltan datos" };
  if (password.length < 4) return { error: "La contraseña debe tener al menos 4 caracteres" };
  if (!["admin", "teacher", "student"].includes(role)) {
    return { error: "Rol inválido" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true as const };
}
