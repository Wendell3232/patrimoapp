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
    if (apiKey) {
      try {
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
                  "com valores em reais no formato R$ 0,00, de forma objetiva e acolhedora. " +
                  "Use somente os dados fornecidos. Regras: patrimônio é a soma dos saldos das contas e " +
                  "acumula entre meses; transferências entre contas não são receita nem despesa; " +
                  "limite de cartão não é patrimônio; compra no cartão entra na fatura e só debita a conta " +
                  "quando a fatura é paga.",
              },
              {
                role: "user",
                content: `Dados do usuário em JSON:\n${JSON.stringify(snapshot)}\n\nPergunta: ${data.question}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = payload.choices?.[0]?.message?.content;
          if (content) {
            return { answer: content };
          }
        }
      } catch (err) {
        console.warn("[askAgent] Gateway AI indisponível, usando motor analítico interno:", err);
      }
    }

    // Fallback inteligente com o motor analítico interno do Patrimo
    const { analyzeFinanceQuery } = await import("./agent-engine");
    const financeData = {
      userId: context.userId,
      profile: null,
      accounts: (accounts.data ?? []).map((a, i) => ({
        id: `acc-${i}`,
        name: a.name,
        type: a.type,
        institution: null,
        opening_balance: Number(a.opening_balance ?? 0),
        color: "#3b82f6",
        archived: false,
      })),
      cards: (cards.data ?? []).map((c, i) => ({
        id: `card-${i}`,
        name: c.name,
        brand: null,
        limit_amount: Number(c.limit_amount ?? 0),
        closing_day: Number(c.closing_day ?? 28),
        due_day: Number(c.due_day ?? 5),
        payment_account_id: null,
        color: "#8b5cf6",
        archived: false,
      })),
      categories: (categories.data ?? []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        kind: cat.kind,
        color: "#64748b",
        icon: "tag",
      })),
      transactions: (transactions.data ?? []).map((t, i) => ({
        id: `tx-${i}`,
        kind: t.kind,
        amount: Number(t.amount ?? 0),
        occurred_on: t.occurred_on,
        description: t.description,
        notes: null,
        category_id: t.category_id,
        account_id: null,
        to_account_id: null,
        credit_card_id: t.credit_card_id,
        installment_group: null,
        installment_number: null,
        installment_total: null,
        is_invoice_payment: false,
        paid: true,
      })),
      commitments: (commitments.data ?? []).map((com, i) => ({
        id: `com-${i}`,
        description: com.description,
        amount: Number(com.amount ?? 0),
        due_date: com.due_date,
        kind: com.kind,
        status: com.status,
        category_id: null,
        account_id: null,
        credit_card_id: null,
        transaction_id: null,
      })),
      goals: (goals.data ?? []).map((g, i) => ({
        id: `goal-${i}`,
        name: g.name,
        target_amount: Number(g.target_amount ?? 0),
        current_amount: Number(g.current_amount ?? 0),
        target_date: g.target_date,
        account_id: null,
      })),
      budgets: (budgets.data ?? []).map((b, i) => ({
        id: `budget-${i}`,
        category_id: b.category_id,
        month: b.month,
        limit_amount: Number(b.limit_amount ?? 0),
      })),
      notifications: [],
    };

    return {
      answer: analyzeFinanceQuery(data.question, financeData),
    };
  });
