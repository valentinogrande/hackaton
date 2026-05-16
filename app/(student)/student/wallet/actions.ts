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
  const destinationType = String(formData.get("destination_type") ?? "cbu");

  if (amount <= 0) return { error: "Monto inválido" };
  if (!["cbu", "alias"].includes(destinationType)) {
    return { error: "Destino inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("bank_cbu, bank_alias")
    .eq("id", user.id)
    .single();

  const destinationValue =
    destinationType === "cbu" ? profile?.bank_cbu : profile?.bank_alias;
  if (!destinationValue) {
    return {
      error:
        destinationType === "cbu"
          ? "Cargá tu CBU primero en datos bancarios"
          : "Cargá tu alias primero en datos bancarios",
    };
  }

  const { error } = await supabase.from("withdrawals").insert({
    student_id: user.id,
    amount,
    destination: { type: destinationType, value: destinationValue },
  });
  if (error) return { error: error.message };

  revalidatePath("/student/wallet");
  return { ok: true as const };
}
