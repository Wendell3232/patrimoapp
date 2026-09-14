import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { CurrencyInput } from "@/components/app/CurrencyInput";
import { QuickActions } from "@/components/app/QuickActions";
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
import { ACCOUNT_TYPE_LABEL, accountBalance, type Account, type AccountType } from "@/lib/finance";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({
    meta: [
      { title: "Contas — Patrimo" },
      { name: "description", content: "Saldos por conta, dinheiro e investimentos." },
      { property: "og:title", content: "Contas — Patrimo" },
      { property: "og:description", content: "Saldos por conta, dinheiro e investimentos." },
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
  const [selected, setSelected] = useState<string | null>(null);

  const [editing, setEditing] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("corrente");
  const [editInstitution, setEditInstitution] = useState("");
  const [editBalance, setEditBalance] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Account | null>(null);

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      setEditError("Informe o nome.");
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
      setEditError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Conta atualizada.");
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
      toast.error("Não foi possível arquivar.");
      return;
    }
    await refresh();
    setSelected(null);
    toast.success("Conta arquivada. O histórico continua guardado.");
    setArchiving(null);
  }

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      setError("Informe o nome.");
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
      setError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Conta criada.");
    setName("");
    setInstitution("");
    setBalance(null);
    setError(null);
    setOpen(false);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Contas">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  const accounts = data.accounts.filter((a) => !a.archived);
  const activeId = selected ?? accounts[0]?.id ?? null;
  const activeAccount = accounts.find((a) => a.id === activeId);
  const history = activeAccount
    ? data.transactions.filter(
        (tx) =>
          !tx.credit_card_id &&
          (tx.account_id === activeAccount.id || tx.to_account_id === activeAccount.id),
      )
    : [];

  return (
    <AppShell
      title="Contas"
      description="Onde o seu dinheiro está guardado"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="conta-nome">Nome</Label>
                <Input
                  id="conta-nome"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(value) => setType(value as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conta-inst">Instituição</Label>
                <Input
                  id="conta-inst"
                  value={institution}
                  maxLength={60}
                  placeholder="Opcional"
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo atual</Label>
                <CurrencyInput value={balance} onValueChange={setBalance} />
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
      <div className="space-y-8">
        <QuickActions compact />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const value = accountBalance(account, data.transactions);
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelected(account.id)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  account.id === activeId ? "border-primary bg-card" : "border-border bg-card"
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {ACCOUNT_TYPE_LABEL[account.type]}
                </p>
                <p className="mt-2 font-display text-lg font-semibold">{account.name}</p>
                <p className="tabular mt-1 text-xl font-semibold">{formatBRL(value)}</p>
                {account.institution && (
                  <p className="mt-1 text-xs text-muted-foreground">{account.institution}</p>
                )}
              </button>
            );
          })}
        </div>

        {activeAccount && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Histórico de {activeAccount.name}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(activeAccount);
                    setEditName(activeAccount.name);
                    setEditType(activeAccount.type);
                    setEditInstitution(activeAccount.institution ?? "");
                    setEditBalance(activeAccount.opening_balance);
                    setEditError(null);
                  }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setArchiving(activeAccount)}>
                  <Archive className="mr-1.5 h-4 w-4" />
                  Arquivar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {history.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhum lançamento nesta conta.</p>
              ) : (
                history.slice(0, 30).map((tx) => {
                  const isIn =
                    tx.kind === "receita" ||
                    (tx.kind === "transferencia" && tx.to_account_id === activeAccount.id);
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {tx.description || "Lançamento"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.occurred_on)}
                        </p>
                      </div>
                      <span
                        className={
                          isIn
                            ? "tabular text-sm font-semibold text-positive"
                            : "tabular text-sm font-semibold text-destructive"
                        }
                      >
                        {isIn ? "+" : "-"}
                        {formatBRL(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-conta-nome">Nome</Label>
              <Input
                id="edit-conta-nome"
                value={editName}
                maxLength={60}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={editType} onValueChange={(value) => setEditType(value as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-conta-inst">Instituição</Label>
              <Input
                id="edit-conta-inst"
                value={editInstitution}
                maxLength={60}
                placeholder="Opcional"
                onChange={(e) => setEditInstitution(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Saldo inicial</Label>
              <CurrencyInput value={editBalance} onValueChange={setEditBalance} />
              <p className="text-xs text-muted-foreground">
                Este é o valor de partida da conta. Os lançamentos continuam somando sobre ele.
              </p>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void saveEdit()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(archiving)} onOpenChange={(value) => !value && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {archiving?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta sai das telas e dos lançamentos rápidos, mas o histórico e o saldo continuam
              guardados.
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
