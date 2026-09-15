import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  LineChart as LineChartIcon,
  Printer,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinance } from "@/lib/data";
import {
  buildPeriod,
  cardUsedLimit,
  expensesByCategory,
  incomeExpenseSeries,
  netWorthSeries,
  periodTotals,
  variation,
  type PeriodKind,
  type Transaction,
} from "@/lib/finance";
import { formatBRL, formatBRLCompact, formatDate, formatDayMonth, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Patrimo" },
      {
        name: "description",
        content: "Investigue detalhes, compare períodos, exporte relatórios e analise a evolução dos seus gastos.",
      },
      { property: "og:title", content: "Relatórios — Patrimo" },
      {
        property: "og:description",
        content: "Investigue detalhes, compare períodos, exporte relatórios e analise a evolução dos seus gastos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { data, isLoading } = useFinance();
  const navigate = useNavigate();

  const [kind, setKind] = useState<PeriodKind>("6m");
  const [anchor, setAnchor] = useState(() => new Date());
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return {
      start: toISODate(new Date(today.getFullYear(), today.getMonth() - 5, 1)),
      end: toISODate(today),
    };
  });

  // Filtros avançados para investigação detalhada
  const [filterAccount, setFilterAccount] = useState("todas");
  const [filterCard, setFilterCard] = useState("todos");
  const [filterCategory, setFilterCategory] = useState("todas");
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [filterKind, setFilterKind] = useState("todos");
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [onlyInstallments, setOnlyInstallments] = useState(false);

  // Modal para ver transações ao clicar em categoria ou gráfico
  const [inspectCategory, setInspectCategory] = useState<{
    name: string;
    items: Transaction[];
  } | null>(null);

  const period = useMemo(() => buildPeriod(kind, anchor, custom), [kind, anchor, custom]);

  // Filtragem analítica das movimentações
  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((tx) => {
      if (tx.occurred_on < period.start || tx.occurred_on > period.end) return false;
      if (!includeTransfers && tx.kind === "transferencia") return false;
      if (filterAccount !== "todas" && tx.account_id !== filterAccount && tx.to_account_id !== filterAccount)
        return false;
      if (filterCard !== "todos" && tx.credit_card_id !== filterCard) return false;
      if (filterCategory !== "todas" && tx.category_id !== filterCategory) return false;
      if (filterKind !== "todos" && tx.kind !== filterKind) return false;
      if (onlyRecurring && !tx.installment_group && !tx.notes?.includes("recorrente")) return false;
      if (onlyInstallments && !tx.installment_group) return false;
      return true;
    });
  }, [
    data,
    period,
    filterAccount,
    filterCard,
    filterCategory,
    filterKind,
    onlyRecurring,
    onlyInstallments,
    includeTransfers,
  ]);

  // Transações do período anterior para comparação
  const previousTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((tx) => {
      if (tx.occurred_on < period.previous.start || tx.occurred_on > period.previous.end) return false;
      if (!includeTransfers && tx.kind === "transferencia") return false;
      return true;
    });
  }, [data, period, includeTransfers]);

  // Cálculos comparativos
  const currentTotals = useMemo(
    () => periodTotals(filteredTransactions, period.start, period.end),
    [filteredTransactions, period],
  );

  const prevTotals = useMemo(
    () => periodTotals(previousTransactions, period.previous.start, period.previous.end),
    [previousTransactions, period],
  );

  const expenseVariation = useMemo(
    () => (prevTotals.expense === 0 ? 0 : variation(currentTotals.expense, prevTotals.expense)),
    [currentTotals, prevTotals],
  );

  const incomeVariation = useMemo(
    () => (prevTotals.income === 0 ? 0 : variation(currentTotals.income, prevTotals.income)),
    [currentTotals, prevTotals],
  );

  // Séries analíticas
  const worth = useMemo(() => {
    if (!data) return [];
    return netWorthSeries(data.accounts, data.transactions, period.start, period.end);
  }, [data, period]);

  const flow = useMemo(() => {
    return incomeExpenseSeries(filteredTransactions, period.start, period.end);
  }, [filteredTransactions, period]);

  const byCategory = useMemo(() => {
    if (!data) return [];
    return expensesByCategory(filteredTransactions, data.categories, period.start, period.end);
  }, [filteredTransactions, data, period]);

  // Categorias do período anterior para identificar as que mais cresceram
  const prevByCategory = useMemo(() => {
    if (!data) return [];
    return expensesByCategory(previousTransactions, data.categories, period.previous.start, period.previous.end);
  }, [previousTransactions, data, period]);

  const topGrowingCategories = useMemo(() => {
    return byCategory
      .map((curr) => {
        const prev = prevByCategory.find((p) => p.id === curr.id);
        const prevTotal = prev?.total ?? 0;
        const diff = curr.total - prevTotal;
        const pct = prevTotal > 0 ? ((curr.total - prevTotal) / prevTotal) * 100 : 100;
        return { ...curr, prevTotal, diff, pct };
      })
      .filter((c) => c.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  }, [byCategory, prevByCategory]);

  // Exportação CSV
  function exportCSV() {
    if (!data || filteredTransactions.length === 0) {
      toast.info("Nenhuma movimentação para exportar neste período.");
      return;
    }

    const headers = ["Data", "Descricao", "Tipo", "Valor (BRL)", "Categoria", "Conta", "Status"];
    const rows = filteredTransactions.map((tx) => {
      const cat = data.categories.find((c) => c.id === tx.category_id)?.name ?? "Sem categoria";
      const acc = data.accounts.find((a) => a.id === tx.account_id)?.name ?? "Conta principal";
      return [
        tx.occurred_on,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.kind,
        tx.amount.toFixed(2),
        `"${cat}"`,
        `"${acc}"`,
        tx.paid ? "Pago" : "Previsto",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patrimo-relatorio-${period.start}-a-${period.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo CSV baixado com sucesso!");
  }

  // Exportação / Cópia de Resumo Mensal Simples em Texto
  function copyTextSummary() {
    const summaryText = `📊 RESUMO FINANCEIRO PATRIMO — ${period.label}
----------------------------------------
💰 Entradas no período: ${formatBRL(currentTotals.income)}
💸 Despesas no período: ${formatBRL(currentTotals.expense)}
${currentTotals.result >= 0 ? "🟢 Sobrou:" : "🔴 Faltou:"} ${formatBRL(Math.abs(currentTotals.result))}

📌 Maiores categorias de gastos:
${byCategory
  .slice(0, 5)
  .map((c, i) => `${i + 1}. ${c.name}: ${formatBRL(c.total)} (${c.share.toFixed(0)}%)`)
  .join("\n")}

📈 Comparação com período anterior:
Despesas variaram ${expenseVariation >= 0 ? "+" : ""}${expenseVariation.toFixed(0)}%
Entradas variaram ${incomeVariation >= 0 ? "+" : ""}${incomeVariation.toFixed(0)}%
----------------------------------------
Gerado no Patrimo Brasil`;

    navigator.clipboard.writeText(summaryText);
    toast.success("Resumo copiado para a área de transferência!");
  }

  function handleCategoryClick(catId: string, catName: string) {
    const items = filteredTransactions.filter(
      (tx) => tx.category_id === catId && tx.kind === "despesa",
    );
    setInspectCategory({ name: catName, items });
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Relatórios">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const topCategory = byCategory[0];

  return (
    <AppShell
      title="Relatórios"
      description="Investigue seus números, compare períodos e analise tendências"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyTextSummary} title="Copiar resumo textual">
            <Copy className="mr-1.5 h-4 w-4" /> Copiar resumo
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} title="Baixar planilha CSV">
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} title="Imprimir ou salvar em PDF">
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* SELETOR DE PERÍODO */}
        <PeriodSelector
          kind={kind}
          anchor={anchor}
          custom={custom}
          onKindChange={setKind}
          onAnchorChange={setAnchor}
          onCustomChange={setCustom}
        />

        {/* BARRA DE FILTROS DE INVESTIGAÇÃO */}
        <Card className="border-border/80">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Filtrar por conta</Label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as contas</SelectItem>
                  {data.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Filtrar por cartão</Label>
              <Select value={filterCard} onValueChange={setFilterCard}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cartões</SelectItem>
                  {data.cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Filtrar por categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de movimentação</Label>
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="receita">Apenas receitas</SelectItem>
                  <SelectItem value="despesa">Apenas despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 self-end sm:col-span-2 lg:col-span-4 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-transfers"
                  checked={includeTransfers}
                  onChange={(e) => setIncludeTransfers(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="toggle-transfers" className="text-xs cursor-pointer">
                  Incluir transferências internas
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-recurring"
                  checked={onlyRecurring}
                  onChange={(e) => setOnlyRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="toggle-recurring" className="text-xs cursor-pointer">
                  Somente recorrentes
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-installments"
                  checked={onlyInstallments}
                  onChange={(e) => setOnlyInstallments(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="toggle-installments" className="text-xs cursor-pointer">
                  Somente parceladas
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1. COMPARAÇÃO COM O PERÍODO ANTERIOR */}
        <Card className="bg-gradient-to-br from-card to-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Comparação com o período anterior
            </CardTitle>
            {/* Frase de Conclusão Analítica */}
            <CardDescription className="text-sm font-medium text-foreground">
              {expenseVariation <= 0 ? (
                <span className="text-positive">
                  👏 Seus gastos foram {Math.abs(expenseVariation).toFixed(0)}% menores do que no período anterior.
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  ⚠️ Seus gastos foram {expenseVariation.toFixed(0)}% maiores do que no período anterior.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Entradas no período</span>
                <p className="text-lg font-bold text-positive tabular mt-1">
                  {formatBRL(currentTotals.income)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Anterior: {formatBRL(prevTotals.income)} ({incomeVariation >= 0 ? "+" : ""}
                  {incomeVariation.toFixed(0)}%)
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Despesas no período</span>
                <p className="text-lg font-bold text-destructive tabular mt-1">
                  {formatBRL(currentTotals.expense)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Anterior: {formatBRL(prevTotals.expense)} ({expenseVariation >= 0 ? "+" : ""}
                  {expenseVariation.toFixed(0)}%)
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Resultado líquido</span>
                <p
                  className={`text-lg font-bold tabular mt-1 ${
                    currentTotals.result >= 0 ? "text-positive" : "text-destructive"
                  }`}
                >
                  {formatBRL(currentTotals.result)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {currentTotals.result >= 0 ? "Sobra acumulada" : "Diferença negativa"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. ENTRADAS E SAÍDAS POR MÊS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Entradas e saídas mês a mês</CardTitle>
            {/* Frase explicativa antes do gráfico */}
            <CardDescription className="text-xs text-foreground font-medium">
              No total deste período, entraram {formatBRL(currentTotals.income)} e saíram {formatBRL(currentTotals.expense)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
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
                <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
                <Bar dataKey="receitas" fill="var(--positive)" radius={[4, 4, 0, 0]} name="Entradas" />
                <Bar dataKey="despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. GASTOS POR CATEGORIA E CATEGORIAS QUE MAIS CRESCERAM */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Gastos por Categoria com Clique Interativo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
              {/* Frase explicativa */}
              <CardDescription className="text-xs text-foreground font-medium">
                {topCategory
                  ? `A categoria "${topCategory.name}" concentrou a maior fatia: ${formatBRL(topCategory.total)} (${topCategory.share.toFixed(0)}% do total).`
                  : "Nenhuma saída registrada no período."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum gasto encontrado para os filtros selecionados.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={72}
                          strokeWidth={0}
                        >
                          {byCategory.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {byCategory.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id, cat.name)}
                        className="group flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs transition-colors hover:bg-accent/40"
                        title="Clique para ver as movimentações desta categoria"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate font-medium group-hover:text-primary">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 tabular">
                          <span className="text-muted-foreground">{cat.share.toFixed(0)}%</span>
                          <span className="font-bold text-foreground">{formatBRL(cat.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categorias que Mais Cresceram */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Categorias com maior aumento de gastos</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Comparativo nominal em relação ao período anterior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topGrowingCategories.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma categoria apresentou aumento de gastos comparado ao período anterior.
                </p>
              ) : (
                topGrowingCategories.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCategoryClick(item.id, item.name)}
                    className="cursor-pointer rounded-xl border border-border p-3 space-y-1.5 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{item.name}</span>
                      <span className="text-xs font-bold text-destructive">
                        + {formatBRL(item.diff)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Anterior: {formatBRL(item.prevTotal)}</span>
                      <span>Atual: {formatBRL(item.total)}</span>
                    </div>
                    <Progress value={Math.min(item.pct, 100)} className="[&>div]:bg-destructive" />
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate({ to: "/orcamentos" })}
              >
                Revisar limites em Orçamentos
              </Button>
            </div>
          </Card>
        </div>

        {/* 4. EVOLUÇÃO DO DINHEIRO GUARDADO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução do dinheiro guardado</CardTitle>
            <CardDescription className="text-xs text-foreground font-medium">
              Acompanhe a trajetória de crescimento do seu saldo total ao longo do tempo.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
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
                <Tooltip formatter={(value: number) => formatBRL(Number(value))} />
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
      </div>

      {/* DIALOG DE INSPEÇÃO DE TRANSAÇÕES AO CLICAR NA CATEGORIA */}
      <Dialog open={inspectCategory !== null} onOpenChange={(o) => !o && setInspectCategory(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gastos em "{inspectCategory?.name}"</DialogTitle>
            <DialogDescription>
              {inspectCategory?.items.length} {inspectCategory?.items.length === 1 ? "movimentação encontrada" : "movimentações encontradas"} no período selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto py-2 pr-1">
            {inspectCategory?.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhum lançamento encontrado.
              </p>
            ) : (
              inspectCategory?.items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground truncate">{tx.description}</p>
                    <p className="text-muted-foreground">{formatDate(tx.occurred_on)}</p>
                  </div>
                  <div className="text-right font-bold text-destructive tabular">
                    - {formatBRL(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setInspectCategory(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
