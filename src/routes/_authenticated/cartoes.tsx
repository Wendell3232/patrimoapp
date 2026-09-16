import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard as CreditCardIcon,
  Info,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Wallet,
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
import { Input } from "@/components/ui/input";
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
import {
  accountBalance,
  cardAvailableLimit,
  cardInvoices,
  cardOpenInvoiceTotal,
  cardUsedLimit,
  type CardInvoice,
  type CreditCard,
  type Transaction,
} from "@/lib/finance";
import { formatBRL, formatDate, formatDayMonth, monthKeyToday, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões — Patrimo" },
      {
        name: "description",
        content: "Fatura atual, vencimentos, limite disponível e parcelas que virão nos seus cartões.",
      },
      { property: "og:title", content: "Cartões — Patrimo" },
      {
        property: "og:description",
        content: "Fatura atual, vencimentos, limite disponível e parcelas que virão nos seus cartões.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cartoes,
});

function Cartoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [closing, setClosing] = useState("28");
  const [due, setDue] = useState("5");
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editLimit, setEditLimit] = useState<number | null>(null);
  const [editClosing, setEditClosing] = useState("28");
  const [editDue, setEditDue] = useState("5");

  const [archiving, setArchiving] = useState<CreditCard | null>(null);

  // Pagamento de fatura
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payAccount, setPayAccount] = useState("");
  const [payDate, setPayDate] = useState(() => toISODate(new Date()));
  const [payError, setPayError] = useState<string | null>(null);

  // Detalhes da fatura
  const [viewingInvoice, setViewingInvoice] = useState<{
    card: CreditCard;
    invoice: CardInvoice;
  } | null>(null);

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      setError("Informe o nome do cartão.");
      return;
    }
    if (limit == null || limit <= 0) {
      setError("Informe o limite do cartão.");
      return;
    }
    const closingDay = Number(closing);
    const dueDay = Number(due);
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      setError("O dia de fechamento precisa estar entre 1 e 31.");
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError("O dia de vencimento precisa estar entre 1 e 31.");
      return;
    }
    const { error: insertError } = await supabase.from("credit_cards").insert({
      user_id: data.userId,
      name: name.trim(),
      brand: brand.trim() || null,
      limit_amount: limit,
      closing_day: closingDay,
      due_day: dueDay,
      payment_account_id: data.accounts.find((a) => a.type === "corrente")?.id ?? null,
    });
    if (insertError) {
      setError("Não foi possível cadastrar o cartão.");
      return;
    }
    await refresh();
    toast.success("Cartão cadastrado com sucesso.");
    setName("");
    setBrand("");
    setLimit(null);
    setError(null);
    setOpen(false);
  }

  function startEdit(card: CreditCard) {
    setEditing(card);
    setEditName(card.name);
    setEditBrand(card.brand ?? "");
    setEditLimit(card.limit_amount);
    setEditClosing(String(card.closing_day));
    setEditDue(String(card.due_day));
    setError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      setError("Informe o nome do cartão.");
      return;
    }
    if (editLimit == null || editLimit <= 0) {
      setError("Informe o limite do cartão.");
      return;
    }
    const closingDay = Number(editClosing);
    const dueDay = Number(editDue);
    const { error: updateError } = await supabase
      .from("credit_cards")
      .update({
        name: editName.trim(),
        brand: editBrand.trim() || null,
        limit_amount: editLimit,
        closing_day: closingDay,
        due_day: dueDay,
      })
      .eq("id", editing.id);

    if (updateError) {
      setError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Cartão atualizado.");
    setEditing(null);
  }

  async function archive() {
    if (!archiving) return;
    const { error: updateError } = await supabase
      .from("credit_cards")
      .update({ archived: true })
      .eq("id", archiving.id);

    if (updateError) {
      toast.error("Não foi possível arquivar o cartão.");
      return;
    }
    await refresh();
    toast.success("Cartão arquivado. Seu histórico foi preservado.");
    setArchiving(null);
  }

  function openPaymentDialog(card: CreditCard) {
    if (!data) return;
    const openAmount = cardOpenInvoiceTotal(card, data.transactions);
    setPayingCard(card);
    setPayAmount(openAmount > 0 ? openAmount : null);
    setPayAccount(
      card.payment_account_id ??
        data.accounts.find((a) => a.type === "corrente")?.id ??
        data.accounts[0]?.id ??
        "",
    );
    setPayDate(toISODate(new Date()));
    setPayError(null);
  }

  async function confirmPayment() {
    if (!data || !payingCard) return;
    if (payAmount == null || payAmount <= 0) {
      setPayError("Informe o valor do pagamento.");
      return;
    }
    if (!payAccount) {
      setPayError("Escolha a conta bancária de onde o valor sairá.");
      return;
    }
    if (!payDate) {
      setPayError("Informe a data do pagamento.");
      return;
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: data.userId,
      kind: "despesa",
      amount: payAmount,
      occurred_on: payDate,
      description: `Pagamento de fatura — ${payingCard.name}`,
      account_id: payAccount,
      credit_card_id: payingCard.id,
      is_invoice_payment: true,
      paid: true,
    });

    if (insertError) {
      setPayError("Não foi possível registrar o pagamento da fatura.");
      return;
    }

    await refresh();
    toast.success(`Fatura do ${payingCard.name} paga com sucesso! Limite liberado.`);
    setPayingCard(null);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Cartões">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const activeCards = data.cards.filter((c) => !c.archived);
  const now = new Date();
  const todayISO = toISODate(now);

  // Conta selecionada para pagamento e cálculo de impacto no saldo
  const selectedPayAccountObj = data.accounts.find((a) => a.id === payAccount);
  const currentPayAccountBal = selectedPayAccountObj
    ? accountBalance(selectedPayAccountObj, data.transactions)
    : 0;
  const afterPayAccountBal = currentPayAccountBal - (payAmount ?? 0);

  return (
    <AppShell
      title="Cartões"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Novo cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar cartão de crédito</DialogTitle>
              <DialogDescription>
                Informe o limite e os dias de fechamento e vencimento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="card-name">Nome do cartão</Label>
                <Input
                  id="card-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Roxinho, Itaú Black"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-brand">Bandeira (opcional)</Label>
                <Input
                  id="card-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Mastercard, Visa"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-limit">Limite total (R$)</Label>
                <CurrencyInput
                  id="card-limit"
                  value={limit}
                  onValueChange={setLimit}
                  placeholder="0,00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="card-closing">Dia do fechamento</Label>
                  <Input
                    id="card-closing"
                    type="number"
                    min={1}
                    max={31}
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="card-due">Dia do vencimento</Label>
                  <Input
                    id="card-due"
                    type="number"
                    min={1}
                    max={31}
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
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
                Salvar cartão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-8">
        {activeCards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Nenhum cartão cadastrado ainda. Clique em "Novo cartão" acima para começar!
            </CardContent>
          </Card>
        ) : (
          activeCards.map((card) => {
            const used = cardUsedLimit(card, data.transactions);
            const available = cardAvailableLimit(card, data.transactions);
            const openInvoice = cardOpenInvoiceTotal(card, data.transactions);
            const invoices = cardInvoices(card, data.transactions);
            const currentMonthKey = monthKeyToday();

            // Cálculo dos dias até o vencimento
            let dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
            if (toISODate(dueDate) < todayISO) {
              dueDate = new Date(now.getFullYear(), now.getMonth() + 1, card.due_day);
            }
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const usagePercent =
              card.limit_amount > 0
                ? Math.min(Math.round((used / card.limit_amount) * 100), 100)
                : 0;

            // Fatura atual e faturas futuras
            const currentInvoice = invoices.find((inv) => inv.month === currentMonthKey);
            const futureInvoices = invoices.filter((inv) => inv.month > currentMonthKey);

            return (
              <Card key={card.id} className="overflow-hidden border-border/80 shadow-sm">
                {/* CABEÇALHO DO CARTÃO COM LIMITES E VENCIMENTO */}
                <CardHeader className="bg-accent/20 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg font-bold">{card.name}</CardTitle>
                        {card.brand && (
                          <Badge variant="secondary" className="text-xs">
                            {card.brand}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1 text-xs">
                        Fechamento: dia {card.closing_day} • Vencimento: dia {card.due_day}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => startEdit(card)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Arquivar cartão"
                        onClick={() => setArchiving(card)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* CARDS COM TEXTOS DIRETOS */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {/* Fatura atual */}
                    <div className="rounded-xl border border-primary/20 bg-background/80 p-3 shadow-xs">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Fatura atual
                      </span>
                      <p className="mt-1 text-xl font-bold text-foreground tabular">
                        {formatBRL(openInvoice)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {daysLeft === 0
                          ? "Vence hoje!"
                          : daysLeft === 1
                            ? "Vence amanhã"
                            : `Vence em ${daysLeft} dias (${formatDate(toISODate(dueDate))})`}
                      </p>
                    </div>

                    {/* Quanto já foi usado */}
                    <div className="rounded-xl border border-border bg-background/80 p-3 shadow-xs">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Quanto já foi usado
                      </span>
                      <p className="mt-1 text-xl font-bold text-foreground tabular">
                        {formatBRL(used)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {usagePercent}% do limite total de {formatBRL(card.limit_amount)}
                      </p>
                    </div>

                    {/* Você ainda pode usar */}
                    <div className="rounded-xl border border-positive/20 bg-background/80 p-3 shadow-xs">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Você ainda pode usar
                      </span>
                      <p
                        className={`mt-1 text-xl font-bold tabular ${
                          available >= 0 ? "text-positive" : "text-destructive"
                        }`}
                      >
                        {formatBRL(available)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {available >= 0 ? "Limite disponível" : "Limite ultrapassado"}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progresso do Limite */}
                  <div className="mt-4 space-y-1">
                    <Progress value={usagePercent} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                  {/* AÇÃO PRINCIPAL: CONFIRMAR PAGAMENTO DA FATURA */}
                  <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Confirmar pagamento da fatura de {formatBRL(openInvoice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ao pagar, o valor é debitado da sua conta bancária e o limite do cartão é restaurado na hora.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openPaymentDialog(card)}
                      disabled={openInvoice <= 0}
                    >
                      Confirmar pagamento
                    </Button>
                  </div>

                  {/* PARCELAS QUE VIRÃO & FATURAS FUTURAS */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Parcelas que virão nos próximos meses
                    </h3>

                    {invoices.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Nenhuma compra registrada neste cartão.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {invoices.map((inv) => {
                          const isCurrent = inv.month === currentMonthKey;
                          return (
                            <div
                              key={inv.month}
                              className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                                isCurrent
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm capitalize">
                                    {inv.label}
                                  </span>
                                  {isCurrent && (
                                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                                      Fatura atual
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-2 text-lg font-bold tabular text-foreground">
                                  {formatBRL(inv.total)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.items.length} {inv.items.length === 1 ? "compra" : "compras"}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-3 w-full text-xs font-medium"
                                onClick={() => setViewingInvoice({ card, invoice: inv })}
                              >
                                <Receipt className="mr-1.5 h-3.5 w-3.5" /> Ver compras da fatura
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* DIALOG DE CONFIRMAR PAGAMENTO DA FATURA */}
      <Dialog open={payingCard !== null} onOpenChange={(o) => !o && setPayingCard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirmar pagamento da fatura — {payingCard?.name}
            </DialogTitle>
            <DialogDescription>
              Informe o valor e a conta bancária para debitar o pagamento.
            </DialogDescription>
          </DialogHeader>

          {payingCard && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Valor a pagar (R$)</Label>
                <CurrencyInput
                  id="pay-amount"
                  value={payAmount}
                  onValueChange={setPayAmount}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Conta bancária de débito</Label>
                <Select value={payAccount} onValueChange={setPayAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.accounts
                      .filter((a) => !a.archived)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} (Saldo: {formatBRL(accountBalance(account, data.transactions))})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Impacto no Saldo da Conta */}
              {selectedPayAccountObj && (
                <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo atual na conta:</span>
                    <span className="font-semibold tabular">{formatBRL(currentPayAccountBal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor a debitar:</span>
                    <span className="font-semibold text-destructive tabular">
                      - {formatBRL(payAmount ?? 0)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-1 flex justify-between">
                    <span className="font-semibold text-foreground">Saldo após pagamento:</span>
                    <span
                      className={`font-bold tabular ${
                        afterPayAccountBal >= 0 ? "text-positive" : "text-destructive"
                      }`}
                    >
                      {formatBRL(afterPayAccountBal)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Data do pagamento</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              {payError && (
                <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                  {payError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayingCard(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void confirmPayment()}>
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE DETALHES DA FATURA */}
      <Dialog
        open={viewingInvoice !== null}
        onOpenChange={(o) => !o && setViewingInvoice(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Fatura de {viewingInvoice?.invoice.label} — {viewingInvoice?.card.name}
            </DialogTitle>
            <DialogDescription>
              Total da fatura: <strong className="text-foreground">{formatBRL(viewingInvoice?.invoice.total ?? 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto py-2 pr-1">
            {viewingInvoice?.invoice.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma compra encontrada nesta fatura.
              </p>
            ) : (
              viewingInvoice?.invoice.items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground truncate">{tx.description}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {formatDate(tx.occurred_on)}
                      {tx.installment_total && (
                        <span className="ml-2 font-medium text-primary">
                          Parcela {tx.installment_number} de {tx.installment_total}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right font-bold text-destructive tabular text-sm">
                    - {formatBRL(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setViewingInvoice(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE CARTÃO */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
            <DialogDescription>Ajuste o limite e as datas do cartão.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-card-name">Nome do cartão</Label>
                <Input
                  id="edit-card-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-card-brand">Bandeira</Label>
                <Input
                  id="edit-card-brand"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-card-limit">Limite (R$)</Label>
                <CurrencyInput
                  id="edit-card-limit"
                  value={editLimit}
                  onValueChange={setEditLimit}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-card-closing">Dia do fechamento</Label>
                  <Input
                    id="edit-card-closing"
                    type="number"
                    min={1}
                    max={31}
                    value={editClosing}
                    onChange={(e) => setEditClosing(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-card-due">Dia do vencimento</Label>
                  <Input
                    id="edit-card-due"
                    type="number"
                    min={1}
                    max={31}
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                  />
                </div>
              </div>
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
      <AlertDialog open={archiving !== null} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar cartão "{archiving?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O cartão não aparecerá para novas despesas, mas todas as compras parceladas e faturas passadas continuarão guardadas no seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiving(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void archive()}>
              Arquivar cartão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
