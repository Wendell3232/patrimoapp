import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Archive, Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
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
  cardAvailableLimit,
  cardInvoices,
  cardOpenInvoiceTotal,
  cardUsedLimit,
  type CreditCard,
} from "@/lib/finance";
import { formatBRL, formatDayMonth, monthKeyToday, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões — Patrimo" },
      { name: "description", content: "Limites, fatura atual e faturas futuras dos seus cartões." },
      { property: "og:title", content: "Cartões — Patrimo" },
      { property: "og:description", content: "Limites, fatura atual e faturas futuras dos seus cartões." },
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

  const [paying, setPaying] = useState<CreditCard | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payAccount, setPayAccount] = useState("");
  const [payDate, setPayDate] = useState(() => toISODate(new Date()));
  const [payError, setPayError] = useState<string | null>(null);

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
      setError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Cartão cadastrado.");
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
    if (
      !Number.isInteger(closingDay) ||
      closingDay < 1 ||
      closingDay > 31 ||
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      setError("Fechamento e vencimento precisam estar entre 1 e 31.");
      return;
    }
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
    setError(null);
  }

  async function archive() {
    if (!archiving) return;
    const { error: updateError } = await supabase
      .from("credit_cards")
      .update({ archived: true })
      .eq("id", archiving.id);
    if (updateError) {
      toast.error("Não foi possível arquivar.");
      return;
    }
    await refresh();
    toast.success("Cartão arquivado. O histórico foi preservado.");
    setArchiving(null);
  }

  function startPayment(card: CreditCard) {
    if (!data) return;
    setPaying(card);
    setPayAmount(cardOpenInvoiceTotal(card, data.transactions));
    setPayAccount(
      card.payment_account_id ??
        data.accounts.find((a) => a.type === "corrente")?.id ??
        data.accounts[0]?.id ??
        "",
    );
    setPayDate(toISODate(new Date()));
    setPayError(null);
  }

  async function payInvoice() {
    if (!data || !paying) return;
    if (payAmount == null || payAmount <= 0) {
      setPayError("Informe o valor pago.");
      return;
    }
    if (!payAccount) {
      setPayError("Escolha a conta que pagou a fatura.");
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
      description: `Pagamento da fatura — ${paying.name}`,
      account_id: payAccount,
      credit_card_id: paying.id,
      is_invoice_payment: true,
      paid: true,
    });
    if (insertError) {
      setPayError("Não foi possível registrar o pagamento.");
      return;
    }
    await supabase
      .from("commitments")
      .update({ status: "pago" })
      .eq("credit_card_id", paying.id)
      .eq("status", "pendente")
      .lte("due_date", payDate);
    await refresh();
    toast.success("Fatura paga. O saldo da conta foi atualizado e o limite liberado.");
    setPaying(null);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Cartões">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const currentMonth = monthKeyToday();
  const cards = data.cards.filter((c) => !c.archived);
  const accounts = data.accounts.filter((a) => !a.archived);

  return (
    <AppShell
      title="Cartões de crédito"
      description="O limite não entra no patrimônio"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo cartão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cartao-nome">Nome</Label>
                <Input
                  id="cartao-nome"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cartao-inst">Instituição ou bandeira</Label>
                <Input
                  id="cartao-inst"
                  value={brand}
                  maxLength={60}
                  placeholder="Opcional"
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Limite</Label>
                <CurrencyInput value={limit} onValueChange={setLimit} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fechamento">Fechamento</Label>
                  <Input
                    id="fechamento"
                    type="number"
                    min={1}
                    max={31}
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vencimento">Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="number"
                    min={1}
                    max={31}
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={() => void create()}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não cadastrou cartões.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {cards.map((card) => {
            const used = cardUsedLimit(card, data.transactions);
            const available = cardAvailableLimit(card, data.transactions);
            const usage = card.limit_amount > 0 ? (used / card.limit_amount) * 100 : 0;
            const invoices = cardInvoices(card, data.transactions);
            const currentInvoice = invoices.find((invoice) => invoice.month === currentMonth);
            const future = invoices.filter((invoice) => invoice.month > currentMonth);

            return (
              <Card key={card.id}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{card.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {card.brand ? `${card.brand} — ` : ""}fecha dia {card.closing_day}, vence dia{" "}
                      {card.due_day}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={
                          available < 0
                            ? "tabular font-display text-lg font-semibold text-destructive"
                            : "tabular font-display text-lg font-semibold"
                        }
                      >
                        {formatBRL(available)}
                      </p>
                      <p className="text-xs text-muted-foreground">limite disponível</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar cartão"
                      onClick={() => startEdit(card)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Arquivar cartão"
                      onClick={() => setArchiving(card)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {available < 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      As compras lançadas já passaram do limite deste cartão.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Progress value={Math.min(usage, 100)} />
                    <p className="text-xs text-muted-foreground">
                      {formatBRL(used)} usados de {formatBRL(card.limit_amount)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium">Fatura em aberto</p>
                      <p className="tabular mt-1 text-lg font-semibold">
                        {formatBRL(cardOpenInvoiceTotal(card, data.transactions))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={cardOpenInvoiceTotal(card, data.transactions) <= 0}
                      onClick={() => startPayment(card)}
                    >
                      <Wallet className="mr-1.5 h-4 w-4" />
                      Pagar fatura
                    </Button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm font-medium">Compras deste mês</p>
                      <p className="tabular mt-1 text-lg font-semibold">
                        {formatBRL(currentInvoice?.total ?? 0)}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {(currentInvoice?.items ?? []).slice(0, 6).map((item) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="truncate pr-2">
                              {formatDayMonth(item.occurred_on)} {item.description}
                            </span>
                            <span className="tabular">{formatBRL(item.amount)}</span>
                          </div>
                        ))}
                        {!currentInvoice && (
                          <p className="text-xs text-muted-foreground">Sem compras neste mês.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm font-medium">Faturas futuras</p>
                      <div className="mt-3 space-y-2">
                        {future.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma parcela lançada para os próximos meses.
                          </p>
                        ) : (
                          future.slice(0, 6).map((invoice) => (
                            <div key={invoice.month} className="flex justify-between text-sm">
                              <span>{invoice.label}</span>
                              <span className="tabular">{formatBRL(invoice.total)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cartao-nome">Nome</Label>
              <Input
                id="edit-cartao-nome"
                value={editName}
                maxLength={60}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cartao-inst">Instituição ou bandeira</Label>
              <Input
                id="edit-cartao-inst"
                value={editBrand}
                maxLength={60}
                placeholder="Opcional"
                onChange={(e) => setEditBrand(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Limite</Label>
              <CurrencyInput value={editLimit} onValueChange={setEditLimit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fechamento">Fechamento</Label>
                <Input
                  id="edit-fechamento"
                  type="number"
                  min={1}
                  max={31}
                  value={editClosing}
                  onChange={(e) => setEditClosing(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-vencimento">Vencimento</Label>
                <Input
                  id="edit-vencimento"
                  type="number"
                  min={1}
                  max={31}
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void saveEdit()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(paying)} onOpenChange={(value) => !value && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar fatura {paying ? `— ${paying.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Valor pago</Label>
              <CurrencyInput value={payAmount} onValueChange={setPayAmount} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta que pagou</Label>
              <Select value={payAccount} onValueChange={setPayAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pagamento-data">Data do pagamento</Label>
              <Input
                id="pagamento-data"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O valor sai do saldo da conta escolhida e libera o limite do cartão. A despesa já foi
              contada na compra, então isso não conta duas vezes no resultado do mês.
            </p>
            {payError && <p className="text-sm text-destructive">{payError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void payInvoice()}>Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(archiving)} onOpenChange={(value) => !value && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {archiving?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cartão deixa de aparecer nas telas e nos lançamentos rápidos, mas todo o histórico e
              as parcelas continuam guardados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void archive()}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
