import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, TrendingUp } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { monthsUntil, requiredMonthlySaving, type Goal } from "@/lib/finance";
import { formatBRL, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Patrimo" },
      { name: "description", content: "Quanto guardar por mês para alcançar cada objetivo." },
      { property: "og:title", content: "Metas — Patrimo" },
      { property: "og:description", content: "Quanto guardar por mês para alcançar cada objetivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Metas,
});

function Metas() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [depositing, setDepositing] = useState<Goal | null>(null);
  const [deposit, setDeposit] = useState<number | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Goal | null>(null);

  async function saveDeposit() {
    if (!depositing) return;
    if (deposit == null || deposit <= 0) {
      setDepositError("Informe quanto você guardou.");
      return;
    }
    const { error: updateError } = await supabase
      .from("goals")
      .update({ current_amount: depositing.current_amount + deposit })
      .eq("id", depositing.id);
    if (updateError) {
      setDepositError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Aporte registrado na meta.");
    setDepositing(null);
    setDeposit(null);
    setDepositError(null);
  }

  async function remove() {
    if (!removing) return;
    const { error: deleteError } = await supabase.from("goals").delete().eq("id", removing.id);
    if (deleteError) {
      toast.error("Não foi possível excluir a meta.");
      return;
    }
    await refresh();
    toast.success("Meta excluída.");
    setRemoving(null);
  }

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      setError("Dê um nome para a meta.");
      return;
    }
    if (target == null || target <= 0) {
      setError("Informe o valor desejado.");
      return;
    }
    if (!date || date <= toISODate(new Date())) {
      setError("Escolha uma data futura.");
      return;
    }
    const { error: insertError } = await supabase.from("goals").insert({
      user_id: data.userId,
      name: name.trim(),
      target_amount: target,
      current_amount: current ?? 0,
      target_date: date,
    });
    if (insertError) {
      setError("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Meta criada.");
    setName("");
    setTarget(null);
    setCurrent(null);
    setDate("");
    setError(null);
    setOpen(false);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Metas">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Metas"
      description="Objetivos com valor mensal calculado"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="meta-nome">Nome</Label>
                <Input
                  id="meta-nome"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor desejado</Label>
                <CurrencyInput value={target} onValueChange={setTarget} />
              </div>
              <div className="space-y-1.5">
                <Label>Já guardado</Label>
                <CurrencyInput value={current} onValueChange={setCurrent} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-data">Data alvo</Label>
                <Input
                  id="meta-data"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
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
      {data.goals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem metas cadastradas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.goals.map((goal) => {
            const progress =
              goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Alvo em {formatDate(goal.target_date)} — {monthsUntil(goal.target_date)} meses
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Registrar aporte"
                      onClick={() => {
                        setDepositing(goal);
                        setDeposit(null);
                        setDepositError(null);
                      }}
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir meta"
                      onClick={() => setRemoving(goal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={Math.min(progress, 100)} />
                  <div className="flex justify-between text-sm">
                    <span className="tabular">{formatBRL(goal.current_amount)}</span>
                    <span className="tabular text-muted-foreground">
                      de {formatBRL(goal.target_amount)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                    Guarde{" "}
                    <span className="tabular font-semibold">
                      {formatBRL(requiredMonthlySaving(goal))}
                    </span>{" "}
                    por mês para chegar no prazo.
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(depositing)} onOpenChange={(value) => !value && setDepositing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar aporte {depositing ? `— ${depositing.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quanto você guardou agora</Label>
              <CurrencyInput value={deposit} onValueChange={setDeposit} />
            </div>
            <p className="text-xs text-muted-foreground">
              O valor soma ao total já guardado nesta meta e o cálculo mensal é refeito.
            </p>
            {depositError && <p className="text-sm text-destructive">{depositError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => void saveDeposit()}>Salvar aporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A meta e o histórico de progresso dela serão apagados. Seus lançamentos não mudam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
