import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const askSchema = z.object({
  question: z.string().trim().min(3, "Escreva sua pergunta.").max(500),
});

/** Responde perguntas em linguagem natural usando apenas os dados do usuário. */
export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Agente indisponível no momento.");

    const [accounts, cards, categories, transactions, commitments, goals, budgets] =
      await Promise.all([
        context.supabase.from("accounts").select("name,type,opening_balance"),
        context.supabase.from("credit_cards").select("name,limit_amount,closing_day,due_day"),
        context.supabase.from("categories").select("id,name,kind"),
        context.supabase
          .from("transactions")
          .select("kind,amount,occurred_on,description,category_id,credit_card_id")
          .order("occurred_on", { ascending: false })
          .limit(400),
        context.supabase.from("commitments").select("description,amount,due_date,kind,status"),
        context.supabase.from("goals").select("name,target_amount,current_amount,target_date"),
        context.supabase.from("budgets").select("category_id,month,limit_amount"),
      ]);

    const snapshot = {
      contas: accounts.data ?? [],
      cartoes: cards.data ?? [],
      categorias: categories.data ?? [],
      lancamentos: transactions.data ?? [],
      compromissos: commitments.data ?? [],
      metas: goals.data ?? [],
      orcamentos: budgets.data ?? [],
      hoje: new Date().toISOString().slice(0, 10),
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é um analista financeiro pessoal brasileiro. Responda em português do Brasil, " +
              "com valores em reais no formato R$ 0,00, de forma objetiva e sem emojis. " +
              "Use somente os dados fornecidos. Regras: patrimônio é a soma dos saldos das contas e " +
              "acumula entre meses; transferências entre contas não são receita nem despesa; " +
              "limite de cartão não é patrimônio; compra no cartão entra na fatura e só debita a conta " +
              "quando a fatura é paga. Se um dado não existir, diga isso em vez de estimar.",
          },
          {
            role: "user",
            content: `Dados do usuário em JSON:\n${JSON.stringify(snapshot)}\n\nPergunta: ${data.question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Não consegui analisar agora. Tente novamente em instantes.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return {
      answer:
        payload.choices?.[0]?.message?.content ??
        "Não consegui gerar uma resposta com esses dados.",
    };
  });
