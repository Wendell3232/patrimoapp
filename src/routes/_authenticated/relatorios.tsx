import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

import { AppShell } from "@/components/app/AppShell";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinance } from "@/lib/data";
import {
  buildPeriod,
  cardUsedLimit,
  expensesByCategory,
  incomeExpenseSeries,
  netWorthSeries,
  type PeriodKind,
} from "@/lib/finance";
import { formatBRL, formatBRLCompact, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Patrimo" },
      {
        name: "description",
        content: "Evolução patrimonial, entradas x despesas, categorias e uso de cartões.",
      },
      { property: "og:title", content: "Relatórios — Patrimo" },
      { property: "og:description", content: "Evolução patrimonial, entradas x despesas, categorias e uso de cartões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { data, isLoading } = useFinance();
  const [kind, setKind] = useState<PeriodKind>("6m");
  const [anchor, setAnchor] = useState(() => new Date());
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return {
      start: toISODate(new Date(today.getFullYear(), today.getMonth() - 5, 1)),
      end: toISODate(today),
    };
  });

  const period = useMemo(() => buildPeriod(kind, anchor, custom), [kind, anchor, custom]);

  if (isLoading || !data) {
    return (
      <AppShell title="Relatórios">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const worth = netWorthSeries(data.accounts, data.transactions, period.start, period.end);
  const flow = incomeExpenseSeries(data.transactions, period.start, period.end);
  const byCategory = expensesByCategory(
    data.transactions,
    data.categories,
    period.start,
    period.end,
  );

  return (
    <AppShell title="Relatórios" description={period.label}>
      <div className="space-y-8">
        <PeriodSelector
          kind={kind}
          anchor={anchor}
          custom={custom}
          onKindChange={setKind}
          onAnchorChange={setAnchor}
          onCustomChange={setCustom}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução patrimonial</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={worth}>
                <defs>
                  <linearGradient id="rel-worth" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#rel-worth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entradas x despesas</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flow}>
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
              <CardTitle className="text-base">Despesas por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={44}
                          outerRadius={68}
                          strokeWidth={0}
                        >
                          {byCategory.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatBRL(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {byCategory.slice(0, 8).map((entry) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso dos cartões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.cards.filter((card) => !card.archived).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
            ) : (
              data.cards
                .filter((card) => !card.archived)
                .map((card) => {
                  const used = cardUsedLimit(card, data.transactions);
                  const usage = card.limit_amount > 0 ? (used / card.limit_amount) * 100 : 0;
                  return (
                    <div key={card.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{card.name}</span>
                        <span className="tabular">
                          {formatBRL(used)} de {formatBRL(card.limit_amount)}
                        </span>
                      </div>
                      <Progress value={Math.min(usage, 100)} />
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
