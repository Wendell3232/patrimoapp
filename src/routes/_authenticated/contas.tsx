import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Archive,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  Info,
  Pencil,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { QuickActions } from "@/components/app/QuickActions";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import {
  ACCOUNT_TYPE_LABEL,
  accountAvailability,
  accountBalance,
  type Account,
  type AccountType,
  type Transaction,
} from "@/lib/finance";
import { formatBRL, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({
    meta: [
      { title: "Contas — Patrimo" },
      {
        name: "description",
        content: "Saldos reais, valores comprometidos e saldo disponível de verdade em cada conta.",
      },
      { property: "og:title", content: "Contas — Patrimo" },
      {
        property: "og:description",
        content: "Saldos reais, valores comprometidos e saldo disponível de verdade em cada conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contas,
});

function Contas() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("corrente");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("corrente");
  const [editInstitution, setEditInstitution] = useState("");
  const [editBalance, setEditBalance] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [archiving, setArchiving] = useState<Account | null>(null);
  const [viewingHistoryAccount, setViewingHistoryAccount] = useState<Account | null>(null);

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      setEditError("Informe o nome da conta.");
      return;
    }
    if (editBalance == null) {
      setEditError("Informe o saldo inicial.");
      return;
    }
    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        name: editName.trim(),
        type: editType,
        institution: editInstitution.trim() || null,
        opening_balance: editBalance,
      })
      .eq("id", editing.id);

    if (updateError) {
      setEditError("Não foi possível salvar as alterações.");
      return;
    }
    await refresh();
    toast.success("Conta atualizada com sucesso.");
    setEditing(null);
    setEditError(null);
  }

  async function archive() {
    if (!archiving) return;
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ archived: true })
      .eq("id", archiving.id);

    if (updateError) {
      toast.error("Não foi possível arquivar a conta.");
      return;
    }
    await refresh();
    toast.success("Conta arquivada. O histórico continua guardado com segurança.");
    setArchiving(null);
  }

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      setError("Informe o nome da conta.");
      return;
    }
    if (balance == null) {
      setError("Informe o saldo atual. Use R$ 0,00 se estiver vazio.");
      return;
    }
    const { error: insertError } = await supabase.from("accounts").insert({
      user_id: data.userId,
      name: name.trim(),
      type,
      institution: institution.trim() || null,
      opening_balance: balance,
    });
    if (insertError) {
      setError("Não foi possível cadastrar a conta.");
      return;
    }
    await refresh();
    toast.success("Conta cadastrada com sucesso.");
    setName("");
    setInstitution("");
    setBalance(null);
    setError(null);
    setOpen(false);
  }

  // Obter movimentações da conta em visualização de histórico
  const accountHistory = useMemo(() => {
    if (!viewingHistoryAccount || !data) return [];
    const accId = viewingHistoryAccount.id;
    return data.transactions
      .filter((t) => t.account_id === accId || t.to_account_id === accId)
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  }, [viewingHistoryAccount, data]);

  if (isLoading || !data) {
    return (
      <AppShell title="Contas">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const activeAccounts = data.accounts.filter((a) => !a.archived);
  const totalBalance = activeAccounts.reduce(
    (sum, a) => sum + accountBalance(a, data.transactions),
    0,
  );

  return (
    <AppShell
      title="Contas"
      actions={
        <div className="flex items-center gap-2">
          <QuickActions compact />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Nova conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar nova conta</DialogTitle>
                <DialogDescription>
                  Cadastre uma conta corrente, poupança, dinheiro em espécie ou investimento.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name">Nome da conta</Label>
                  <Input
                    id="acc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Reserva em Poupança"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo da conta</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro em espécie</SelectItem>
                      <SelectItem value="investimentos">Investimentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-inst">Instituição (opcional)</Label>
                  <Input
                    id="acc-inst"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Nubank, Caixa, Bradesco"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-balance">Saldo atual (R$)</Label>
                  <CurrencyInput
                    id="acc-balance"
                    value={balance}
                    onValueChange={setBalance}
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
                  Salvar conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {/* BANNER EXPLICATIVO ACOLHEDOR */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-primary">Saldo disponível de verdade</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              É o dinheiro que sobra nas suas contas depois de considerar os pagamentos, contas futuras e faturas de cartão que já estão previstos para os próximos 30 dias.
            </p>
          </div>
        </div>

        {/* CARDS DAS CONTAS */}
        <TooltipProvider delayDuration={100}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeAccounts.map((account) => {
            const avail = accountAvailability(
              account,
              data.transactions,
              data.commitments,
              data.cards,
              30,
            );

            // Informações de atividade recente
            const txsOfAccount = data.transactions.filter(
              (t) => t.account_id === account.id || t.to_account_id === account.id,
            );
            const sortedTxs = [...txsOfAccount].sort((a, b) =>
              b.occurred_on.localeCompare(a.occurred_on),
            );
            const lastTx = sortedTxs[0];
            const recentCount = txsOfAccount.filter(
              (t) =>
                t.occurred_on >=
                toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
            ).length;

            return (
              <Card
                key={account.id}
                className="flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base font-bold">
                        {account.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {account.institution ? `${account.institution} • ` : ""}
                        {ACCOUNT_TYPE_LABEL[account.type]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Editar conta"
                        onClick={() => {
                          setEditing(account);
                          setEditName(account.name);
                          setEditType(account.type);
                          setEditInstitution(account.institution ?? "");
                          setEditBalance(account.opening_balance);
                          setEditError(null);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Arquivar conta"
                        onClick={() => setArchiving(account)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Métricas de Saldo */}
                  <div className="rounded-lg bg-accent/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Saldo atual registrado:</span>
                      <span className="font-semibold text-foreground tabular">
                        {formatBRL(avail.currentBalance)}
                      </span>
                    </div>

                    {avail.committedAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-border">
                              Comprometido (30 dias):
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start">
                            Pagamentos, contas e faturas de cartão já previstos para sair desta conta nos próximos 30 dias.
                          </TooltipContent>
                        </Tooltip>
                        <span className="font-medium text-destructive tabular">
                          - {formatBRL(avail.committedAmount)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-border/60 pt-1.5 flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-semibold text-foreground cursor-help border-b border-dotted border-border">
                            Disponível de verdade:
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                          Saldo atual menos os valores comprometidos: é o quanto você pode usar sem comprometer seus pagamentos dos próximos 30 dias.
                        </TooltipContent>
                      </Tooltip>
                      <span
                        className={`text-base font-bold tabular ${
                          avail.availableBalance >= 0 ? "text-positive" : "text-destructive"
                        }`}
                      >
                        {formatBRL(avail.availableBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Informações de Atividade */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {lastTx
                        ? `Última movimentação em ${formatDate(lastTx.occurred_on)}`
                        : "Sem movimentações registradas"}
                    </p>
                    <p className="text-[11px]">
                      {recentCount} {recentCount === 1 ? "movimentação" : "movimentações"} nos últimos 30 dias
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setViewingHistoryAccount(account)}
                  >
                    <History className="mr-1.5 h-3.5 w-3.5" /> Ver histórico detalhado
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </TooltipProvider>
      </div>

      {/* DIALOG: HISTÓRICO DETALHADO DA CONTA COM TRATAMENTO ESPECIAL PARA TRANSFERÊNCIAS */}
      <Dialog
        open={viewingHistoryAccount !== null}
        onOpenChange={(open) => !open && setViewingHistoryAccount(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Histórico: {viewingHistoryAccount?.name}
            </DialogTitle>
            <DialogDescription>
              Todas as movimentações e transferências que passaram por esta conta.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-2 overflow-y-auto py-2 pr-1">
            {accountHistory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada nesta conta até o momento.
              </p>
            ) : (
              accountHistory.map((tx) => {
                const isTransfer = tx.kind === "transferencia";
                const isTransferSent = isTransfer && tx.account_id === viewingHistoryAccount?.id;
                const isTransferReceived = isTransfer && tx.to_account_id === viewingHistoryAccount?.id;

                const otherAccount = isTransferSent
                  ? data.accounts.find((a) => a.id === tx.to_account_id)
                  : data.accounts.find((a) => a.id === tx.account_id);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">
                        {isTransferSent
                          ? `Transferência enviada para ${otherAccount?.name ?? "outra conta"}`
                          : isTransferReceived
                            ? `Transferência recebida de ${otherAccount?.name ?? "outra conta"}`
                            : tx.description}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {formatDate(tx.occurred_on)}
                        {isTransfer && (
                          <span className="ml-2 inline-flex items-center text-[10px] text-primary">
                            <ArrowLeftRight className="mr-0.5 h-3 w-3" /> Transferência interna (não afeta ganhos/gastos)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold text-sm tabular ${
                          isTransferSent
                            ? "text-muted-foreground"
                            : isTransferReceived
                              ? "text-positive"
                              : tx.kind === "receita"
                                ? "text-positive"
                                : "text-destructive"
                        }`}
                      >
                        {isTransferSent ? "- " : isTransferReceived ? "+ " : tx.kind === "despesa" ? "- " : "+ "}
                        {formatBRL(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setViewingHistoryAccount(null)}>Fechar histórico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE CONTA */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
            <DialogDescription>Ajuste os dados e o saldo inicial da sua conta.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-acc-name">Nome da conta</Label>
                <Input
                  id="edit-acc-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo da conta</Label>
                <Select value={editType} onValueChange={(v) => setEditType(v as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro em espécie</SelectItem>
                    <SelectItem value="investimentos">Investimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-acc-inst">Instituição</Label>
                <Input
                  id="edit-acc-inst"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-acc-bal">Saldo inicial (R$)</Label>
                <CurrencyInput
                  id="edit-acc-bal"
                  value={editBalance}
                  onValueChange={setEditBalance}
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

      {/* MODAL DE ARQUIVAMENTO */}
      <AlertDialog open={archiving !== null} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar conta "{archiving?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta deixará de ser exibida nas listas ativas, mas todos os lançamentos e transferências passados continuarão preservados no seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiving(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void archive()}>
              Arquivar conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
