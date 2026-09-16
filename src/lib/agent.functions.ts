import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toMoney } from "./finance";

const askSchema = z.object({
  question: z.string().trim().min(3, "Escreva sua pergunta.").max(500),
});

/** Responde perguntas em linguagem natural usando apenas os dados do usuário. */
export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Busca todos os dados do Supabase com campos completos para o motor interno
    const [accounts, cards, categories, transactions, commitments, goals, budgets] =
      await Promise.all([
        context.supabase
          .from("accounts")
          .select("id,name,type,opening_balance,institution,color,archived"),
        context.supabase
          .from("credit_cards")
          .select("id,name,brand,limit_amount,closing_day,due_day,payment_account_id,color,archived"),
        context.supabase.from("categories").select("id,name,kind,color,icon"),
        context.supabase
          .from("transactions")
          .select(
            "id,kind,amount,occurred_on,description,notes,category_id,account_id,to_account_id,credit_card_id,installment_group,installment_number,installment_total,is_invoice_payment,paid",
          )
          .order("occurred_on", { ascending: false })
          .limit(500),
        context.supabase
          .from("commitments")
          .select(
            "id,description,amount,due_date,kind,status,category_id,account_id,credit_card_id,transaction_id",
          ),
        context.supabase
          .from("goals")
          .select("id,name,target_amount,current_amount,target_date,account_id"),
        context.supabase.from("budgets").select("id,category_id,month,limit_amount"),
      ]);

    // Tenta usar a IA da Lovable como primeiro respondedor (se a chave estiver disponível)
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      try {
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

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  "quando a fatura é paga. Se um dado não existir, diga isso em vez de estimar.",
              },
              {
                role: "user",
                content: `Dados do usuário em JSON:\n${JSON.stringify(snapshot)}\n\nPergunta: ${data.question}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const payload = (await aiResponse.json()) as {
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

    // Motor analítico interno do Patrimo — funciona 100% offline, sem chave externa
    const { analyzeFinanceQuery } = await import("./agent-engine");

    const financeData = {
      userId: context.userId,
      profile: null,
      accounts: (accounts.data ?? []).map((a) => ({
        id: a.id ?? "",
        name: a.name ?? "",
        type: (a.type ?? "corrente") as "corrente" | "poupanca" | "dinheiro" | "investimentos",
        institution: a.institution ?? null,
        opening_balance: toMoney(a.opening_balance),
        color: a.color ?? "#3b82f6",
        archived: Boolean(a.archived),
      })),
      cards: (cards.data ?? []).map((c) => ({
        id: c.id ?? "",
        name: c.name ?? "",
        brand: c.brand ?? null,
        limit_amount: toMoney(c.limit_amount),
        closing_day: Number(c.closing_day ?? 28),
        due_day: Number(c.due_day ?? 5),
        payment_account_id: c.payment_account_id ?? null,
        color: c.color ?? "#8b5cf6",
        archived: Boolean(c.archived),
      })),
      categories: (categories.data ?? []).map((cat) => ({
        id: cat.id ?? "",
        name: cat.name ?? "",
        kind: (cat.kind ?? "despesa") as "receita" | "despesa",
        color: cat.color ?? "#64748b",
        icon: cat.icon ?? "tag",
      })),
      transactions: (transactions.data ?? []).map((t) => ({
        id: t.id ?? "",
        kind: (t.kind ?? "despesa") as "receita" | "despesa" | "transferencia",
        amount: toMoney(t.amount),
        occurred_on: t.occurred_on ?? "",
        description: t.description ?? "",
        notes: t.notes ?? null,
        category_id: t.category_id ?? null,
        account_id: t.account_id ?? null,
        to_account_id: t.to_account_id ?? null,
        credit_card_id: t.credit_card_id ?? null,
        installment_group: t.installment_group ?? null,
        installment_number: t.installment_number ?? null,
        installment_total: t.installment_total ?? null,
        is_invoice_payment: Boolean(t.is_invoice_payment),
        paid: Boolean(t.paid),
      })),
      commitments: (commitments.data ?? []).map((com) => ({
        id: com.id ?? "",
        description: com.description ?? "",
        amount: toMoney(com.amount),
        due_date: com.due_date ?? "",
        kind: (com.kind ?? "despesa") as "receita" | "despesa",
        status: (com.status ?? "pendente") as "pendente" | "pago",
        category_id: com.category_id ?? null,
        account_id: com.account_id ?? null,
        credit_card_id: com.credit_card_id ?? null,
        transaction_id: com.transaction_id ?? null,
      })),
      goals: (goals.data ?? []).map((g) => ({
        id: g.id ?? "",
        name: g.name ?? "",
        target_amount: toMoney(g.target_amount),
        current_amount: toMoney(g.current_amount),
        target_date: g.target_date ?? "",
        account_id: g.account_id ?? null,
      })),
      budgets: (budgets.data ?? []).map((b) => ({
        id: b.id ?? "",
        category_id: b.category_id ?? "",
        month: b.month ?? "",
        limit_amount: toMoney(b.limit_amount),
      })),
      notifications: [],
    };

    return {
      answer: analyzeFinanceQuery(data.question, financeData),
    };
  });
