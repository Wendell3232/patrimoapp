import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const USER_TABLES = [
  "accounts",
  "credit_cards",
  "categories",
  "transactions",
  "commitments",
  "goals",
  "budgets",
  "notifications",
] as const;

/** Direito de acesso e portabilidade (LGPD): devolve todos os dados do titular. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    const tables: Record<string, unknown[]> = {};
    for (const table of USER_TABLES) {
      const { data } = await context.supabase.from(table).select("*");
      tables[table] = data ?? [];
    }

    return {
      json: JSON.stringify(
        {
          gerado_em: new Date().toISOString(),
          titular: profile.data ?? null,
          dados: tables,
        },
        null,
        2,
      ),
    };
  });

/** Direito de exclusão (LGPD): apaga todos os dados e a conta do titular. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    for (const table of USER_TABLES) {
      await context.supabase.from(table).delete().eq("user_id", context.userId);
    }
    await context.supabase.from("profiles").delete().eq("id", context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Não foi possível excluir a conta.");

    return { ok: true };
  });
