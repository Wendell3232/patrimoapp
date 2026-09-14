import { useMemo, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Edit2,
  Filter,
  MoreVertical,
  Plus,
  Repeat,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { QuickActions } from "@/components/app/QuickActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Transaction } from "@/lib/finance";
import { formatBRL, formatDate, formatDayMonth, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações — Patrimo" },
      {
        name: "description",
        content: "Consulte, edite, filtre e entenda todas as suas entradas e saídas financeiras.",
      },
      { property: "og:title", content: "Movimentações — Patrimo" },
      {
        property: "og:description",
        content: "Consulte, edite, filtre e entenda todas as suas entradas e saídas financeiras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    busca: typeof search.busca === "string" ? search.busca : undefined,
    categoria: typeof search.categoria === "string" ? search.categoria : undefined,
  }),
  component: Movimentacoes,
});

type QuickFilter =
  | "todos"
  | "este_mes"
  | "ultimos_30"
  | "ultimos_3m"
  | "maiores_gastos"
  | "sem_categoria"
  | "cartao"
  | "futuras"
  | "recorrentes";

function Movimentacoes() {
  const searchParams = useSearch({ from: "/_authenticated/movimentacoes" });
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [term, setTerm] = useState(() => searchParams.busca ?? "");
  const [kind, setKind] = useState("todos");
  const [accountId, setAccountId] = useState("todas");
  const [categoryId, setCategoryId] = useState(() => searchParams.categoria ?? "todas");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("este_mes");

  const [start, setStart] = useState(() => {
    const today = new Date();
    return toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [end, setEnd] = useState(() => toISODate(new Date()));

  // Estados de modais de ação por item
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editPaid, setEditPaid] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteOption, setDeleteOption] = useState<"single" | "all">("single");

  const [viewingInstallments, setViewingInstallments] = useState<Transaction | null>(null);

  // Manipulador dos filtros de um toque
  function applyQuickFilter(filter: QuickFilter) {
    setQuickFilter(filter);
    const today = new Date();

    if (filter === "este_mes") {
      setStart(toISODate(new Date(today.getFullYear(), today.getMonth(), 1)));
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setEnd(toISODate(lastDay));
      setKind("todos");
      setCategoryId("todas");
    } else if (filter === "ultimos_30") {
      const past30 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      setStart(toISODate(past30));
      setEnd(toISODate(today));
      setKind("todos");
      setCategoryId("todas");
    } else if (filter === "ultimos_3m") {
      const past3m = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setStart(toISODate(past3m));
      setEnd(toISODate(today));
      setKind("todos");
      setCategoryId("todas");
    } else if (filter === "maiores_gastos") {
      setKind("despesa");
      setStart(toISODate(new Date(today.getFullYear(), today.getMonth() - 2, 1)));
      setEnd(toISODate(today));
    } else if (filter === "sem_categoria") {
      setCategoryId("todas");
    } else if (filter === "cartao") {
      setKind("despesa");
    } else if (filter === "futuras") {
      const futureEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      setStart(toISODate(today));
      setEnd(toISODate(futureEnd));
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    let list = data.transactions.filter((tx) => {
      // Filtros rápidos específicos
      if (quickFilter === "sem_categoria" && tx.category_id !== null) return false;
      if (quickFilter === "cartao" && !tx.credit_card_id) return false;
      if (quickFilter === "futuras" && tx.paid && tx.occurred_on <= toISODate(new Date())) return false;
      if (quickFilter === "recorrentes" && !tx.installment_group && !tx.notes?.includes("recorrente"))
        return false;

      // Filtros gerais
      if (tx.occurred_on < start || tx.occurred_on > end) return false;
      if (kind !== "todos" && tx.kind !== kind) return false;
      if (accountId !== "todas" && tx.account_id !== accountId && tx.to_account_id !== accountId)
        return false;
      if (categoryId !== "todas" && tx.category_id !== categoryId) return false;
      if (term && !tx.description.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });

    if (quickFilter === "maiores_gastos") {
      list = [...list].sort((a, b) => Number(b.amount) - Number(a.amount));
    } else {
      list = [...list].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
    }

    return list;
  }, [data, start, end, kind, accountId, categoryId, term, quickFilter]);

  // Ação: Editar
  function openEdit(tx: Transaction) {
    setEditing(tx);
    setEditDesc(tx.description);
    setEditAmount(Number(tx.amount));
    setEditDate(tx.occurred_on);
    setEditCategory(tx.category_id ?? "");
    setEditAccount(tx.account_id ?? "");
    setEditPaid(tx.paid);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editDesc.trim()) {
      setEditError("Informe uma descrição.");
      return;
    }
    if (editAmount == null || editAmount <= 0) {
      setEditError("Informe um valor maior que R$ 0,00.");
      return;
    }
    if (!editDate) {
      setEditError("Informe a data.");
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        description: editDesc.trim(),
        amount: editAmount,
        occurred_on: editDate,
        category_id: editCategory || null,
        account_id: editAccount || null,
        paid: editPaid,
      })
      .eq("id", editing.id);

    if (error) {
      setEditError("Não foi possível salvar as alterações.");
      return;
    }

    await refresh();
    toast.success("Movimentação atualizada com sucesso.");
    setEditing(null);
  }

  // Ação: Duplicar
  async function duplicate(tx: Transaction) {
    if (!data) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: data.userId,
      description: `${tx.description} (cópia)`,
      amount: tx.amount,
      kind: tx.kind,
      occurred_on: toISODate(new Date()),
      category_id: tx.category_id,
      account_id: tx.account_id,
      to_account_id: tx.to_account_id,
      credit_card_id: tx.credit_card_id,
      paid: true,
    });

    if (error) {
      toast.error("Não foi possível duplicar a movimentação.");
      return;
    }

    await refresh();
    toast.success("Movimentação duplicada para hoje.");
  }

  // Ação: Marcar como pago
  async function markAsPaid(tx: Transaction) {
    const { error } = await supabase
      .from("transactions")
      .update({ paid: true })
      .eq("id", tx.id);

    if (error) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }

    await refresh();
    toast.success("Movimentação confirmada como paga!");
  }

  // Ação: Excluir com confirmação
  async function confirmDelete() {
    if (!deleting) return;

    if (deleteOption === "all" && deleting.installment_group) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("installment_group", deleting.installment_group);

      if (error) {
        toast.error("Não foi possível excluir as parcelas.");
        return;
      }
      toast.success("Todas as parcelas foram excluídas.");
    } else {
      const { error } = await supabase.from("transactions").delete().eq("id", deleting.id);
      if (error) {
        toast.error("Não foi possível excluir.");
        return;
      }
      toast.success("Movimentação excluída.");
    }

    await refresh();
    setDeleting(null);
  }

  // Obter parcelas relacionadas
  const installmentsGroupList = useMemo(() => {
    if (!viewingInstallments || !viewingInstallments.installment_group || !data) return [];
    return data.transactions
      .filter((t) => t.installment_group === viewingInstallments.installment_group)
      .sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0));
  }, [viewingInstallments, data]);

  if (isLoading || !data) {
    return (
      <AppShell title="Movimentações">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const total = rows.reduce(
    (acc, tx) => {
      if (tx.kind === "receita") acc.income += Number(tx.amount);
      if (tx.kind === "despesa" && !tx.is_invoice_payment) acc.expense += Number(tx.amount);
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <AppShell
      title="Movimentações"
      description="Consulte, filtre e organize suas entradas e saídas com facilidade"
    >
      <div className="space-y-6">
        {/* Ações Rápidas no topo */}
        <QuickActions />

        {/* FILTROS RÁPIDOS DE UM TOQUE (CHIPS) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </span>
          {[
            { id: "este_mes", label: "Este mês" },
            { id: "ultimos_30", label: "Últimos 30 dias" },
            { id: "ultimos_3m", label: "Últimos 3 meses" },
            { id: "maiores_gastos", label: "Maiores gastos" },
            { id: "sem_categoria", label: "Sem categoria" },
            { id: "cartao", label: "Compras no cartão" },
            { id: "futuras", label: "Contas futuras" },
            { id: "recorrentes", label: "Recorrentes" },
          ].map((chip) => {
            const active = quickFilter === chip.id;
            return (
              <Button
                key={chip.id}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                className="h-8 rounded-full text-xs font-medium"
                onClick={() => applyQuickFilter(chip.id as QuickFilter)}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>

        {/* BARRA DE PESQUISA E FILTROS DETALHADOS */}
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="busca" className="text-xs">Buscar descrição</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca"
                  className="pl-9 h-9 text-sm"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Supermercado, Aluguel, Salário..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="receita">Entradas</SelectItem>
                  <SelectItem value="despesa">Saídas</SelectItem>
                  <SelectItem value="transferencia">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Conta / Cartão</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as contas</SelectItem>
                  {data.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 text-sm">
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
          </CardContent>
        </Card>

        {/* RESUMO DOS FILTROS APLICADOS */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
          <div className="text-muted-foreground text-xs">
            Exibindo <strong>{rows.length}</strong> {rows.length === 1 ? "movimentação" : "movimentações"}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-positive">Entradas: {formatBRL(total.income)}</span>
            <span className="text-destructive">Saídas: {formatBRL(total.expense)}</span>
            <span className={total.income - total.expense >= 0 ? "text-positive" : "text-destructive"}>
              Sobrou: {formatBRL(total.income - total.expense)}
            </span>
          </div>
        </div>

        {/* LISTA DE MOVIMENTAÇÕES COM MENU DE AÇÕES */}
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhuma movimentação encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((tx) => {
                  const category = data.categories.find((c) => c.id === tx.category_id);
                  const account = data.accounts.find((a) => a.id === tx.account_id);
                  const card = data.cards.find((c) => c.id === tx.credit_card_id);
                  const isFuture = !tx.paid || tx.occurred_on > toISODate(new Date());

                  return (
                    <div
                      key={tx.id}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Lado Esquerdo: Ícone e Descrição */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            tx.kind === "receita"
                              ? "bg-positive/10 text-positive"
                              : tx.kind === "despesa"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {tx.kind === "receita" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : tx.kind === "despesa" ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowLeftRight className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {tx.description || "Sem descrição"}
                            </span>
                            {/* Badges de Parcelas e Status */}
                            {tx.installment_total && (
                              <Badge
                                variant="outline"
                                className="cursor-pointer text-[10px] border-primary/40 bg-primary/5 text-primary"
                                onClick={() => setViewingInstallments(tx)}
                                title="Ver todas as parcelas"
                              >
                                {tx.installment_number}/{tx.installment_total}
                              </Badge>
                            )}
                            {isFuture && (
                              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
                                <Clock className="mr-1 h-2.5 w-2.5" /> Previsto
                              </Badge>
                            )}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{formatDate(tx.occurred_on)}</span>
                            <span>•</span>
                            <span>{category?.name ?? "Sem categoria"}</span>
                            <span>•</span>
                            <span>{card ? card.name : account?.name ?? "Conta principal"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Valor e Menu de Ações */}
                      <div className="flex items-center justify-between gap-3 self-end sm:self-center">
                        <span
                          className={`tabular text-base font-bold ${
                            tx.kind === "receita"
                              ? "text-positive"
                              : tx.kind === "despesa"
                                ? "text-destructive"
                                : "text-foreground"
                          }`}
                        >
                          {tx.kind === "despesa" ? "- " : tx.kind === "receita" ? "+ " : ""}
                          {formatBRL(tx.amount)}
                        </span>

                        {/* Menu de Ações por Item */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Ações da movimentação"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(tx)} className="cursor-pointer font-medium">
                              <Edit2 className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => duplicate(tx)} className="cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>

                            {isFuture && (
                              <DropdownMenuItem onClick={() => markAsPaid(tx)} className="cursor-pointer text-positive">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como pago
                              </DropdownMenuItem>
                            )}

                            {tx.installment_group && (
                              <DropdownMenuItem onClick={() => setViewingInstallments(tx)} className="cursor-pointer">
                                <Repeat className="mr-2 h-4 w-4" /> Ver parcelas
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                setDeleting(tx);
                                setDeleteOption("single");
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar movimentação</DialogTitle>
            <DialogDescription>
              Ajuste os dados da movimentação com segurança. O saldo será atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Descrição</Label>
                <Input
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Ex: Compra de supermercado"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Valor (R$)</Label>
                <CurrencyInput
                  id="edit-amount"
                  value={editAmount}
                  onChange={setEditAmount}
                  placeholder="0,00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editPaid ? "pago" : "pendente"}
                    onValueChange={(val) => setEditPaid(val === "pago")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago / Recebido</SelectItem>
                      <SelectItem value="pendente">Previsto / Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories
                      .filter((c) =>
                        editing.kind === "receita" ? c.kind === "receita" : c.kind === "despesa",
                      )
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Conta associada</Label>
                <Select value={editAccount} onValueChange={setEditAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editError && (
                <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
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

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir movimentação?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                Ela deixará de aparecer no seu saldo, nos relatórios e nos orçamentos. Esta ação não pode ser desfeita.
              </p>
              {deleting?.installment_group && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Atenção: Esta compra é parcelada ({deleting.installment_number}/{deleting.installment_total}).
                  </p>
                  <p className="mt-1">
                    Você pode optar por excluir somente esta parcela ou todas as parcelas deste grupo.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={deleteOption === "single" ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => setDeleteOption("single")}
                    >
                      Apenas esta parcela
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={deleteOption === "all" ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => setDeleteOption("all")}
                    >
                      Todas as parcelas
                    </Button>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE VISUALIZAÇÃO DE PARCELAS */}
      <Dialog
        open={viewingInstallments !== null}
        onOpenChange={(open) => !open && setViewingInstallments(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Parcelas da compra: {viewingInstallments?.description}
            </DialogTitle>
            <DialogDescription>
              Acompanhe todas as parcelas geradas no cartão para esta compra.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 space-y-2 overflow-y-auto py-2">
            {installmentsGroupList.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold">
                    Parcela {inst.installment_number} de {inst.installment_total}
                  </span>
                  <p className="text-muted-foreground">{formatDate(inst.occurred_on)}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-destructive">
                    {formatBRL(inst.amount)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {inst.paid ? "Paga" : "Prevista"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setViewingInstallments(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
