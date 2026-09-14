import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/app/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/lib/finance";
import { formatBRL, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Primeiros passos — Patrimo" },
      { name: "description", content: "Configure saldo, contas, cartões e sua primeira meta." },
      { property: "og:title", content: "Primeiros passos — Patrimo" },
      { property: "og:description", content: "Configure saldo, contas, cartões e sua primeira meta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

interface DraftAccount {
  key: string;
  name: string;
  type: AccountType;
  balance: number | null;
}

interface DraftCard {
  key: string;
  name: string;
  institution: string;
  limit: number | null;
  closing: string;
  due: string;
}

const STEPS = [
  { title: "Quanto você tem hoje", hint: "Some tudo que está disponível neste momento." },
  { title: "Onde esse dinheiro está", hint: "Distribua entre contas, dinheiro e investimentos." },
  { title: "Cartão de crédito", hint: "Cadastre os cartões que você usa." },
  { title: "Meta financeira", hint: "Escolha um objetivo para acompanhar." },
  { title: "Tudo pronto", hint: "Seu espaço financeiro está preparado." },
];

function newKey() {
  return Math.random().toString(36).slice(2);
}

function Onboarding() {
  const navigate = useNavigate();
  const { data } = useFinance();
  const refresh = useRefreshFinance();

  const [step, setStep] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<DraftAccount[]>([
    { key: newKey(), name: "Conta corrente", type: "corrente", balance: null },
  ]);
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [cards, setCards] = useState<DraftCard[]>([
    { key: newKey(), name: "", institution: "", limit: null, closing: "28", due: "5" },
  ]);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState<number | null>(null);
  const [goalDate, setGoalDate] = useState("");
  const [goalSkipped, setGoalSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const distributed = useMemo(
    () => accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    [accounts],
  );
  const remaining = (total ?? 0) - distributed;

  function goNext() {
    setError(null);

    if (step === 1) {
      if (total == null) {
        setError("Informe quanto você tem hoje. Se não tiver nada, use R$ 0,00.");
        return;
      }
      setAccounts((current) =>
        current.length === 1 && current[0] && current[0].balance == null
          ? [{ ...current[0], balance: total }]
          : current,
      );
      setStep(2);
      return;
    }

    if (step === 2) {
      if (accounts.length === 0) {
        setError("Cadastre pelo menos um lugar onde o dinheiro está.");
        return;
      }
      for (const account of accounts) {
        if (!account.name.trim()) {
          setError("Todos os lugares precisam de um nome.");
          return;
        }
        if (account.balance == null) {
          setError(`Informe o saldo de "${account.name.trim()}". Use R$ 0,00 se estiver vazio.`);
          return;
        }
      }
      if (Math.abs(remaining) > 0.009) {
        setError(
          remaining > 0
            ? `Faltam ${formatBRL(remaining)} para distribuir.`
            : `Você distribuiu ${formatBRL(Math.abs(remaining))} acima do total informado.`,
        );
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (hasCard == null) {
        setError("Diga se você usa cartão de crédito.");
        return;
      }
      if (hasCard) {
        for (const card of cards) {
          if (!card.name.trim()) {
            setError("Dê um nome para cada cartão.");
            return;
          }
          if (card.limit == null || card.limit <= 0) {
            setError(`Informe o limite do cartão "${card.name.trim()}".`);
            return;
          }
          const closing = Number(card.closing);
          const due = Number(card.due);
          if (!Number.isInteger(closing) || closing < 1 || closing > 31) {
            setError("O dia de fechamento precisa estar entre 1 e 31.");
            return;
          }
          if (!Number.isInteger(due) || due < 1 || due > 31) {
            setError("O dia de vencimento precisa estar entre 1 e 31.");
            return;
          }
        }
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      if (!goalSkipped) {
        const filled = goalName.trim() || goalTarget != null || goalDate;
        if (filled) {
          if (!goalName.trim()) {
            setError("Dê um nome para a meta.");
            return;
          }
          if (goalTarget == null || goalTarget <= 0) {
            setError("Informe o valor da meta.");
            return;
          }
          if (!goalDate) {
            setError("Informe a data em que você quer alcançar a meta.");
            return;
          }
          if (goalDate <= toISODate(new Date())) {
            setError("A data da meta precisa ser no futuro.");
            return;
          }
        }
      }
      void finish();
    }
  }

  async function finish() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const { data: insertedAccounts, error: accountError } = await supabase
        .from("accounts")
        .insert(
          accounts.map((account) => ({
            user_id: data.userId,
            name: account.name.trim(),
            type: account.type,
            opening_balance: account.balance ?? 0,
          })),
        )
        .select("id, type");
      if (accountError) throw accountError;

      const paymentAccount =
        insertedAccounts?.find((a) => a.type === "corrente")?.id ??
        insertedAccounts?.[0]?.id ??
        null;

      if (hasCard) {
        const { error: cardError } = await supabase.from("credit_cards").insert(
          cards.map((card) => ({
            user_id: data.userId,
            name: card.name.trim(),
            brand: card.institution.trim() || null,
            limit_amount: card.limit ?? 0,
            closing_day: Number(card.closing),
            due_day: Number(card.due),
            payment_account_id: paymentAccount,
          })),
        );
        if (cardError) throw cardError;
      }

      const hasGoal = !goalSkipped && goalName.trim() && goalTarget != null && goalDate;
      if (hasGoal) {
        const { error: goalError } = await supabase.from("goals").insert({
          user_id: data.userId,
          name: goalName.trim(),
          target_amount: goalTarget ?? 0,
          current_amount: 0,
          target_date: goalDate,
        });
        if (goalError) throw goalError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_step: 5,
          ...(income != null && income > 0 ? { monthly_income: income } : {}),
          ...(hasGoal ? { main_goal: goalName.trim() } : {}),
        })
        .eq("id", data.userId);
      if (profileError) throw profileError;

      await refresh();
      setStep(5);
      toast.success("Seu espaço financeiro está preparado.");
      setTimeout(() => navigate({ to: "/dashboard" }), 1200);
    } catch {
      setError("Não conseguimos salvar agora. Confira os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-lg font-semibold tracking-tight">Patrimo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Etapa {step} de 5 — {current?.hint}
        </p>
        <Progress value={(step / 5) * 100} className="mt-4" />

        <Card className="mt-6">
          <CardContent className="space-y-6 p-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{current?.title}</h1>

            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="total">Saldo atual</Label>
                <CurrencyInput
                  id="total"
                  value={total}
                  onValueChange={setTotal}
                  aria-invalid={Boolean(error)}
                />
                <p className="text-xs text-muted-foreground">
                  Considere contas, dinheiro em espécie e investimentos. Valores negativos não são
                  aceitos aqui.
                </p>
                <div className="space-y-2 pt-4">
                  <Label htmlFor="renda">Quanto você recebe por mês (opcional)</Label>
                  <CurrencyInput id="renda" value={income} onValueChange={setIncome} />
                  <p className="text-xs text-muted-foreground">
                    Usamos para mostrar quanto da sua renda já está comprometido no mês.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Ainda para distribuir</span>
                  <span className="tabular font-semibold">{formatBRL(remaining)}</span>
                </div>

                {accounts.map((account, index) => (
                  <div key={account.key} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lugar {index + 1}</span>
                      {accounts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover"
                          onClick={() =>
                            setAccounts((list) => list.filter((item) => item.key !== account.key))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Nome</Label>
                        <Input
                          value={account.name}
                          maxLength={60}
                          placeholder="Conta corrente"
                          onChange={(e) =>
                            setAccounts((list) =>
                              list.map((item) =>
                                item.key === account.key ? { ...item, name: e.target.value } : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select
                          value={account.type}
                          onValueChange={(value) =>
                            setAccounts((list) =>
                              list.map((item) =>
                                item.key === account.key
                                  ? { ...item, type: value as AccountType }
                                  : item,
                              ),
                            )
                          }
                        >
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
                    </div>
                    <div className="space-y-1.5">
                      <Label>Saldo</Label>
                      <CurrencyInput
                        value={account.balance}
                        onValueChange={(value) =>
                          setAccounts((list) =>
                            list.map((item) =>
                              item.key === account.key ? { ...item, balance: value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    setAccounts((list) => [
                      ...list,
                      { key: newKey(), name: "", type: "dinheiro", balance: null },
                    ])
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar lugar
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={hasCard === true ? "default" : "outline"}
                    onClick={() => setHasCard(true)}
                  >
                    Sim, uso cartão
                  </Button>
                  <Button
                    variant={hasCard === false ? "default" : "outline"}
                    onClick={() => setHasCard(false)}
                  >
                    Não uso
                  </Button>
                </div>

                {hasCard &&
                  cards.map((card, index) => (
                    <div key={card.key} className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Cartão {index + 1}</span>
                        {cards.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remover cartão"
                            onClick={() =>
                              setCards((list) => list.filter((item) => item.key !== card.key))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Nome do cartão</Label>
                          <Input
                            value={card.name}
                            maxLength={60}
                            placeholder="Cartão principal"
                            onChange={(e) =>
                              setCards((list) =>
                                list.map((item) =>
                                  item.key === card.key ? { ...item, name: e.target.value } : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Instituição</Label>
                          <Input
                            value={card.institution}
                            maxLength={60}
                            placeholder="Opcional"
                            onChange={(e) =>
                              setCards((list) =>
                                list.map((item) =>
                                  item.key === card.key
                                    ? { ...item, institution: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Limite</Label>
                        <CurrencyInput
                          value={card.limit}
                          onValueChange={(value) =>
                            setCards((list) =>
                              list.map((item) =>
                                item.key === card.key ? { ...item, limit: value } : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Dia de fechamento</Label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={card.closing}
                            onChange={(e) =>
                              setCards((list) =>
                                list.map((item) =>
                                  item.key === card.key
                                    ? { ...item, closing: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Dia de vencimento</Label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={card.due}
                            onChange={(e) =>
                              setCards((list) =>
                                list.map((item) =>
                                  item.key === card.key ? { ...item, due: e.target.value } : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                {hasCard && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCards((list) => [
                        ...list,
                        {
                          key: newKey(),
                          name: "",
                          institution: "",
                          limit: null,
                          closing: "28",
                          due: "5",
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar cartão
                  </Button>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-nome">Nome da meta</Label>
                  <Input
                    id="meta-nome"
                    value={goalName}
                    maxLength={80}
                    placeholder="Reserva de emergência"
                    onChange={(e) => {
                      setGoalSkipped(false);
                      setGoalName(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-valor">Valor desejado</Label>
                  <CurrencyInput
                    id="meta-valor"
                    value={goalTarget}
                    onValueChange={(value) => {
                      setGoalSkipped(false);
                      setGoalTarget(value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-data">Quando quer alcançar</Label>
                  <Input
                    id="meta-data"
                    type="date"
                    value={goalDate}
                    onChange={(e) => {
                      setGoalSkipped(false);
                      setGoalDate(e.target.value);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGoalSkipped(true);
                    setGoalName("");
                    setGoalTarget(null);
                    setGoalDate("");
                    void finish();
                  }}
                  disabled={saving}
                >
                  Pular esta etapa
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Seu espaço financeiro está preparado. Levando você para a Visão Geral.
                </p>
                <Button onClick={() => navigate({ to: "/dashboard" })}>
                  Ir para a Visão Geral
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {step < 5 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setStep((value) => Math.max(1, value - 1));
                  }}
                  disabled={step === 1 || saving}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={goNext} disabled={saving}>
                  {saving ? "Salvando..." : step === 4 ? "Concluir" : "Continuar"}
                  {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
