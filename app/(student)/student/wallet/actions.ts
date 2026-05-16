"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateBankInfo(formData: FormData) {
  const cbu = String(formData.get("bank_cbu") ?? "").trim();
  const alias = String(formData.get("bank_alias") ?? "").trim();

  if (!cbu && !alias) {
    return { error: "Cargá CBU o alias" };
  }
  if (cbu && !/^\d{22}$/.test(cbu)) {
    return { error: "El CBU debe tener exactamente 22 dígitos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({
      bank_cbu: cbu || null,
      bank_alias: alias || null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/student/wallet");
  return { ok: true as const };
}

export async function requestWithdrawal(formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  const destinationValue = String(formData.get("destination_value") ?? "").trim();

  if (amount <= 0) return { error: "Monto inválido" };
  if (!destinationValue) return { error: "Falta alias o CBU" };

  const isCbu = /^\d{22}$/.test(destinationValue);
  const isAlias = /^[A-Za-z0-9.\-]{6,20}$/.test(destinationValue);
  if (!isCbu && !isAlias) {
    return { error: "Alias o CBU inválido (CBU: 22 dígitos; alias: 6–20 caracteres)" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("withdrawals").insert({
    student_id: user.id,
    amount,
    destination: { type: isCbu ? "cbu" : "alias", value: destinationValue },
  });
  if (error) return { error: error.message };

  revalidatePath("/student/wallet");
  return { ok: true as const };
}
