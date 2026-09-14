import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { budgetStatus, type Budget } from "@/lib/finance";
import { formatBRL, formatMonthLabel, monthKeyToday, parseISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Patrimo" },
      { name: "description", content: "Limites por categoria com alertas em 90% e acima de 100%." },
      { property: "og:title", content: "Orçamentos — Patrimo" },
      { property: "og:description", content: "Limites por categoria com alertas em 90% e acima de 100%." },
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
      setError("Não foi possível salvar. Talvez já exista um orçamento para essa categoria.");
      return;
    }
    await refresh();
    toast.success("Orçamento definido.");
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
    toast.success("Limite atualizado.");
    setEditing(null);
    setEditError(null);
  }

  async function remove() {
    if (!removing) return;
    const { error: deleteError } = await supabase.from("budgets").delete().eq("id", removing.id);
    if (deleteError) {
      toast.error("Não foi possível excluir.");
      return;
    }
    await refresh();
    toast.success("Orçamento removido.");
    setRemoving(null);
  }

  async function copyPreviousMonth() {
    if (!data) return;
    const previous = shiftMonth(month, -1);
    const source = data.budgets.filter((budget) => budget.month.startsWith(previous));
    if (source.length === 0) {
      toast.info("Não há orçamentos no mês anterior para repetir.");
      return;
    }
    const existing = new Set(
      data.budgets.filter((b) => b.month.startsWith(month)).map((b) => b.category_id),
    );
    const rows = source
      .filter((budget) => !existing.has(budget.category_id))
      .map((budget) => ({
        user_id: data.userId,
        category_id: budget.category_id,
        month: `${month}-01`,
        limit_amount: budget.limit_amount,
      }));
    if (rows.length === 0) {
      toast.info("Todos os limites do mês anterior já existem aqui.");
      return;
    }
    const { error: insertError } = await supabase.from("budgets").insert(rows);
    if (insertError) {
      toast.error("Não foi possível repetir os limites.");
      return;
    }
    await refresh();
    toast.success("Limites do mês anterior copiados.");
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Orçamentos">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const statuses = budgetStatus(data.budgets, data.categories, data.transactions, month);
  const usedCategories = new Set(
    data.budgets.filter((b) => b.month.startsWith(month)).map((b) => b.category_id),
  );

  return (
    <AppShell
      title="Orçamentos"
      description="Limite de gasto por categoria, mês a mês"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyPreviousMonth()}>
            <Copy className="mr-1.5 h-4 w-4" />
            Repetir mês anterior
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Novo orçamento — {formatMonthLabel(parseISODate(`${month}-01`))}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.categories
                        .filter(
                          (category) =>
                            category.kind === "despesa" && !usedCategories.has(category.id),
                        )
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Limite do mês</Label>
                  <CurrencyInput value={limit} onValueChange={setLimit} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button onClick={() => void create()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-display text-base font-semibold capitalize">
          {formatMonthLabel(parseISODate(`${month}-01`))}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Mês seguinte"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {statuses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum orçamento definido para este mês.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {statuses.map((status) => (
            <Card key={status.budget.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{status.category?.name ?? "Categoria"}</span>
                  <div className="flex items-center gap-1">
                    {status.level !== "ok" && (
                      <span
                        className={
                          status.level === "excedido"
                            ? "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                            : "inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground"
                        }
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {status.level === "excedido" ? "Limite excedido" : "Perto do limite"}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar limite"
                      onClick={() => {
                        setEditing(status.budget);
                        setEditLimit(status.budget.limit_amount);
                        setEditError(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover orçamento"
                      onClick={() => setRemoving(status.budget)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Progress value={Math.min(status.usage, 100)} />
                <div className="flex justify-between text-sm">
                  <span className="tabular">{formatBRL(status.spent)}</span>
                  <span className="tabular text-muted-foreground">
                    de {formatBRL(status.budget.limit_amount)} ({status.usage.toFixed(0)}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar limite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Novo limite do mês</Label>
              <CurrencyInput value={editLimit} onValueChange={setEditLimit} />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void saveEdit()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O limite deste mês deixa de existir e os alertas param. Seus gastos continuam
              registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
