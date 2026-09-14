import { supabase } from "@/integrations/supabase/client";
import type { FinanceData } from "@/lib/data";
import { budgetStatus, cardOpenInvoiceTotal } from "@/lib/finance";
import { formatBRL, formatDate, monthKeyToday, toISODate } from "@/lib/format";

interface DraftNotification {
  title: string;
  body: string;
  level: "info" | "alerta";
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Alertas derivados dos dados reais: orçamento, fatura e compromissos. */
export function buildNotifications(data: FinanceData): DraftNotification[] {
  const out: DraftNotification[] = [];
  const month = monthKeyToday();
  const today = toISODate(new Date());

  for (const status of budgetStatus(data.budgets, data.categories, data.transactions, month)) {
    const name = status.category?.name ?? "Categoria";
    if (status.level === "excedido") {
      out.push({
        title: `Orçamento de ${name} excedido (${month})`,
        body: `Você já gastou ${formatBRL(status.spent)} de ${formatBRL(status.budget.limit_amount)} neste mês.`,
        level: "alerta",
      });
    } else if (status.level === "atencao") {
      out.push({
        title: `Orçamento de ${name} perto do limite (${month})`,
        body: `Você já usou ${status.usage.toFixed(0)}% do limite de ${formatBRL(status.budget.limit_amount)}.`,
        level: "alerta",
      });
    }
  }

  const limit = addDays(7);
  for (const card of data.cards.filter((c) => !c.archived)) {
    const open = cardOpenInvoiceTotal(card, data.transactions);
    if (open <= 0) continue;
    const now = new Date();
    let dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
    if (toISODate(dueDate) < today)
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, card.due_day);
    const dueISO = toISODate(dueDate);
    if (dueISO <= limit) {
      out.push({
        title: `Fatura do ${card.name} vence em ${formatDate(dueISO)}`,
        body: `Há ${formatBRL(open)} em aberto neste cartão.`,
        level: "alerta",
      });
    }
  }

  const soon = addDays(5);
  for (const commitment of data.commitments) {
    if (commitment.status !== "pendente") continue;
    if (commitment.due_date < today || commitment.due_date > soon) continue;
    out.push({
      title: `${commitment.description} vence em ${formatDate(commitment.due_date)}`,
      body: `Valor previsto de ${formatBRL(commitment.amount)}.`,
      level: "info",
    });
  }

  return out;
}

/** Grava apenas os avisos que ainda não existem, para não duplicar. */
export async function syncNotifications(data: FinanceData): Promise<number> {
  const drafts = buildNotifications(data);
  if (drafts.length === 0) return 0;
  const existing = new Set(data.notifications.map((n) => n.title));
  const missing = drafts.filter((draft) => !existing.has(draft.title));
  if (missing.length === 0) return 0;
  const { error } = await supabase
    .from("notifications")
    .insert(missing.map((draft) => ({ ...draft, user_id: data.userId })));
  if (error) return 0;
  return missing.length;
}
