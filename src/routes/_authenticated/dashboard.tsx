import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  HelpCircle,
  Info,
  PiggyBank,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { QuickActions } from "@/components/app/QuickActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinance } from "@/lib/data";
import {
  ACCOUNT_TYPE_LABEL,
  accountBalance,
  budgetStatus,
  buildPeriod,
  cardOpenInvoiceTotal,
  detectUnusualExpenses,
  expensesByCategory,
  futureCommitments,
  goalPacing,
  incomeExpenseSeries,
  netWorthSeries,
  netWorthUntil,
  periodTotals,
  type PeriodKind,
} from "@/lib/finance";
import { formatBRL, formatBRLCompact, formatDayMonth, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Patrimo" },
      {
        name: "description",
        content: "Tudo o que você tem nas contas, o que entrou, o que saiu e suas próximas atenções.",
      },
      { property: "og:title", content: "Visão Geral — Patrimo" },
      {
        property: "og:description",
        content: "Tudo o que você tem nas contas, o que entrou, o que saiu e suas próximas atenções.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useFinance();
  const [kind, setKind] = useState<PeriodKind>("mes");
  const [anchor, setAnchor] = useState(() => new Date());
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return {
      start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: toISODate(today),
    };
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const period = useMemo(() => buildPeriod(kind, anchor, custom), [kind, anchor, custom]);

  const view = useMemo(() => {
    if (!data) return null;
    const { accounts, transactions, categories, commitments, cards, budgets, goals } = data;
    const totals = periodTotals(transactions, period.start, period.end);
    const previous = periodTotals(transactions, period.previous.start, period.previous.end);
    const worthNow = netWorthUntil(accounts, transactions, period.end);

    const activeAccounts = accounts.filter((a) => !a.archived);
    const byAccount = activeAccounts
      .map((account) => ({
        account,
        balance: accountBalance(account, transactions),
      }))
      .sort((a, b) => b.balance - a.balance);

    const worthTotal = byAccount.reduce((sum, item) => sum + item.balance, 0);

    const categoriesOut = expensesByCategory(
      transactions,
      categories,
      period.start,
      period.end,
    ).slice(0, 6);

    const worthSeries = netWorthSeries(
      accounts,
      transactions,
      toISODate(new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1)),
      period.end,
    );

    const flowSeries = incomeExpenseSeries(
      transactions,
      toISODate(new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1)),
      period.end,
    );

    const upcomingCommitments = futureCommitments(commitments).slice(0, 3);
    const recent = transactions
      .filter((tx) => tx.occurred_on >= period.start && tx.occurred_on <= period.end)
      .slice(0, 8);

    // Gastos fora do comum no período
    const unusual = detectUnusualExpenses(transactions, categories, period.start, period.end);

    // Próxima atenção (a ação mais prioritária no momento)
    let nextAttention: {
      type: "fatura" | "orcamento" | "compromisso" | "meta" | "ok";
      title: string;
      description: string;
      actionLabel: string;
      actionTo: string;
    } = {
      type: "ok",
      title: "Tudo sob controle!",
      description: "Nenhuma fatura urgente ou limite ultrapassado neste momento.",
      actionLabel: "Nova movimentação",
      actionTo: "/movimentacoes",
    };

    const now = new Date();
    const todayISO = toISODate(now);

    // 1. Verificar faturas próximas de vencer (<= 5 dias)
    const activeCards = cards.filter((c) => !c.archived);
    for (const card of activeCards) {
      const openTotal = cardOpenInvoiceTotal(card, transactions);
      if (openTotal > 0) {
        let dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
        if (toISODate(dueDate) < todayISO) {
          dueDate = new Date(now.getFullYear(), now.getMonth() + 1, card.due_day);
        }
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff <= 5) {
          nextAttention = {
            type: "fatura",
            title: `Fatura do ${card.name} vence ${daysDiff === 0 ? "hoje" : `em ${daysDiff} dias`}`,
            description: `Valor em aberto de ${formatBRL(openTotal)}. Evite juros confirmando o pagamento.`,
            actionLabel: "Ver fatura",
            actionTo: "/cartoes",
          };
          break;
        }
      }
    }

    // 2. Se não houver fatura urgente, verificar orçamentos em risco (>= 85%)
    if (nextAttention.type === "ok") {
      const currentMonthKey = toISODate(now).slice(0, 7);
      const bStatus = budgetStatus(budgets, categories, transactions, currentMonthKey);
      const warningBudget = bStatus.find((b) => b.level === "excedido" || b.usage >= 85);
      if (warningBudget) {
        const catName = warningBudget.category?.name ?? "Categoria";
        nextAttention = {
          type: "orcamento",
          title:
            warningBudget.level === "excedido"
              ? `Limite de ${catName} ultrapassado`
              : `Você já usou ${warningBudget.usage.toFixed(0)}% de ${catName}`,
          description: `Gasto de ${formatBRL(warningBudget.spent)} do teto de ${formatBRL(warningBudget.budget.limit_amount)}.`,
          actionLabel: "Ver orçamento",
          actionTo: "/orcamentos",
        };
      }
    }

    // 3. Se não houver orçamento, verificar compromisso nos próximos 7 dias
    if (nextAttention.type === "ok") {
      const soonISO = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
      const urgentCommitment = commitments.find(
        (c) =>
          c.status === "pendente" &&
          c.due_date >= todayISO &&
          c.due_date <= soonISO &&
          !c.credit_card_id,
      );
      if (urgentCommitment) {
        nextAttention = {
          type: "compromisso",
          title: `Conta de ${formatBRL(urgentCommitment.amount)} próxima do vencimento`,
          description: `"${urgentCommitment.description}" vence em ${formatDate(urgentCommitment.due_date)}.`,
          actionLabel: "Ver contas futuras",
          actionTo: "/compromissos",
        };
      }
    }

    // 4. Se não houver compromisso, verificar meta atrasada
    if (nextAttention.type === "ok") {
      for (const g of goals) {
        const pacing = goalPacing(g);
        if (pacing.status === "atrasada") {
          nextAttention = {
            type: "meta",
            title: `Sua meta "${g.name}" precisa de atenção`,
            description: `Faltam ${formatBRL(pacing.missing)}. Guarde ${formatBRL(pacing.monthlyNeeded)} por mês para alcançar o prazo.`,
            actionLabel: "Ver meta",
            actionTo: "/metas",
          };
          break;
        }
      }
    }

    // Resumo para a frase analítica da evolução
    const worthValues = worthSeries.map((s) => s.value);
    const minWorth = worthValues.length ? Math.min(...worthValues) : 0;
    const maxWorth = worthValues.length ? Math.max(...worthValues) : 0;

    return {
      totals,
      previous,
      worthNow,
      worthTotal,
      byAccount,
      categoriesOut,
      worthSeries,
      flowSeries,
      upcomingCommitments,
      recent,
      unusual,
      nextAttention,
      minWorth,
      maxWorth,
    };
  }, [data, period, anchor]);

  if (isLoading || !data || !view) {
    return (
      <AppShell title="Visão geral" description="Carregando seus dados">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (data.accounts.length === 0) {
    return (
      <AppShell title="Visão geral" description="Vamos preparar seu espaço financeiro">
        <Card className="mx-auto max-w-lg">
          <CardContent className="space-y-4 p-8 text-center">
            <Wallet className="mx-auto h-8 w-8 text-primary" />
            <h2 className="font-display text-xl font-semibold">Comece em cinco etapas rápidas</h2>
            <p className="text-sm text-muted-foreground">
              Informe quanto você tem hoje, onde o dinheiro está, seus cartões e uma meta inicial.
            </p>
            <Button onClick={() => navigate({ to: "/onboarding" })}>Começar agora</Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const activeUnusual = view.unusual.filter(
    (u) => !dismissedAlerts.includes(u.transaction.id),
  );

  return (
    <AppShell title="Visão geral" description="Como estão suas finanças agora" actions={null}>
      <div className="space-y-6">
        {/* Seletor de período e Ações Rápidas */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PeriodSelector
            kind={kind}
            anchor={anchor}
            custom={custom}
            onKindChange={setKind}
            onAnchorChange={setAnchor}
            onCustomChange={setCustom}
          />
          <QuickActions compact />
        </div>

        {/* 1. TOPO: APENAS OS 3 CARDS PRINCIPAIS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Meu dinheiro hoje */}
          <Card className="relative flex flex-col justify-between border-primary/20 bg-gradient-to-br from-card to-card/90 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Meu dinheiro hoje
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setHelpOpen(true)}
                  title="O que é isso?"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatBRL(view.worthTotal)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              Soma do saldo disponível em todas as suas contas cadastradas.
            </CardContent>
          </Card>

          {/* Card 2: Como foi o período */}
          <Card className="relative flex flex-col justify-between shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Como foi o período ({period.label})
                </span>
                <Badge
                  variant="outline"
                  className={
                    view.totals.result >= 0
                      ? "border-positive/30 bg-positive/10 text-positive"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }
                >
                  {view.totals.result >= 0 ? "Sobrou" : "Faltou"} {formatBRL(Math.abs(view.totals.result))}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3.5 w-3.5 text-positive" /> Entrou
                  </span>
                  <span className="font-semibold text-positive">
                    {formatBRL(view.totals.income)}
                  </span>
                </div>
                <div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" /> Saiu
                  </span>
                  <span className="font-semibold text-destructive">
                    {formatBRL(view.totals.expense)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              Resultado exclusivo deste período (não se mistura com o saldo total).
            </CardContent>
          </Card>

          {/* Card 3: Sua próxima atenção */}
          <Card className="relative flex flex-col justify-between border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {view.nextAttention.type === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sua próxima atenção
                </span>
              </div>
              <p className="mt-1 font-semibold text-foreground">
                {view.nextAttention.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {view.nextAttention.description}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild size="sm" variant="outline" className="w-full justify-between">
                <Link to={view.nextAttention.actionTo}>
                  <span>{view.nextAttention.actionLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ALERTA INTELIGENTE DE GASTO FORA DO PADRÃO (SE HOUVER) */}
        {activeUnusual.length > 0 && (
          <div className="space-y-3">
            {activeUnusual.map((item) => (
              <div
                key={item.transaction.id}
                className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Gasto pontual expressivo em {item.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A despesa de <strong className="text-foreground">{formatBRL(item.transaction.amount)}</strong> ("{item.transaction.description}") é {item.differenceFactor}x maior que a média dos outros gastos deste período.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/movimentacoes",
                        search: { busca: item.transaction.description },
                      })
                    }
                  >
                    Revisar movimentação
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                    onClick={() =>
                      setDismissedAlerts((prev) => [...prev, item.transaction.id])
                    }
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Está correto
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. ONDE ESTÁ MEU DINHEIRO? & PARA ONDE FOI MEU DINHEIRO? */}
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Onde está meu dinheiro */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Onde está meu dinheiro?</CardTitle>
                  <CardDescription className="text-xs">
                    Divisão dos seus saldos entre contas correntes, poupanças e investimentos.
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/contas">Ver contas</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.byAccount.map((item) => (
                <div
                  key={item.account.id}
                  onClick={() => navigate({ to: "/contas" })}
                  className="group cursor-pointer space-y-1.5 rounded-lg p-1.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium group-hover:text-primary">
                      {item.account.name}
                    </span>
                    <span className="tabular font-semibold">{formatBRL(item.balance)}</span>
                  </div>
                  <Progress
                    value={
                      view.worthTotal > 0
                        ? Math.max((item.balance / view.worthTotal) * 100, 0)
                        : 0
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL[item.account.type]}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Para onde foi meu dinheiro */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Para onde foi meu dinheiro?</CardTitle>
                  <CardDescription className="text-xs">
                    Categorias que mais tiveram saídas no período selecionado.
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/movimentacoes">Ver detalhes</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view.categoriesOut.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma despesa registrada neste período.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={view.categoriesOut}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={44}
                          outerRadius={68}
                          strokeWidth={0}
                        >
                          {view.categoriesOut.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {view.categoriesOut.map((entry) => (
                      <li
                        key={entry.id}
                        onClick={() => navigate({ to: "/movimentacoes" })}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-1 text-sm transition-colors hover:bg-accent/40"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 truncate">{entry.name}</span>
                        <span className="tabular font-medium text-foreground">
                          {formatBRL(entry.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. EVOLUÇÃO DO MEU DINHEIRO AO LONGO DO TEMPO */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução do meu dinheiro ao longo do tempo</CardTitle>
              <CardDescription className="text-xs">
                Nos últimos meses, suas reservas variaram entre {formatBRLCompact(view.minWorth)} e {formatBRLCompact(view.maxWorth)}, acumulando {formatBRL(view.worthTotal)} hoje.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={view.worthSeries}>
                  <defs>
                    <linearGradient id="worth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickFormatter={(value: number) => formatBRLCompact(value)}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    fontSize={11}
                  />
                  <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#worth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contas e pagamentos que vêm pela frente */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contas e pagamentos futuros</CardTitle>
              <CardDescription className="text-xs">
                Valores já previstos para os próximos meses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {view.upcomingCommitments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum pagamento futuro previsto no momento.
                </p>
              ) : (
                view.upcomingCommitments.map((group) => (
                  <div key={group.month} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{group.label}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-positive font-medium">
                        Entradas {formatBRL(group.receitas)}
                      </span>
                      <span className="text-destructive font-medium">
                        Saídas {formatBRL(group.despesas)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 pt-0">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/compromissos">Ver calendário financeiro</Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* 4. ENTRADAS E SAÍDAS POR MÊS & RESUMO DO AGENTE FINANCEIRO */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Entradas e saídas nos últimos meses</CardTitle>
              <CardDescription className="text-xs">
                Comparativo mensal entre quanto entrou (verde) e quanto saiu (vermelho).
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.flowSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickFormatter={(value: number) => formatBRLCompact(value)}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    fontSize={11}
                  />
                  <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
                  <Bar dataKey="receitas" fill="var(--positive)" radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Card do Agente Financeiro */}
          <Card className="flex flex-col justify-between border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Agente Financeiro
              </CardTitle>
              <CardDescription className="text-xs">
                Seu assistente inteligente de leitura dos números.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground">
                {view.totals.result >= 0
                  ? `Neste período sobrou ${formatBRL(view.totals.result)}. Você pode direcionar essa sobra para uma de suas metas!`
                  : `Você gastou ${formatBRL(Math.abs(view.totals.result))} acima do que recebeu no período. O Agente pode te ajudar a identificar onde economizar.`}
              </p>
            </CardContent>
            <div className="p-4 pt-0">
              <Button asChild size="sm" className="w-full">
                <Link to="/agente">Perguntar ao Agente</Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* 5. ÚLTIMAS MOVIMENTAÇÕES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Últimas movimentações</CardTitle>
              <CardDescription className="text-xs">
                Atividades mais recentes dentro do período selecionado.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/movimentacoes">Ver todas as movimentações</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada neste período.
              </p>
            ) : (
              view.recent.map((tx) => {
                const category = data.categories.find((c) => c.id === tx.category_id);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tx.description || "Movimentação"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDayMonth(tx.occurred_on)}
                        {category ? ` — ${category.name}` : ""}
                        {tx.installment_total ? ` (${tx.installment_number}/${tx.installment_total})` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        tx.kind === "receita"
                          ? "tabular text-sm font-semibold text-positive"
                          : tx.kind === "despesa"
                            ? "tabular text-sm font-semibold text-destructive"
                            : "tabular text-sm font-semibold text-muted-foreground"
                      }
                    >
                      {tx.kind === "despesa" ? "-" : tx.kind === "receita" ? "+" : ""}
                      {formatBRL(tx.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG: O QUE É "MEU DINHEIRO HOJE"? */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              O que é "Meu dinheiro hoje"?
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground pt-2 space-y-3">
              <p>
                É o <strong>saldo real acumulado</strong> somando todas as suas contas bancárias ativas (conta corrente, poupança, dinheiro em carteira e investimentos).
              </p>
              <p>
                <strong>Importante:</strong> Não inclui o limite dos seus cartões de crédito. No Patrimo, limite de cartão é crédito emprestado pelo banco, e não dinheiro que você possui.
              </p>
              <p>
                Conforme você adiciona receitas, faz pagamentos ou transfere dinheiro entre contas, este valor se atualiza instantaneamente.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setHelpOpen(false)}>Entendi, obrigado!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
