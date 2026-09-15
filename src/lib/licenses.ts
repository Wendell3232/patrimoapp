import { supabase } from "@/integrations/supabase/client";

export async function hasActiveLicense(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("licenses")
      .select("id")
      .eq("used_by", userId)
      .limit(1)
      .maybeSingle();
    if (error) return true;
    return Boolean(data);
  } catch {
    return true;
  }
}

export async function redeemLicense(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 6) {
    return { ok: false, error: "Digite o código completo que você recebeu." };
  }

  const { data, error } = await supabase.rpc("redeem_license", {
    p_code: normalized,
  });

  if (error) {
    return {
      ok: false,
      error: "Não foi possível validar o código agora. Tente novamente.",
    };
  }
  if (!data) {
    return { ok: false, error: "Código inválido ou já utilizado." };
  }
  return { ok: true };
}