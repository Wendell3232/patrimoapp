import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { accountBalance, type Commitment } from "@/lib/finance";
import { formatBRL, formatDate, formatMonthLabel, monthKeyToday, parseISODate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compromissos")({
  head: () => ({
    meta: [
      { title: "Contas Futuras — Patrimo" },
      {
        name: "description",
        content: "Projeção dos próximos meses, saldo projetado e pagamentos previstos.",
      },
      { property: "og:title", content: "Contas Futuras — Patrimo" },
      {
        property: "og:description",
        content: "Projeção dos próximos meses, saldo projetado e pagamentos previstos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContasFuturas,
});

type Horizon = "30d" | "3m" | "6m" | "1y";

function ContasFuturas() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const navigate = useNavigate();

  const [horizon, setHorizon] = useState<Horizon>("3m");

  // Diálogo de confirmação de pagamento
  const [settling, setSettling] = useState<Commitment | null>(null);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);

  // Diálogo para criar novo compromisso
  const [openCreate, setOpenCreate] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState(() => toISODate(new Date()));
  const [newKind, setNewKind] = useState<"despesa" | "receita">("despesa");
  const [newCategory, setNewCategory] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const now = new Date();
  const todayISO = toISODate(now);

  // Define data limite conforme o horizonte escolhido
  const horizonLimitDate = useMemo(() => {
    const d = new Date(now);
    if (horizon === "30d") d.setDate(d.getDate() + 30);
    else if (horizon === "3m") d.setMonth(d.getMonth() + 3);
    else if (horizon === "6m") d.setMonth(d.getMonth() + 6);
    else if (horizon === "1y") d.setFullYear(d.getFullYear() + 1);
    return toISODate(d);
  }, [horizon, now]);

  const viewData = useMemo(() => {
    if (!data) return null;

    const currentTotalBalance = data.accounts
      .filter((a) => !a.archived)
      .reduce((sum, a) => sum + accountBalance(a, data.transactions), 0);

    const pending = data.commitments.filter(
      (c) => c.status === "pendente" && c.due_date >= todayISO && c.due_date <= horizonLimitDate,
    );

    // Contas que vencem nos próximos 7 dias
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysISO = toISODate(next7Days);
    const dueIn7Days = pending.filter((c) => c.due_date <= next7DaysISO);

    // Agrupamento por mês
    const grouped = new Map<string, Commitment[]>();
    for (const item of pending) {
      const key = item.due_date.slice(0, 7);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    let totalPredictedIncome = 0;
    let totalPredictedExpense = 0;
    let maxExpenseMonth = { month: "", label: "", amount: 0 };

    let cumulativeBalance = currentTotalBalance;
    const monthsData = [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, items]) => {
        const receitas = items
          .filter((i) => i.kind === "receita")
          .reduce((s, i) => s + Number(i.amount), 0);
        const despesas = items
          .filter((i) => i.kind === "despesa")
          .reduce((s, i) => s + Number(i.amount), 0);

        totalPredictedIncome += receitas;
        totalPredictedExpense += despesas;

        if (despesas > maxExpenseMonth.amount) {
          maxExpenseMonth = {
            month: monthKey,
            label: formatMonthLabel(parseISODate(`${monthKey}-01`)),
            amount: despesas,
          };
        }

        const monthResult = receitas - despesas;
        cumulativeBalance += monthResult;

        return {
          month: monthKey,
          label: formatMonthLabel(parseISODate(`${monthKey}-01`)),
          receitas,
          despesas,
          monthResult,
          projectedCumulative: cumulativeBalance,
          isNegative: cumulativeBalance < 0,
          isLow: cumulativeBalance >= 0 && cumulativeBalance < 300,
          items: items.sort((a, b) => a.due_date.localeCompare(b.due_date)),
        };
      });

    const projectedFinalBalance = currentTotalBalance + totalPredictedIncome - totalPredictedExpense;

    return {
      currentTotalBalance,
      totalPredictedIncome,
      totalPredictedExpense,
      projectedFinalBalance,
      dueIn7Days,
      maxExpenseMonth,
      monthsData,
    };
  }, [data, todayISO, horizonLimitDate, now]);

  function startSettling(commitment: Commitment) {
    if (!data) return;
    if (commitment.credit_card_id) {
      toast.info("Este valor faz parte da fatura do cartão. Pague a fatura para liquidar este compromisso.");
      navigate({ to: "/cartoes" });
      return;
    }
    setSettling(commitment);
    setAccountId(
      commitment.account_id ??
        data.accounts.find((a) => a.type === "corrente")?.id ??
        data.accounts[0]?.id ??
        "",
    );
    setDate(toISODate(new Date()));
    setError(null);
  }

  async function confirmSettling() {
    if (!data || !settling) return;
    if (!accountId) {
      setError("Escolha a conta bancária para o débito.");
      return;
    }
    if (!date) {
      setError("Informe a data do pagamento.");
      return;
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: data.userId,
      kind: settling.kind,
      amount: settling.amount,
      occurred_on: date,
      description: settling.description,
      account_id: accountId,
      category_id: settling.category_id,
      paid: true,
    });

    if (insertError) {
      setError("Não foi possível registrar a movimentação.");
      return;
    }

    const { error: updateError } = await supabase
      .from("commitments")
      .update({ status: "pago" })
      .eq("id", settling.id);

    if (updateError) {
      setError("A movimentação foi criada, mas não foi possível atualizar o compromisso.");
      return;
    }

    await refresh();
    toast.success(
      settling.kind === "receita"
        ? "Recebimento confirmado e saldo atualizado!"
        : "Pagamento confirmado e saldo debitado com sucesso!",
    );
    setSettling(null);
  }

  async function createCommitment() {
    if (!data) return;
    if (!newDesc.trim()) {
      setCreateError("Informe uma descrição.");
      return;
    }
    if (newAmount == null || newAmount <= 0) {
      setCreateError("Informe um valor maior que R$ 0,00.");
      return;
    }
    if (!newDueDate) {
      setCreateError("Informe a data de vencimento.");
      return;
    }

    const { error: insertError } = await supabase.from("commitments").insert({
      user_id: data.userId,
      description: newDesc.trim(),
      amount: newAmount,
      due_date: newDueDate,
      kind: newKind,
      status: "pendente",
      category_id: newCategory || null,
      account_id: newAccount || null,
    });

    if (insertError) {
      setCreateError("Não foi possível salvar o compromisso.");
      return;
    }

    await refresh();
    toast.success("Conta futura cadastrada.");
    setNewDesc("");
    setNewAmount(null);
    setNewDueDate(toISODate(new Date()));
    setNewCategory("");
    setNewAccount("");
    setCreateError(null);
    setOpenCreate(false);
  }

  if (isLoading || !data || !viewData) {
    return (
      <AppShell title="Contas futuras">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const selectedAccountObj = data.accounts.find((a) => a.id === accountId);
  const selectedAccountBal = selectedAccountObj
    ? accountBalance(selectedAccountObj, data.transactions)
    : 0;
  const afterSettlingBal = selectedAccountBal - (settling ? Number(settling.amount) : 0);

  return (
    <AppShell
      title="Contas futuras"
      actions={
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Novo compromisso futuro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agendar conta futura</DialogTitle>
              <DialogDescription>
                Registre um pagamento ou recebimento previsto para os próximos meses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-desc">Descrição</Label>
                <Input
                  id="c-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: IPVA, Matrícula escolar, Seguro do carro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={newKind} onValueChange={(v) => setNewKind(v as "despesa" | "receita")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Conta a pagar</SelectItem>
                      <SelectItem value="receita">Valor a receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-val">Valor (R$)</Label>
                  <CurrencyInput
                    id="c-val"
                    value={newAmount}
                    onValueChange={setNewAmount}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-due">Data de vencimento prevista</Label>
                <Input
                  id="c-due"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Categoria (opcional)</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories
                      .filter((c) => c.kind === newKind)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Conta provável de débito (opcional)</Label>
                <Select value={newAccount} onValueChange={setNewAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.accounts
                      .filter((a) => !a.archived)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {createError && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {createError}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void createCommitment()}>
                Agendar conta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* SELETOR DE HORIZONTE */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">
            {[
              { id: "30d", label: "Próximos 30 dias" },
              { id: "3m", label: "Próximos 3 meses" },
              { id: "6m", label: "Próximos 6 meses" },
              { id: "1y", label: "Próximo ano" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={horizon === tab.id ? "default" : "ghost"}
                size="sm"
                className="h-7 rounded-md text-xs font-medium"
                onClick={() => setHorizon(tab.id as Horizon)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {viewData.dueIn7Days.length > 0 && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs py-1">
              <Clock className="mr-1 h-3.5 w-3.5" />
              {viewData.dueIn7Days.length} {viewData.dueIn7Days.length === 1 ? "conta vence" : "contas vencem"} nos próximos 7 dias
            </Badge>
          )}
        </div>

        {/* RESUMO SUPERIOR COM SALDO PROJETADO */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-positive/30 bg-positive/5 p-3 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Entradas previstas
            </span>
            <p className="mt-1 text-xl font-bold tabular text-positive">
              + {formatBRL(viewData.totalPredictedIncome)}
            </p>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saídas previstas
            </span>
            <p className="mt-1 text-xl font-bold tabular text-destructive">
              - {formatBRL(viewData.totalPredictedExpense)}
            </p>
          </div>

          <div
            className={`rounded-xl border p-3 shadow-xs ${
              viewData.projectedFinalBalance < 0
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-card"
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saldo projetado final
            </span>
            <p className="mt-1 text-xl font-bold tabular text-foreground">
              {formatBRL(viewData.projectedFinalBalance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Saldo atual ({formatBRL(viewData.currentTotalBalance)}) + entradas - saídas
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mês com maior volume
            </span>
            <p className="mt-1 text-sm font-bold text-foreground truncate">
              {viewData.maxExpenseMonth.label || "Nenhum no período"}
            </p>
            <p className="text-[11px] text-destructive font-medium mt-0.5">
              {viewData.maxExpenseMonth.amount > 0 ? formatBRL(viewData.maxExpenseMonth.amount) : "R$ 0,00"}
            </p>
          </div>
        </div>

        {/* LISTAGEM POR MÊS */}
        {viewData.monthsData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma conta futura ou parcela prevista para o período selecionado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {viewData.monthsData.map((group) => {
              return (
                <Card
                  key={group.month}
                  className={`overflow-hidden border transition-all ${
                    group.isNegative
                      ? "border-destructive/50 bg-destructive/5"
                      : group.isLow
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border"
                  }`}
                >
                  <CardHeader className="bg-accent/20 pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-bold capitalize">
                          {group.label}
                        </CardTitle>
                        {group.isNegative && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Saldo projetado negativo!
                          </Badge>
                        )}
                        {group.isLow && !group.isNegative && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
                            <AlertCircle className="mr-1 h-3 w-3" /> Saldo projetado baixo
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 text-xs">
                        <span className="text-positive font-semibold">
                          Entradas: {formatBRL(group.receitas)}
                        </span>
                        <span className="text-destructive font-semibold">
                          Saídas: {formatBRL(group.despesas)}
                        </span>
                        <span className="font-semibold text-foreground border-l border-border pl-3">
                          Saldo projetado ao fim do mês: {formatBRL(group.projectedCumulative)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {group.items.map((item) => {
                        const isCard = Boolean(item.credit_card_id);
                        const card = isCard ? data.cards.find((c) => c.id === item.credit_card_id) : null;
                        const category = data.categories.find((c) => c.id === item.category_id);

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isCard
                                    ? "bg-primary/10 text-primary"
                                    : item.kind === "receita"
                                      ? "bg-positive/10 text-positive"
                                      : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {isCard ? (
                                  <CreditCard className="h-4 w-4" />
                                ) : item.kind === "receita" ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {item.description}
                                  </span>
                                  {isCard && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Fatura {card?.name}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Vence em: {formatDate(item.due_date)}
                                  {category ? ` • ${category.name}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 self-end sm:self-center">
                              <span
                                className={`tabular font-bold text-sm ${
                                  item.kind === "receita" ? "text-positive" : "text-destructive"
                                }`}
                              >
                                {item.kind === "despesa" ? "- " : "+ "}
                                {formatBRL(item.amount)}
                              </span>

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium"
                                onClick={() => startSettling(item)}
                              >
                                Confirmar pagamento de {formatBRL(item.amount)}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: CONFIRMAR PAGAMENTO COM ESCOLHA DE CONTA E IMPACTO NO SALDO */}
      <Dialog open={settling !== null} onOpenChange={(o) => !o && setSettling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              "{settling?.description}" — <strong>{formatBRL(settling?.amount ?? 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          {settling && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Conta bancária para debitar o valor</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.accounts
                      .filter((a) => !a.archived)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} (Saldo atual: {formatBRL(accountBalance(a, data.transactions))})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prévia do Impacto no Saldo */}
              {selectedAccountObj && (
                <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo atual na conta:</span>
                    <span className="font-semibold tabular">{formatBRL(selectedAccountBal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor deste pagamento:</span>
                    <span className="font-semibold text-destructive tabular">
                      - {formatBRL(settling.amount)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-1 flex justify-between">
                    <span className="font-semibold text-foreground">Saldo após confirmação:</span>
                    <span
                      className={`font-bold tabular ${
                        afterSettlingBal >= 0 ? "text-positive" : "text-destructive"
                      }`}
                    >
                      {formatBRL(afterSettlingBal)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="settle-date">Data do pagamento</Label>
                <Input
                  id="settle-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSettling(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void confirmSettling()}>
              Confirmar e debitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
