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
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Sparkles, Wallet } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { QuickActions } from "@/components/app/QuickActions";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinance } from "@/lib/data";
import {
  ACCOUNT_TYPE_LABEL,
  accountBalance,
  buildPeriod,
  expensesByCategory,
  futureCommitments,
  incomeExpenseSeries,
  netWorthSeries,
  netWorthUntil,
  periodTotals,
  variation,
  type PeriodKind,
} from "@/lib/finance";
import { formatBRL, formatBRLCompact, formatDayMonth, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Patrimo" },
      {
        name: "description",
        content: "Patrimônio contínuo, entradas, despesas e compromissos do período escolhido.",
      },
      { property: "og:title", content: "Visão Geral — Patrimo" },
      {
        property: "og:description",
        content: "Patrimônio contínuo, entradas, despesas e compromissos do período escolhido.",
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

  const period = useMemo(() => buildPeriod(kind, anchor, custom), [kind, anchor, custom]);

  const view = useMemo(() => {
    if (!data) return null;
    const { accounts, transactions, categories, commitments } = data;
    const totals = periodTotals(transactions, period.start, period.end);
    const previous = periodTotals(transactions, period.previous.start, period.previous.end);
    const worthNow = netWorthUntil(accounts, transactions, period.end);
    const worthBefore = netWorthUntil(accounts, transactions, period.previous.end);
    const worthVariation = worthBefore === 0 ? undefined : variation(worthNow, worthBefore);

    return {
      totals,
      previous,
      worthNow,
      worthVariation,
      byAccount: accounts
        .filter((a) => !a.archived)
        .map((account) => ({
          account,
          balance: accountBalance(account, transactions),
        }))
        .sort((a, b) => b.balance - a.balance),
      categoriesOut: expensesByCategory(transactions, categories, period.start, period.end).slice(
        0,
        6,
      ),
      worthSeries: netWorthSeries(
        accounts,
        transactions,
        toISODate(new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1)),
        period.end,
      ),
      flowSeries: incomeExpenseSeries(
        transactions,
        toISODate(new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1)),
        period.end,
      ),
      commitments: futureCommitments(commitments).slice(0, 3),
      recent: transactions
        .filter((tx) => tx.occurred_on >= period.start && tx.occurred_on <= period.end)
        .slice(0, 8),
    };
  }, [data, period, anchor]);

  if (isLoading || !data || !view) {
    return (
      <AppShell title="Visão Geral" description="Carregando seus dados">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (data.accounts.length === 0) {
    return (
      <AppShell title="Visão Geral" description="Vamos preparar seu espaço financeiro">
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

  const worthTotal = view.byAccount.reduce((sum, item) => sum + item.balance, 0);

  return (
    <AppShell title="Visão geral" description="Acompanhe a saúde das suas finanças" actions={null}>
      <div className="space-y-5 sm:space-y-6">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Patrimônio total"
            value={view.worthNow}
            variation={view.worthVariation}
            hint="acumulado, sem reset mensal"
            tone="primary"
            accent="primary"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label="Entradas"
            value={view.totals.income}
            variation={
              view.previous.income === 0
                ? undefined
                : variation(view.totals.income, view.previous.income)
            }
            tone="positive"
            icon={<ArrowUpRight className="h-4 w-4 text-positive" />}
            accent="positive"
          />
          <StatCard
            label="Despesas"
            value={view.totals.expense}
            variation={
              view.previous.expense === 0
                ? undefined
                : variation(view.totals.expense, view.previous.expense)
            }
            tone="negative"
            icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}
            accent="negative"
            {...(data.profile?.monthly_income
              ? {
                  hint: `${Math.round((view.totals.expense / data.profile.monthly_income) * 100)}% da sua renda mensal`,
                }
              : {})}
          />
          <StatCard
            label="Resultado"
            value={view.totals.result}
            tone={view.totals.result >= 0 ? "positive" : "negative"}
            hint="entradas menos despesas"
            accent={view.totals.result >= 0 ? "positive" : "negative"}
            icon={<CircleDollarSign className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onde está meu dinheiro?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.byAccount.map((item) => (
                <div key={item.account.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.account.name}</span>
                    <span className="tabular">{formatBRL(item.balance)}</span>
                  </div>
                  <Progress
                    value={worthTotal > 0 ? Math.max((item.balance / worthTotal) * 100, 0) : 0}
                  />
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL[item.account.type]}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Para onde está indo meu dinheiro?</CardTitle>
            </CardHeader>
            <CardContent>
              {view.categoriesOut.length === 0 ? (
                <p className="text-sm text-muted-foreground">
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
                        <Tooltip formatter={(value: number) => formatBRL(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {view.categoriesOut.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 truncate">{entry.name}</span>
                        <span className="tabular text-muted-foreground">
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

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Evolução do patrimônio</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
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
                  <Tooltip formatter={(value: number) => formatBRL(value)} />
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compromissos futuros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.commitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum compromisso registrado.</p>
              ) : (
                view.commitments.map((group) => (
                  <div key={group.month} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{group.label}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-positive">Entradas {formatBRL(group.receitas)}</span>
                      <span className="text-destructive">Saídas {formatBRL(group.despesas)}</span>
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/compromissos">Ver calendário</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Entradas e despesas por mês</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
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
                  <Tooltip formatter={(value: number) => formatBRL(value)} />
                  <Bar dataKey="receitas" fill="var(--positive)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Agente Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {view.totals.result >= 0
                  ? `Você fechou o período com sobra de ${formatBRL(view.totals.result)}.`
                  : `Você gastou ${formatBRL(Math.abs(view.totals.result))} acima do que entrou.`}
              </p>
              <Button asChild size="sm">
                <Link to="/agente">Conversar sobre meus números</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lançamentos do período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada lançado neste período.</p>
            ) : (
              view.recent.map((tx) => {
                const category = data.categories.find((c) => c.id === tx.category_id);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tx.description || "Lançamento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDayMonth(tx.occurred_on)}
                        {category ? ` — ${category.name}` : ""}
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
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/movimentacoes">Ver todas as movimentações</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
