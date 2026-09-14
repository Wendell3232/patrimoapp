import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { futureCommitments, type Commitment } from "@/lib/finance";
import { formatBRL, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compromissos")({
  head: () => ({
    meta: [
      { title: "Compromissos — Patrimo" },
      { name: "description", content: "Calendário financeiro com projeção dos próximos meses." },
      { property: "og:title", content: "Compromissos — Patrimo" },
      { property: "og:description", content: "Calendário financeiro com projeção dos próximos meses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Compromissos,
});

function Compromissos() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const navigate = useNavigate();

  const [settling, setSettling] = useState<Commitment | null>(null);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);

  function start(commitment: Commitment) {
    if (!data) return;
    if (commitment.credit_card_id) {
      toast.info("Este valor está na fatura do cartão. Pague a fatura para baixar o compromisso.");
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

  async function confirm() {
    if (!data || !settling) return;
    if (!accountId) {
      setError("Escolha a conta do pagamento.");
      return;
    }
    if (!date) {
      setError("Informe a data.");
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
      setError("Não foi possível registrar o lançamento.");
      return;
    }
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ status: "pago" })
      .eq("id", settling.id);
    if (updateError) {
      setError("O lançamento foi criado, mas o compromisso não foi baixado.");
      return;
    }
    await refresh();
    toast.success(
      settling.kind === "receita"
        ? "Entrada registrada e compromisso baixado."
        : "Pagamento registrado e saldo atualizado.",
    );
    setSettling(null);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Compromissos">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const groups = futureCommitments(data.commitments);
  const accounts = data.accounts.filter((a) => !a.archived);

  return (
    <AppShell title="Compromissos" description="Calendário financeiro dos próximos meses">
      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum compromisso futuro registrado. Parcelas de cartão entram aqui automaticamente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.month}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
                <div className="flex gap-4 text-xs">
                  <span className="text-positive">Entradas {formatBRL(group.receitas)}</span>
                  <span className="text-destructive">Saídas {formatBRL(group.despesas)}</span>
                  <span className="text-muted-foreground">
                    Projeção {formatBRL(group.receitas - group.despesas)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.due_date)}
                        {item.credit_card_id ? " — na fatura do cartão" : ""}
                      </p>
                    </div>
                    <span
                      className={
                        item.kind === "receita"
                          ? "tabular text-sm font-semibold text-positive"
                          : "tabular text-sm font-semibold text-destructive"
                      }
                    >
                      {item.kind === "receita" ? "+" : "-"}
                      {formatBRL(item.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Registrar pagamento"
                      onClick={() => start(item)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(settling)} onOpenChange={(value) => !value && setSettling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {settling?.kind === "receita" ? "Registrar entrada" : "Registrar pagamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
              <p className="font-medium">{settling?.description}</p>
              <p className="tabular mt-1">{formatBRL(settling?.amount ?? 0)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="compromisso-data">Data</Label>
              <Input
                id="compromisso-data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void confirm()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
