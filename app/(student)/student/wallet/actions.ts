"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestWithdrawal(formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  const destinationType = String(formData.get("destination_type") ?? "alias");
  const destinationValue = String(formData.get("destination_value") ?? "").trim();

  if (amount <= 0) return { error: "Monto inválido" };
  if (!destinationValue) return { error: "Falta destino" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // TODO(tokens): validate user can withdraw this amount (i.e. amount <= current period payout
  // estimate minus already-requested withdrawals). For now we just record the request.

  const { error } = await supabase.from("withdrawals").insert({
    student_id: user.id,
    amount,
    destination: { type: destinationType, value: destinationValue },
  });
  if (error) return { error: error.message };

  revalidatePath("/student/wallet");
  return { ok: true as const };
}
