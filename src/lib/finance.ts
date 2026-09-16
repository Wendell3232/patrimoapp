import { formatMonthLabel, parseISODate, toISODate } from "./format";

export type AccountType = "corrente" | "poupanca" | "dinheiro" | "investimentos";
export type TxKind = "receita" | "despesa" | "transferencia";
export type CategoryKind = "receita" | "despesa";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  opening_balance: number;
  color: string;
  archived: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  brand: string | null;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  payment_account_id: string | null;
  color: string;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  amount: number;
  occurred_on: string;
  description: string;
  notes: string | null;
  category_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  credit_card_id: string | null;
  installment_group: string | null;
  installment_number: number | null;
  installment_total: number | null;
  is_invoice_payment: boolean;
  paid: boolean;
}

export interface Commitment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  kind: CategoryKind;
  status: "pendente" | "pago";
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  transaction_id: string | null;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  account_id: string | null;
}

export interface Budget {
  id: string;
  category_id: string;
  month: string;
  limit_amount: number;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  investimentos: "Investimentos",
};

/* ------------------------------------------------------------------ periods */

export type PeriodKind = "mes" | "3m" | "6m" | "ano" | "custom";

export interface Period {
  kind: PeriodKind;
  start: string;
  end: string;
  label: string;
  previous: { start: string; end: string };
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function buildPeriod(
  kind: PeriodKind,
  anchor: Date = new Date(),
  custom?: { start: string; end: string },
): Period {
  let start: Date;
  let end: Date;
  let label: string;

  if (kind === "custom" && custom) {
    start = parseISODate(custom.start);
    end = parseISODate(custom.end);
    label = "Período personalizado";
  } else if (kind === "3m" || kind === "6m") {
    const months = kind === "3m" ? 3 : 6;
    start = startOfMonth(addMonths(anchor, -(months - 1)));
    end = endOfMonth(anchor);
    label = `Últimos ${months} meses`;
  } else if (kind === "ano") {
    start = new Date(anchor.getFullYear(), 0, 1);
    end = new Date(anchor.getFullYear(), 11, 31);
    label = `Ano de ${anchor.getFullYear()}`;
  } else {
    start = startOfMonth(anchor);
    end = endOfMonth(anchor);
    label = formatMonthLabel(anchor);
  }

  const span = daysBetween(start, end) + 1;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (span - 1) * 86400000);

  return {
    kind,
    start: toISODate(start),
    end: toISODate(end),
    label,
    previous: { start: toISODate(prevStart), end: toISODate(prevEnd) },
  };
}

export function monthsInRange(start: string, end: string): Date[] {
  const from = startOfMonth(parseISODate(start));
  const to = startOfMonth(parseISODate(end));
  const out: Date[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return out;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/* ------------------------------------------------------- core calculations */

/** A card purchase never leaves the account balance until the invoice is paid. */
function affectsAccountBalance(tx: Transaction): boolean {
  if (tx.kind === "transferencia") return true;
  if (tx.credit_card_id && !tx.is_invoice_payment) return false;
  return Boolean(tx.account_id) || Boolean(tx.to_account_id);
}

export function accountBalanceUntil(
  account: Account,
  transactions: Transaction[],
  until?: string,
): number {
  let balance = Number(account.opening_balance);
  for (const tx of transactions) {
    if (until && tx.occurred_on > until) continue;
    if (!affectsAccountBalance(tx)) continue;
    if (tx.kind === "receita" && tx.account_id === account.id) balance += Number(tx.amount);
    if (tx.kind === "despesa" && tx.account_id === account.id) balance -= Number(tx.amount);
    if (tx.kind === "transferencia") {
      if (tx.account_id === account.id) balance -= Number(tx.amount);
      if (tx.to_account_id === account.id) balance += Number(tx.amount);
    }
  }
  return balance;
}

export function accountBalance(account: Account, transactions: Transaction[]): number {
  return accountBalanceUntil(account, transactions);
}

/**
 * Patrimônio total: soma dos saldos das contas, acumulado desde sempre.
 * Nunca reseta na virada de mês; transferências são neutras; limite de cartão
 * não é patrimônio.
 */
export function netWorthUntil(
  accounts: Account[],
  transactions: Transaction[],
  until?: string,
): number {
  return accounts.reduce((sum, acc) => sum + accountBalanceUntil(acc, transactions, until), 0);
}

export function netWorth(accounts: Account[], transactions: Transaction[]): number {
  return netWorthUntil(accounts, transactions);
}

export function inRange(tx: Transaction, start: string, end: string): boolean {
  return tx.occurred_on >= start && tx.occurred_on <= end;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  result: number;
}

/**
 * Receitas e despesas do período. Transferências não entram. Pagamento de
 * fatura também não entra (a despesa já foi contada na compra do cartão).
 */
export function periodTotals(
  transactions: Transaction[],
  start: string,
  end: string,
): PeriodTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (!inRange(tx, start, end)) continue;
    if (tx.kind === "transferencia") continue;
    if (tx.is_invoice_payment) continue;
    if (tx.kind === "receita") income += Number(tx.amount);
    if (tx.kind === "despesa") expense += Number(tx.amount);
  }
  return { income, expense, result: income - expense };
}

