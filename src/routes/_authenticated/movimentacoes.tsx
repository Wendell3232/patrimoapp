import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { QuickActions } from "@/components/app/QuickActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatBRL, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações — Patrimo" },
      {
        name: "description",
        content: "Todos os lançamentos com filtros por tipo, conta e período.",
      },
      { property: "og:title", content: "Movimentações — Patrimo" },
      { property: "og:description", content: "Todos os lançamentos com filtros por tipo, conta e período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Movimentacoes,
});

function Movimentacoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState("todos");
  const [accountId, setAccountId] = useState("todas");
  const [categoryId, setCategoryId] = useState("todas");
  const [start, setStart] = useState(() => {
    const today = new Date();
    return toISODate(new Date(today.getFullYear(), today.getMonth() - 2, 1));
  });
  const [end, setEnd] = useState(() => toISODate(new Date()));

  const rows = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((tx) => {
      if (tx.occurred_on < start || tx.occurred_on > end) return false;
      if (kind !== "todos" && tx.kind !== kind) return false;
      if (accountId !== "todas" && tx.account_id !== accountId && tx.to_account_id !== accountId)
        return false;
      if (categoryId !== "todas" && tx.category_id !== categoryId) return false;
      if (term && !tx.description.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });
  }, [data, start, end, kind, accountId, categoryId, term]);

  async function remove(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    await refresh();
    toast.success("Lançamento excluído.");
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Movimentações">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const total = rows.reduce(
    (acc, tx) => {
      if (tx.kind === "receita") acc.income += tx.amount;
      if (tx.kind === "despesa") acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <AppShell title="Movimentações" description="Lançamentos e ações rápidas">
      <div className="space-y-8">
        <QuickActions />

        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca"
                  className="pl-9"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Descrição"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                  <SelectItem value="transferencia">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {data.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {data.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="de">De</Label>
              <Input id="de" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ate">Até</Label>
              <Input id="ate" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            {rows.length} lançamento{rows.length === 1 ? "" : "s"}
          </span>
          <span className="text-positive">Entradas {formatBRL(total.income)}</span>
          <span className="text-destructive">Despesas {formatBRL(total.expense)}</span>
        </div>

        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhum lançamento encontrado com esses filtros.
              </p>
            ) : (
              rows.map((tx) => {
                const category = data.categories.find((c) => c.id === tx.category_id);
                const account = data.accounts.find((a) => a.id === tx.account_id);
                const card = data.cards.find((c) => c.id === tx.credit_card_id);
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tx.description || "Lançamento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.occurred_on)}
                        {category ? ` — ${category.name}` : ""}
                        {card ? ` — ${card.name}` : account ? ` — ${account.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        tx.kind === "receita"
                          ? "tabular text-sm font-semibold text-positive"
                          : tx.kind === "despesa"
                            ? "tabular text-sm font-semibold text-destructive"
                            : "tabular text-sm font-semibold text-muted-foreground"
                      }
                    >
                      {tx.kind === "despesa" ? "-" : tx.kind === "receita" ? "+" : ""}
                      {formatBRL(tx.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir lançamento"
                      onClick={() => void remove(tx.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
