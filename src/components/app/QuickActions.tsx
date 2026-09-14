import { useState } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { buildInstallments } from "@/lib/finance";
import { toISODate } from "@/lib/format";

type Mode = "receita" | "despesa" | "transferencia";

export function QuickActions({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button size={compact ? "sm" : "default"} onClick={() => setMode("receita")}>
        <Plus className="mr-1.5 h-4 w-4" />
        Receita
      </Button>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={() => setMode("despesa")}
      >
        <Minus className="mr-1.5 h-4 w-4" />
        Despesa
      </Button>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={() => setMode("transferencia")}
      >
        <ArrowLeftRight className="mr-1.5 h-4 w-4" />
        Transferência
      </Button>

      <TransactionDialog mode={mode} onClose={() => setMode(null)} />
    </div>
  );
}

function TransactionDialog({ mode, onClose }: { mode: Mode | null; onClose: () => void }) {
  const { data } = useFinance();
  const refresh = useRefreshFinance();
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [payment, setPayment] = useState<"conta" | "cartao">("conta");
  const [cardId, setCardId] = useState("");
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mode || !data) return null;
  const finance = data;

  const accounts = finance.accounts.filter((a) => !a.archived);
  const cards = finance.cards.filter((c) => !c.archived);
  const categories = finance.categories.filter((c) =>
    mode === "receita" ? c.kind === "receita" : c.kind === "despesa",
  );

  function reset() {
    setAmount(null);
    setDate(toISODate(new Date()));
    setDescription("");
    setCategoryId("");
    setAccountId("");
    setToAccountId("");
    setPayment("conta");
    setCardId("");
    setInstallments("1");
    setError(null);
  }

  async function submit() {
    setError(null);
    if (amount == null || amount <= 0) {
      setError("Informe um valor maior que R$ 0,00.");
      return;
    }
    if (!date) {
      setError("Informe a data.");
      return;
    }
    if (!description.trim()) {
      setError("Descreva o lançamento.");
      return;
    }
    if (mode === "transferencia") {
      if (!accountId || !toAccountId) {
        setError("Escolha a conta de origem e a de destino.");
        return;
      }
      if (accountId === toAccountId) {
        setError("A conta de destino precisa ser diferente da origem.");
        return;
      }
    } else if (!categoryId) {
      setError("Escolha uma categoria.");
      return;
    } else if (mode === "receita" && !accountId) {
      setError("Escolha a conta que recebeu o valor.");
      return;
    } else if (mode === "despesa") {
      if (payment === "conta" && !accountId) {
        setError("Escolha a conta usada no pagamento.");
        return;
      }
      if (payment === "cartao" && !cardId) {
        setError("Escolha o cartão de crédito.");
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === "transferencia") {
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: finance.userId,
          kind: "transferencia",
          amount,
          occurred_on: date,
          description: description.trim(),
          account_id: accountId,
          to_account_id: toAccountId,
        });
        if (insertError) throw insertError;
      } else if (mode === "receita") {
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: finance.userId,
          kind: "receita",
          amount,
          occurred_on: date,
          description: description.trim(),
          category_id: categoryId,
          account_id: accountId,
        });
        if (insertError) throw insertError;
      } else if (payment === "conta") {
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: finance.userId,
          kind: "despesa",
          amount,
          occurred_on: date,
          description: description.trim(),
          category_id: categoryId,
          account_id: accountId,
        });
        if (insertError) throw insertError;
      } else {
        const count = Number(installments);
        const parts = buildInstallments(amount, count, date);
        const group = crypto.randomUUID();
        const today = toISODate(new Date());
        const rows = parts.map((part) => ({
          user_id: finance.userId,
          kind: "despesa" as const,
          amount: part.amount,
          occurred_on: part.date,
          description:
            count > 1 ? `${description.trim()} (${part.number}/${count})` : description.trim(),
          category_id: categoryId,
          credit_card_id: cardId,
          installment_group: count > 1 ? group : null,
          installment_number: count > 1 ? part.number : null,
          installment_total: count > 1 ? count : null,
          paid: part.date <= today,
        }));
        const { data: inserted, error: insertError } = await supabase
          .from("transactions")
          .insert(rows)
          .select("id, occurred_on, amount, description");
        if (insertError) throw insertError;

        const future = (inserted ?? []).filter((row) => row.occurred_on > today);
        if (future.length > 0) {
          const { error: commitmentError } = await supabase.from("commitments").insert(
            future.map((row) => ({
              user_id: finance.userId,
              description: row.description,
              amount: row.amount,
              due_date: row.occurred_on,
              kind: "despesa" as const,
              category_id: categoryId,
              credit_card_id: cardId,
              transaction_id: row.id,
            })),
          );
          if (commitmentError) throw commitmentError;
        }
      }

      await refresh();
      toast.success(
        mode === "receita"
          ? "Receita registrada."
          : mode === "despesa"
            ? "Despesa registrada."
            : "Transferência registrada.",
      );
      reset();
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const titles: Record<Mode, string> = {
    receita: "Nova receita",
    despesa: "Nova despesa",
    transferencia: "Nova transferência",
  };

  const descriptions: Record<Mode, string> = {
    receita: "Entra no resultado do mês e aumenta o patrimônio.",
    despesa: "Sai do resultado do mês. No cartão, entra na fatura.",
    transferencia: "Move saldo entre suas contas sem alterar receitas, despesas ou patrimônio.",
  };

  return (
    <Dialog
      open={Boolean(mode)}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <CurrencyInput id="valor" value={amount} onValueChange={setAmount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              maxLength={120}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mode === "transferencia" ? "Reserva mensal" : "Supermercado"}
            />
          </div>

          {mode !== "transferencia" && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "despesa" && (
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={payment}
                onValueChange={(value) => setPayment(value as "conta" | "cartao")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta">Débito em conta ou dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão de crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "despesa" && payment === "cartao" ? (
            <>
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 1 ? "À vista" : `${n}x`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Parcelas futuras entram automaticamente nos seus compromissos.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>{mode === "transferencia" ? "Conta de origem" : "Conta"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
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
          )}

          {mode === "transferencia" && (
            <div className="space-y-2">
              <Label>Conta de destino</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
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
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