export function variation(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function expensesByCategory(
  transactions: Transaction[],
  categories: Category[],
  start: string,
  end: string,
): { id: string; name: string; color: string; total: number; share: number }[] {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const tx of transactions) {
    if (tx.kind !== "despesa" || tx.is_invoice_payment) continue;
    if (!inRange(tx, start, end)) continue;
    const key = tx.category_id ?? "sem-categoria";
    totals.set(key, (totals.get(key) ?? 0) + Number(tx.amount));
    sum += Number(tx.amount);
  }
  return [...totals.entries()]
    .map(([id, total]) => {
      const category = categories.find((c) => c.id === id);
      return {
        id,
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#94a3b8",
        total,
        share: sum > 0 ? (total / sum) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function incomeByCategory(
  transactions: Transaction[],
  categories: Category[],
  start: string,
  end: string,
): { id: string; name: string; color: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind !== "receita" || !inRange(tx, start, end)) continue;
    const key = tx.category_id ?? "sem-categoria";
    totals.set(key, (totals.get(key) ?? 0) + Number(tx.amount));
  }
  return [...totals.entries()]
    .map(([id, total]) => {
      const category = categories.find((c) => c.id === id);
      return {
        id,
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#94a3b8",
        total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Evolução patrimonial mês a mês (acumulada). */
export function netWorthSeries(
  accounts: Account[],
  transactions: Transaction[],
  start: string,
  end: string,
): { month: string; label: string; value: number }[] {
  return monthsInRange(start, end).map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    return {
      month: toISODate(monthStart).slice(0, 7),
      label: monthStart.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      value: netWorthUntil(accounts, transactions, toISODate(monthEnd)),
    };
  });
}

export function incomeExpenseSeries(
  transactions: Transaction[],
  start: string,
  end: string,
): { label: string; receitas: number; despesas: number; resultado: number }[] {
  return monthsInRange(start, end).map((monthStart) => {
    const from = toISODate(monthStart);
    const to = toISODate(endOfMonth(monthStart));
    const totals = periodTotals(transactions, from, to);
    return {
      label: monthStart.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receitas: totals.income,
      despesas: totals.expense,
      resultado: totals.result,
    };
  });
}

/* --------------------------------------------------------------- cartões */

export interface CardInvoice {
  month: string;
  label: string;
  total: number;
  items: Transaction[];
}

export function cardInvoices(card: CreditCard, transactions: Transaction[]): CardInvoice[] {
  const grouped = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.credit_card_id !== card.id || tx.is_invoice_payment) continue;
    if (tx.kind !== "despesa") continue;
    const key = monthKey(tx.occurred_on);
    grouped.set(key, [...(grouped.get(key) ?? []), tx]);
  }
  return [...grouped.entries()]
    .map(([month, items]) => ({
      month,
      label: formatMonthLabel(parseISODate(`${month}-01`)),
      total: items.reduce((s, t) => s + Number(t.amount), 0),
      items,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Limite usado = compras lançadas no cartão ainda não quitadas por fatura paga. */
export function cardUsedLimit(card: CreditCard, transactions: Transaction[]): number {
  let purchases = 0;
  let payments = 0;
  for (const tx of transactions) {
    if (tx.credit_card_id !== card.id) continue;
    if (tx.is_invoice_payment) payments += Number(tx.amount);
    else if (tx.kind === "despesa") purchases += Number(tx.amount);
  }
  return Math.max(purchases - payments, 0);
}

/** Limite ainda disponível para novas compras (pode ficar negativo). */
export function cardAvailableLimit(card: CreditCard, transactions: Transaction[]): number {
  return Number(card.limit_amount) - cardUsedLimit(card, transactions);
}

/** Total já pago em faturas deste cartão. */
export function cardPaymentsTotal(card: CreditCard, transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.credit_card_id === card.id && tx.is_invoice_payment)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

/** Fatura em aberto: compras já lançadas menos o que já foi pago. */
export function cardOpenInvoiceTotal(card: CreditCard, transactions: Transaction[]): number {
  return cardUsedLimit(card, transactions);
}

export function buildInstallments(
  total: number,
  count: number,
  firstDate: string,
): { amount: number; date: string; number: number }[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const rest = cents - base * count;
  const first = parseISODate(firstDate);
  return Array.from({ length: count }, (_, index) => {
    const value = base + (index < rest ? 1 : 0);
    const date = new Date(first.getFullYear(), first.getMonth() + index, first.getDate());
    return { amount: value / 100, date: toISODate(date), number: index + 1 };
  });
}

/* --------------------------------------------------------- metas/orçamentos */

/** Converte para número finito, evitando que NaN/Infinity contaminem cálculos. */
export function toMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function monthsUntil(targetISO: string, from: Date = new Date()): number {
  const target = parseISODate(targetISO);
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth());
  return Math.max(months, 1);
}

export function requiredMonthlySaving(goal: Goal, from: Date = new Date()): number {
  const missing = Math.max(toMoney(goal.target_amount) - toMoney(goal.current_amount), 0);
  const months = monthsUntil(goal.target_date, from);
  return missing / (Number.isFinite(months) && months > 0 ? months : 1);
}

export interface BudgetStatus {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  usage: number;
  level: "ok" | "atencao" | "excedido";
}

export function budgetStatus(
  budgets: Budget[],
  categories: Category[],
  transactions: Transaction[],
  month: string,
): BudgetStatus[] {
  const start = `${month}-01`;
  const end = toISODate(endOfMonth(parseISODate(start)));
  return budgets
    .filter((b) => monthKey(b.month) === month)
    .map((budget) => {
      const spent = transactions
        .filter(
          (tx) =>
            tx.kind === "despesa" &&
            !tx.is_invoice_payment &&
            tx.category_id === budget.category_id &&
            inRange(tx, start, end),
        )
        .reduce((s, tx) => s + Number(tx.amount), 0);
      const usage =
        Number(budget.limit_amount) > 0 ? (spent / Number(budget.limit_amount)) * 100 : 0;
      return {
        budget,
        category: categories.find((c) => c.id === budget.category_id),
        spent,
        usage,
        level: usage >= 100 ? "excedido" : usage >= 90 ? "atencao" : "ok",
      } satisfies BudgetStatus;
    })
    .sort((a, b) => b.usage - a.usage);
}

/* ------------------------------------------------------------ compromissos */

export function futureCommitments(commitments: Commitment[], from: Date = new Date()) {
  const today = toISODate(from);
  const pending = commitments.filter((c) => c.status === "pendente" && c.due_date >= today);
  const grouped = new Map<string, Commitment[]>();
  for (const item of pending) {
    const key = monthKey(item.due_date);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped.entries()]
    .map(([month, items]) => ({
      month,
      label: formatMonthLabel(parseISODate(`${month}-01`)),
      receitas: items.filter((i) => i.kind === "receita").reduce((s, i) => s + Number(i.amount), 0),
      despesas: items.filter((i) => i.kind === "despesa").reduce((s, i) => s + Number(i.amount), 0),
      items: items.sort((a, b) => a.due_date.localeCompare(b.due_date)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* --------------------------------------------------- novas métricas acolhedoras */

/** Calcula o saldo comprometido e o saldo disponível de verdade para uma conta */
export function accountAvailability(
  account: Account,
  transactions: Transaction[],
  commitments: Commitment[],
  cards: CreditCard[],
  withinDays: number = 30,
): { currentBalance: number; committedAmount: number; availableBalance: number } {
  const currentBalance = accountBalance(account, transactions);
  const now = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + withinDays);
  const limitISO = toISODate(limitDate);
  const todayISO = toISODate(now);

  // Compromissos pendentes vinculados a esta conta nos próximos dias
  const pendingCommitments = commitments
    .filter(
      (c) =>
        c.status === "pendente" &&
        c.kind === "despesa" &&
        c.account_id === account.id &&
        c.due_date >= todayISO &&
        c.due_date <= limitISO,
    )
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // Faturas de cartões debitadas nesta conta
  const linkedCardIds = new Set(
    cards.filter((c) => !c.archived && c.payment_account_id === account.id).map((c) => c.id),
  );
  let cardPending = 0;
  for (const card of cards) {
    if (linkedCardIds.has(card.id)) {
      cardPending += cardOpenInvoiceTotal(card, transactions);
    }
  }

  const committedAmount = pendingCommitments + cardPending;
  const availableBalance = currentBalance - committedAmount;

  return {
    currentBalance,
    committedAmount,
    availableBalance,
  };
}

/** Previsão de orçamento até o final do mês no ritmo atual */
export function predictBudgetPacing(spent: number, limit: number, monthKeyStr: string) {
  const now = new Date();
  const todayMonthKey = toISODate(now).slice(0, 7);
  const isCurrentMonth = monthKeyStr === todayMonthKey;

  const monthDate = parseISODate(`${monthKeyStr}-01`);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const currentDay = isCurrentMonth ? Math.max(now.getDate(), 1) : daysInMonth;

  const usagePercent = limit > 0 ? (spent / limit) * 100 : 0;
  const dailyAverage = spent / currentDay;
  const projectedTotal = dailyAverage * daysInMonth;
  const projectedExcess = Math.max(projectedTotal - limit, 0);

  return {
    usagePercent,
    currentDay,
    daysInMonth,
    projectedTotal,
    projectedExcess,
    willExceed: projectedExcess > 0,
  };
}

/** Status e ritmo de uma meta */
export function goalPacing(goal: Goal): {
  target: number;
  current: number;
  missing: number;
  percentage: number;
  monthlyNeeded: number;
  monthsLeft: number;
  status: "no_ritmo" | "atencao" | "atrasada";
  statusLabel: string;
} {
  const target = toMoney(goal.target_amount);
  const current = toMoney(goal.current_amount);
  const missing = Math.max(target - current, 0);
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const monthsLeft = monthsUntil(goal.target_date);
  const monthlyNeeded = missing / (Number.isFinite(monthsLeft) && monthsLeft > 0 ? monthsLeft : 1);

  // Avaliação do ritmo
  let status: "no_ritmo" | "atencao" | "atrasada" = "no_ritmo";
  let statusLabel = "No ritmo";

  if (percentage >= 100) {
    status = "no_ritmo";
    statusLabel = "Concluída";
  } else if (monthsLeft <= 2 && percentage < 50) {
    status = "atrasada";
    statusLabel = "Atrasada";
  } else if (percentage < 30 && monthsLeft <= 4) {
    status = "atencao";
    statusLabel = "Atenção";
  }

  return {
    target,
    current,
    missing,
    percentage,
    monthlyNeeded,
    monthsLeft,
    status,
    statusLabel,
  };
}

/** Identifica gastos fora do comum no período (sem transferências) */
export function detectUnusualExpenses(
  transactions: Transaction[],
  categories: Category[],
  start: string,
  end: string,
): {
  transaction: Transaction;
  categoryName: string;
  categoryColor: string;
  categoryTotal: number;
  differenceFactor: number;
}[] {
  const expenses = transactions.filter(
    (tx) =>
      tx.kind === "despesa" &&
      !tx.is_invoice_payment &&
      tx.occurred_on >= start &&
      tx.occurred_on <= end,
  );

  if (expenses.length < 3) return [];

  const avg = expenses.reduce((s, tx) => s + Number(tx.amount), 0) / expenses.length;
  const out: {
    transaction: Transaction;
    categoryName: string;
    categoryColor: string;
    categoryTotal: number;
    differenceFactor: number;
  }[] = [];

  for (const tx of expenses) {
    const val = Number(tx.amount);
    // Gasto considerável e pelo menos 2.5x acima da média das despesas
    if (val > 200 && val >= avg * 2.2) {
      const cat = categories.find((c) => c.id === tx.category_id);
      const catExpenses = expenses.filter((e) => e.category_id === tx.category_id);
      const catTotal = catExpenses.reduce((s, e) => s + Number(e.amount), 0);

      out.push({
        transaction: tx,
        categoryName: cat?.name ?? "Geral",
        categoryColor: cat?.color ?? "#f59e0b",
        categoryTotal: catTotal,
        differenceFactor: Math.round(val / avg),
      });
    }
  }

  return out.slice(0, 2); // No máximo 2 alertas pontuais para não poluir
}

