import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  MoreVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { budgetStatus, predictBudgetPacing, type Budget, type Category } from "@/lib/finance";
import { formatBRL, formatMonthLabel, monthKeyToday, parseISODate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Patrimo" },
      {
        name: "description",
        content: "Defina limites mensais por categoria e receba alertas para evitar surpresas.",
      },
      { property: "og:title", content: "Orçamentos — Patrimo" },
      {
        property: "og:description",
        content: "Defina limites mensais por categoria e receba alertas para evitar surpresas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Orcamentos,
});

function shiftMonth(monthKey: string, delta: number): string {
  const date = parseISODate(`${monthKey}-01`);
  date.setMonth(date.getMonth() + delta);
  return monthKeyToday(date);
}

function Orcamentos() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [month, setMonth] = useState(() => monthKeyToday());
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Budget | null>(null);
  const [editLimit, setEditLimit] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Budget | null>(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);

  async function create() {
    if (!data) return;
    if (!categoryId) {
      setError("Escolha uma categoria.");
      return;
    }
    if (limit == null || limit <= 0) {
      setError("Informe o limite do mês.");
      return;
    }
    const { error: insertError } = await supabase.from("budgets").insert({
      user_id: data.userId,
      category_id: categoryId,
      month: `${month}-01`,
      limit_amount: limit,
    });
    if (insertError) {
      setError(
        "Não foi possível salvar. Talvez já exista um orçamento para essa categoria neste mês.",
      );
      return;
    }
    await refresh();
    toast.success("Orçamento definido com sucesso.");
    setCategoryId("");
    setLimit(null);
    setError(null);
    setOpen(false);
  }

  async function saveEdit() {
    if (!editing) return;
    if (editLimit == null || editLimit <= 0) {
      setEditError("Informe o novo limite.");
      return;
    }
    const { error: updateError } = await supabase
      .from("budgets")
      .update({ limit_amount: editLimit })
      .eq("id", editing.id);
    if (updateError) {
      setEditError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Limite atualizado com sucesso.");
    setEditing(null);
    setEditError(null);
  }

  async function remove() {
    if (!removing) return;
    const { error: deleteError } = await supabase.from("budgets").delete().eq("id", removing.id);
    if (deleteError) {
      toast.error("Não foi possível excluir o orçamento.");
      return;
    }
    await refresh();
    toast.success("Orçamento removido.");
    setRemoving(null);
  }

  async function copyPreviousMonth() {
    if (!data) return;
    const previous = shiftMonth(month, -1);
    const source = data.budgets.filter((b) => b.month.startsWith(previous));
    if (source.length === 0) {
      toast.info(
        `Nenhum orçamento encontrado em ${formatMonthLabel(parseISODate(`${previous}-01`))}.`,
      );
      setCopyConfirmOpen(false);
      return;
    }

    const currentCatIds = new Set(
      data.budgets.filter((b) => b.month.startsWith(month)).map((b) => b.category_id),
    );

    const toInsert = source
      .filter((b) => !currentCatIds.has(b.category_id))
      .map((b) => ({
        user_id: data.userId,
        category_id: b.category_id,
        month: `${month}-01`,
        limit_amount: b.limit_amount,
      }));

    if (toInsert.length === 0) {
      toast.info("Todas as categorias do mês anterior já possuem orçamento definido neste mês.");
      setCopyConfirmOpen(false);
      return;
    }

    const { error: insertError } = await supabase.from("budgets").insert(toInsert);
    if (insertError) {
      toast.error("Não foi possível copiar os orçamentos.");
      return;
    }

    await refresh();
    toast.success(
      `${toInsert.length} orçamentos copiados para ${formatMonthLabel(parseISODate(`${month}-01`))}.`,
    );
    setCopyConfirmOpen(false);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Orçamentos">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const statuses = budgetStatus(data.budgets, data.categories, data.transactions, month);

  // Cálculos do resumo superior
  const totalPlanned = statuses.reduce((sum, s) => sum + Number(s.budget.limit_amount), 0);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);
  const totalAvailable = Math.max(totalPlanned - totalSpent, 0);
  const warningCount = statuses.filter((s) => s.level === "atencao").length;
  const exceededCount = statuses.filter((s) => s.level === "excedido").length;

  // Identificar gastos sem orçamento neste mês
  const startISO = `${month}-01`;
  const endISO = toISODate(
    new Date(parseISODate(startISO).getFullYear(), parseISODate(startISO).getMonth() + 1, 0),
  );
  const budgetedCategoryIds = new Set(statuses.map((s) => s.budget.category_id));

  const expensesWithoutBudget = data.categories
    .filter((cat) => cat.kind === "despesa" && !budgetedCategoryIds.has(cat.id))
    .map((cat) => {
      const spent = data.transactions
        .filter(
          (tx) =>
            tx.kind === "despesa" &&
            !tx.is_invoice_payment &&
            tx.category_id === cat.id &&
            tx.occurred_on >= startISO &&
            tx.occurred_on <= endISO,
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      return { category: cat, spent };
    })
    .filter((item) => item.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const prevMonthLabel = formatMonthLabel(parseISODate(`${shiftMonth(month, -1)}-01`));
  const currentMonthLabel = formatMonthLabel(parseISODate(`${month}-01`));

  return (
    <AppShell title="Orçamentos">
      <div className="space-y-6">
        {/* NAVEGAÇÃO DE MÊS E AÇÕES */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-base font-bold capitalize text-foreground">
              {currentMonthLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCopyConfirmOpen(true)}
              title="Copiar limites do mês anterior"
            >
              <Copy className="mr-1.5 h-4 w-4" /> Repetir mês anterior
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Definir orçamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Definir orçamento para {currentMonthLabel}</DialogTitle>
                  <DialogDescription>
                    Estabeleça o teto que deseja gastar nesta categoria ao longo do mês.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.categories
                          .filter((c) => c.kind === "despesa")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="limit-amount">Limite mensal (R$)</Label>
                    <CurrencyInput
                      id="limit-amount"
                      value={limit}
                      onValueChange={setLimit}
                      placeholder="0,00"
                    />
                  </div>

                  {error && (
                    <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => void create()}>
                    Salvar orçamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* RESUMO MENSAL NO TOPO */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Total planejado</span>
            <p className="mt-1 text-xl font-bold tabular text-foreground">
              {formatBRL(totalPlanned)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Total gasto</span>
            <p className="mt-1 text-xl font-bold tabular text-foreground">
              {formatBRL(totalSpent)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Ainda disponível</span>
            <p className="mt-1 text-xl font-bold tabular text-positive">
              {formatBRL(totalAvailable)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Em atenção</span>
            <p className="mt-1 text-xl font-bold tabular text-amber-600 dark:text-amber-400">
              {warningCount} {warningCount === 1 ? "categoria" : "categorias"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Ultrapassaram</span>
            <p className="mt-1 text-xl font-bold tabular text-destructive">
              {exceededCount} {exceededCount === 1 ? "categoria" : "categorias"}
            </p>
          </div>
        </div>

        {/* LISTA DE ORÇAMENTOS POR CATEGORIA */}
        {statuses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Nenhum orçamento configurado para {currentMonthLabel}. Clique em "Definir orçamento"
              ou "Repetir mês anterior" para organizar seus limites.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {statuses.map(({ budget, category, spent, usage, level }) => {
              const remaining = Math.max(Number(budget.limit_amount) - spent, 0);
              const pacing = predictBudgetPacing(spent, Number(budget.limit_amount), month);

              // Determinar status acolhedor
              let stateBadge = {
                label: "Tudo bem",
                variant: "outline" as const,
                className: "border-positive/40 bg-positive/10 text-positive",
                icon: CheckCircle2,
              };

              if (spent === 0) {
                stateBadge = {
                  label: "Sem movimentações",
                  variant: "outline" as const,
                  className: "border-border text-muted-foreground",
                  icon: Info,
                };
              } else if (level === "excedido") {
                stateBadge = {
                  label: "Limite ultrapassado",
                  variant: "outline" as const,
                  className: "border-destructive/40 bg-destructive/10 text-destructive",
                  icon: AlertTriangle,
                };
              } else if (level === "atencao" || pacing.willExceed) {
                stateBadge = {
                  label: "Atenção",
                  variant: "outline" as const,
                  className:
                    "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  icon: AlertCircle,
                };
              }

              return (
                <Card
                  key={budget.id}
                  className="flex flex-col justify-between transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold">
                            {category?.name ?? "Categoria"}
                          </CardTitle>
                          <Badge
                            variant={stateBadge.variant}
                            className={`text-xs gap-1 ${stateBadge.className}`}
                          >
                            <stateBadge.icon className="h-3 w-3" />
                            {stateBadge.label}
                          </Badge>
                        </div>
                        <CardDescription className="mt-0.5 text-xs">
                          Limite mensal: <strong>{formatBRL(budget.limit_amount)}</strong>
                        </CardDescription>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            title="Ações do orçamento"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer font-medium"
                            onClick={() => {
                              setEditing(budget);
                              setEditLimit(Number(budget.limit_amount));
                              setEditError(null);
                            }}
                          >
                            Editar limite
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setRemoving(budget)}
                          >
                            Excluir orçamento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Indicadores de Gasto e Restante */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Já gasto:{" "}
                          <strong className="text-foreground tabular">{formatBRL(spent)}</strong> (
                          {usage.toFixed(0)}%)
                        </span>
                        <span className="text-muted-foreground">
                          Resta:{" "}
                          <strong
                            className={remaining === 0 ? "text-destructive" : "text-positive"}
                          >
                            {formatBRL(remaining)}
                          </strong>
                        </span>
                      </div>

                      <Progress
                        value={Math.min(usage, 100)}
                        className={
                          level === "excedido"
                            ? "[&>div]:bg-destructive"
                            : level === "atencao"
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-positive"
                        }
                      />
                    </div>

                    <div className="rounded-lg p-2.5 text-xs text-muted-foreground">
                      {spent === 0 ? (
                        <span>Nenhum gasto nesta categoria até o momento no mês.</span>
                      ) : pacing.willExceed ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          Nesse ritmo, você pode passar {formatBRL(pacing.projectedExcess)} do
                          limite até o fim do mês.
                        </span>
                      ) : (
                        <span>
                          No ritmo atual, a estimativa até o fim do mês é de{" "}
                          {formatBRL(pacing.projectedTotal)}.
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ÁREA DE GASTOS SEM ORÇAMENTO */}
        {expensesWithoutBudget.length > 0 && (
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Gastos sem orçamento definido
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {expensesWithoutBudget.map(({ category, spent }) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{category.name}</span>
                      <p className="text-muted-foreground">
                        Total gasto neste mês: {formatBRL(spent)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => {
                        setCategoryId(category.id);
                        setLimit(Math.ceil(spent * 1.15)); // Sugestão 15% acima do atual
                        setOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Definir limite
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL EXPLICATIVO PARA REPETIR MÊS ANTERIOR */}
      <AlertDialog open={copyConfirmOpen} onOpenChange={setCopyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" /> Repetir orçamentos do mês anterior?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Vamos copiar os limites configurados em <strong>{prevMonthLabel}</strong> para{" "}
                <strong>{currentMonthLabel}</strong>.
              </p>
              <p>
                Você poderá editar ou remover qualquer valor individualmente depois que forem
                copiados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCopyConfirmOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void copyPreviousMonth()}>
              Confirmar e copiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE EDIÇÃO DE LIMITE */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar limite do orçamento</DialogTitle>
            <DialogDescription>Ajuste o teto mensal para esta categoria.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-limit-amount">Novo limite mensal (R$)</Label>
                <CurrencyInput
                  id="edit-limit-amount"
                  value={editLimit}
                  onValueChange={setEditLimit}
                />
              </div>

              {editError && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {editError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveEdit()}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EXCLUSÃO */}
      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta categoria deixará de ter um teto de gastos para o mês selecionado. Nenhum
              lançamento ou dado financeiro será apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemoving(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Remover orçamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
