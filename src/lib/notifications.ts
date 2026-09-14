import { supabase } from "@/integrations/supabase/client";
import type { FinanceData } from "@/lib/data";
import {
  accountBalance,
  budgetStatus,
  cardOpenInvoiceTotal,
  detectUnusualExpenses,
  futureCommitments,
  goalPacing,
} from "@/lib/finance";
import { formatBRL, formatDate, monthKeyToday, toISODate } from "@/lib/format";

export interface DraftNotification {
  title: string;
  body: string;
  level: "info" | "atencao" | "urgente";
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Alertas inteligentes derivados dos dados reais em 3 níveis (Informativo, Atenção, Urgente) */
export function buildNotifications(data: FinanceData): DraftNotification[] {
  const out: DraftNotification[] = [];
  const month = monthKeyToday();
  const today = toISODate(new Date());

  // 1. Orçamentos (Atenção e Urgente)
  for (const status of budgetStatus(data.budgets, data.categories, data.transactions, month)) {
    const name = status.category?.name ?? "Categoria";
    if (status.level === "excedido") {
      out.push({
        title: `Orçamento de ${name} ultrapassado (${month})`,
        body: `Você já gastou ${formatBRL(status.spent)} do teto de ${formatBRL(status.budget.limit_amount)} neste mês.`,
        level: "urgente",
      });
    } else if (status.level === "atencao" || status.usage >= 80) {
      out.push({
        title: `Orçamento de ${name} perto do limite (${status.usage.toFixed(0)}%)`,
        body: `Você já usou ${status.usage.toFixed(0)}% do limite de ${formatBRL(status.budget.limit_amount)}. Faltam ${formatBRL(Math.max(Number(status.budget.limit_amount) - status.spent, 0))}.`,
        level: "atencao",
      });
    }
  }

  // 2. Faturas de cartão (Atenção e Urgente)
  const now = new Date();
  for (const card of data.cards.filter((c) => !c.archived)) {
    const open = cardOpenInvoiceTotal(card, data.transactions);
    if (open <= 0) continue;

    let dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
    if (toISODate(dueDate) < today) {
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, card.due_day);
    }
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 2) {
      out.push({
        title: `Urgente: Fatura do ${card.name} vence ${daysLeft === 0 ? "hoje" : `em ${daysLeft} dias`}!`,
        body: `Há ${formatBRL(open)} em aberto neste cartão. Confirme o pagamento para evitar cobrança de juros.`,
        level: "urgente",
      });
    } else if (daysLeft <= 6) {
      out.push({
        title: `Fatura do ${card.name} vence em ${daysLeft} dias`,
        body: `Valor em aberto de ${formatBRL(open)} com vencimento em ${formatDate(toISODate(dueDate))}.`,
        level: "atencao",
      });
    }
  }

  // 3. Contas futuras próximas (Informativo e Atenção)
  const limitSoon = addDays(7);
  for (const commitment of data.commitments) {
    if (commitment.status !== "pendente" || commitment.credit_card_id) continue;
    if (commitment.due_date < today || commitment.due_date > limitSoon) continue;

    const daysLeft = Math.ceil(
      (new Date(commitment.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysLeft <= 2) {
      out.push({
        title: `Atenção: "${commitment.description}" vence em breve`,
        body: `Pagamento previsto de ${formatBRL(commitment.amount)} para ${formatDate(commitment.due_date)}.`,
        level: "atencao",
      });
    } else {
      out.push({
        title: `Conta agendada: "${commitment.description}"`,
        body: `Valor de ${formatBRL(commitment.amount)} com vencimento em ${formatDate(commitment.due_date)}.`,
        level: "info",
      });
    }
  }

  // 4. Metas atrasadas (Atenção)
  for (const goal of data.goals) {
    const pacing = goalPacing(goal);
    if (pacing.status === "atrasada") {
      out.push({
        title: `Meta "${goal.name}" precisa de atenção`,
        body: `Para cumprir a meta até o prazo, guarde ${formatBRL(pacing.monthlyNeeded)} por mês.`,
        level: "atencao",
      });
    }
  }

  // 5. Saldo projetado baixo (Urgente)
  const currentTotal = data.accounts
    .filter((a) => !a.archived)
    .reduce((s, a) => s + accountBalance(a, data.transactions), 0);

  const upcomingExpenses = futureCommitments(data.commitments)[0]?.despesas ?? 0;
  if (currentTotal - upcomingExpenses < 0) {
    out.push({
      title: "Alerta de saldo projetado negativo",
      body: `As contas previstas para este mês (${formatBRL(upcomingExpenses)}) superam seu saldo total disponível (${formatBRL(currentTotal)}).`,
      level: "urgente",
    });
  }

  return out;
}

/** Grava apenas os avisos que ainda não existem, para não duplicar */
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
