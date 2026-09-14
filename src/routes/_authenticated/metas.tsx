import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Pause,
  PiggyBank,
  Play,
  Plus,
  Target,
  Trash2,
  TrendingUp,
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
import { goalPacing, type Goal } from "@/lib/finance";
import { formatBRL, formatDate, formatMonthLabel, parseISODate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Patrimo" },
      {
        name: "description",
        content: "Acompanhe o progresso e a viabilidade dos seus objetivos financeiros.",
      },
      { property: "og:title", content: "Metas — Patrimo" },
      {
        property: "og:description",
        content: "Acompanhe o progresso e a viabilidade dos seus objetivos financeiros.",
      },
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
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Registrar valor guardado
  const [depositing, setDepositing] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [depositAccount, setDepositAccount] = useState("");
  const [deductFromAccount, setDeductFromAccount] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Editar meta (prazo e valor alvo)
  const [editing, setEditing] = useState<Goal | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<Goal | null>(null);

  // Metas pausadas gerenciadas no storage do navegador
  const [pausedIds, setPausedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("patrimo_paused_goals");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  function togglePause(goalId: string) {
    setPausedIds((prev) => {
      const next = prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId];
      try {
        localStorage.setItem("patrimo_paused_goals", JSON.stringify(next));
      } catch {}
      return next;
    });
    const isPaused = !pausedIds.includes(goalId);
    toast.success(isPaused ? "Meta pausada temporariamente." : "Meta reativada com sucesso.");
  }

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      setError("Dê um nome para a meta.");
      return;
    }
    if (target == null || target <= 0) {
      setError("Informe o valor total desejado.");
      return;
    }
    if (!date || date <= toISODate(new Date())) {
      setError("Escolha uma data futura para alcançar a meta.");
      return;
    }
    const { error: insertError } = await supabase.from("goals").insert({
      user_id: data.userId,
      name: name.trim(),
      target_amount: target,
      current_amount: current ?? 0,
      target_date: date,
      account_id: accountId || null,
    });
    if (insertError) {
      setError("Não foi possível salvar a meta.");
      return;
    }
    await refresh();
    toast.success("Meta criada com sucesso!");
    setName("");
    setTarget(null);
    setCurrent(null);
    setDate("");
    setAccountId("");
    setError(null);
    setOpen(false);
  }

  async function saveDeposit() {
    if (!depositing || !data) return;
    if (depositAmount == null || depositAmount <= 0) {
      setDepositError("Informe quanto você guardou para a meta.");
      return;
    }

    const newCurrent = Number(depositing.current_amount) + depositAmount;

    // Se o usuário optou por descontar da conta bancária
    if (deductFromAccount && depositAccount) {
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: data.userId,
        kind: "despesa",
        amount: depositAmount,
        occurred_on: toISODate(new Date()),
        description: `Guardado para a meta: ${depositing.name}`,
        account_id: depositAccount,
        paid: true,
      });

      if (txError) {
        setDepositError("Não foi possível debitar da conta bancária.");
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("goals")
      .update({ current_amount: newCurrent })
      .eq("id", depositing.id);

    if (updateError) {
      setDepositError("Não foi possível atualizar a meta.");
      return;
    }

    await refresh();
    toast.success(`Parabéns! Você guardou ${formatBRL(depositAmount)} para "${depositing.name}".`);
    setDepositing(null);
    setDepositAmount(null);
    setDepositError(null);
    setDeductFromAccount(false);
  }

  function startEdit(goal: Goal) {
    setEditing(goal);
    setEditName(goal.name);
    setEditTarget(Number(goal.target_amount));
    setEditDate(goal.target_date);
    setEditAccount(goal.account_id ?? "");
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      setEditError("Informe o nome da meta.");
      return;
    }
    if (editTarget == null || editTarget <= 0) {
      setEditError("Informe o valor alvo.");
      return;
    }
    if (!editDate) {
      setEditError("Informe o prazo.");
      return;
    }

    const { error: updateError } = await supabase
      .from("goals")
      .update({
        name: editName.trim(),
        target_amount: editTarget,
        target_date: editDate,
        account_id: editAccount || null,
      })
      .eq("id", editing.id);

    if (updateError) {
      setEditError("Não foi possível salvar as alterações.");
      return;
    }

    await refresh();
    toast.success("Meta atualizada com sucesso.");
    setEditing(null);
  }

  async function remove() {
    if (!removing) return;
    const { error: deleteError } = await supabase.from("goals").delete().eq("id", removing.id);
    if (deleteError) {
      toast.error("Não foi possível excluir a meta.");
      return;
    }
    await refresh();
    toast.success("Meta removida.");
    setRemoving(null);
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
      description="Veja o progresso, quanto guardar por mês e a viabilidade dos seus objetivos"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar meta financeira</DialogTitle>
              <DialogDescription>
                Estabeleça o que você quer alcançar, o valor e a data desejada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="goal-name">Nome da meta</Label>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reserva de emergência, Viagem, Carro novo"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Valor total desejado (R$)</Label>
                <CurrencyInput
                  id="goal-target"
                  value={target}
                  onChange={setTarget}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-current">Quanto já tem guardado hoje? (R$)</Label>
                <CurrencyInput
                  id="goal-current"
                  value={current}
                  onChange={setCurrent}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-date">Até quando deseja alcançar? (Prazo)</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Vincular a uma conta específica (opcional)</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (geral)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta vinculada</SelectItem>
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
                Criar meta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {data.goals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma meta cadastrada ainda. Clique em "Nova meta" para planejar seu próximo objetivo!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.goals.map((goal) => {
              const pacing = goalPacing(goal);
              const isPaused = pausedIds.includes(goal.id);
              const linkedAccount = data.accounts.find((a) => a.id === goal.account_id);
              const targetDateFormatted = formatMonthLabel(parseISODate(goal.target_date));

              // Status visual
              let statusBadge = {
                label: "No ritmo",
                className: "border-positive/40 bg-positive/10 text-positive",
                icon: CheckCircle2,
              };

              if (isPaused) {
                statusBadge = {
                  label: "Pausada",
                  className: "border-border text-muted-foreground bg-accent/40",
                  icon: Pause,
                };
              } else if (pacing.percentage >= 100) {
                statusBadge = {
                  label: "Concluída!",
                  className: "border-positive/50 bg-positive/20 text-positive",
                  icon: CheckCircle2,
                };
              } else if (pacing.status === "atrasada") {
                statusBadge = {
                  label: "Atrasada",
                  className: "border-destructive/40 bg-destructive/10 text-destructive",
                  icon: AlertCircle,
                };
              } else if (pacing.status === "atencao") {
                statusBadge = {
                  label: "Atenção",
                  className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  icon: Clock,
                };
              }

              return (
                <Card
                  key={goal.id}
                  className={`flex flex-col justify-between transition-all hover:shadow-md ${
                    isPaused ? "opacity-75" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="truncate text-base font-bold">
                            {goal.name}
                          </CardTitle>
                          <Badge variant="outline" className={`text-xs gap-1 ${statusBadge.className}`}>
                            <statusBadge.icon className="h-3 w-3" />
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <CardDescription className="mt-0.5 text-xs">
                          Prazo até <strong>{targetDateFormatted}</strong> ({pacing.monthsLeft}{" "}
                          {pacing.monthsLeft === 1 ? "mês restante" : "meses restantes"})
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={isPaused ? "Reativar meta" : "Pausar meta"}
                          onClick={() => togglePause(goal.id)}
                        >
                          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar meta"
                          onClick={() => startEdit(goal)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Excluir meta"
                          onClick={() => setRemoving(goal)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Barra de Progresso e Valores */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Guardado: <strong className="text-foreground tabular">{formatBRL(pacing.current)}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Alvo: <strong className="text-foreground tabular">{formatBRL(pacing.target)}</strong>
                        </span>
                      </div>

                      <Progress value={pacing.percentage} />

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="font-semibold text-primary">{pacing.percentage.toFixed(0)}% concluído</span>
                        <span className="text-muted-foreground">Faltam {formatBRL(pacing.missing)}</span>
                      </div>
                    </div>

                    {/* Explicações Acolhedoras e Recomendações */}
                    <div className="rounded-lg bg-accent/40 p-3 text-xs text-foreground space-y-1.5">
                      {pacing.percentage >= 100 ? (
                        <p className="font-semibold text-positive">
                          Parabéns! Você alcançou o valor desejado para esta meta!
                        </p>
                      ) : isPaused ? (
                        <p className="text-muted-foreground">
                          Esta meta está pausada. Ela não gerará cobranças ou alertas até ser reativada.
                        </p>
                      ) : (
                        <>
                          <p>
                            Para chegar até <strong>{targetDateFormatted}</strong>, você precisa guardar{" "}
                            <strong className="text-primary">{formatBRL(pacing.monthlyNeeded)}</strong> por mês.
                          </p>
                          {pacing.status === "atrasada" && (
                            <p className="text-destructive font-medium">
                              Você está abaixo do ritmo necessário. Se preferir, pode ajustar o prazo ou o valor alvo.
                            </p>
                          )}
                        </>
                      )}
                      {linkedAccount && (
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                          Vinculada à conta: {linkedAccount.name}
                        </p>
                      )}
                    </div>

                    {/* Botão para registrar valor guardado */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-medium"
                      onClick={() => {
                        setDepositing(goal);
                        setDepositAmount(null);
                        setDepositAccount(goal.account_id ?? data.accounts[0]?.id ?? "");
                        setDepositError(null);
                      }}
                    >
                      <PiggyBank className="mr-1.5 h-3.5 w-3.5" /> Registrar valor guardado
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR VALOR GUARDADO (APORTE) */}
      <Dialog open={depositing !== null} onOpenChange={(o) => !o && setDepositing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar valor para "{depositing?.name}"</DialogTitle>
            <DialogDescription>
              Adicione quanto você guardou para se aproximar do seu objetivo.
            </DialogDescription>
          </DialogHeader>

          {depositing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="dep-amount">Valor guardado (R$)</Label>
                <CurrencyInput
                  id="dep-amount"
                  value={depositAmount}
                  onChange={setDepositAmount}
                  placeholder="0,00"
                />
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="deduct-switch" className="text-xs cursor-pointer">
                    Descontar este valor de uma conta bancária agora?
                  </Label>
                  <input
                    type="checkbox"
                    id="deduct-switch"
                    checked={deductFromAccount}
                    onChange={(e) => setDeductFromAccount(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>

                {deductFromAccount && (
                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs">Conta de origem</Label>
                    <Select value={depositAccount} onValueChange={setDepositAccount}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Escolha a conta" />
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
                )}
              </div>

              {depositError && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {depositError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDepositing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveDeposit()}>
              Salvar valor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR META (AJUSTAR PRAZO OU VALOR) */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
            <DialogDescription>
              Ajuste o valor alvo ou o prazo para adequar a meta ao seu momento.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-goal-name">Nome da meta</Label>
                <Input
                  id="edit-goal-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-goal-target">Valor total desejado (R$)</Label>
                <CurrencyInput
                  id="edit-goal-target"
                  value={editTarget}
                  onChange={setEditTarget}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-goal-date">Novo prazo</Label>
                <Input
                  id="edit-goal-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Conta vinculada</Label>
                <Select value={editAccount} onValueChange={setEditAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
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

      {/* MODAL DE EXCLUSÃO */}
      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta "{removing?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A meta será removida. Os saldos e movimentações das suas contas bancárias permanecerão intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemoving(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Excluir meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
