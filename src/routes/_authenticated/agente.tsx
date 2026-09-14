import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { askAgent } from "@/lib/agent.functions";
import { useFinance } from "@/lib/data";
import {
  budgetStatus,
  cardUsedLimit,
  expensesByCategory,
  futureCommitments,
  netWorth,
  periodTotals,
  requiredMonthlySaving,
} from "@/lib/finance";
import { formatBRL, monthKeyToday, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/agente")({
  head: () => ({
    meta: [
      { title: "Agente Financeiro — Patrimo" },
      { name: "description", content: "Insights automáticos e perguntas sobre os seus números." },
      { property: "og:title", content: "Agente Financeiro — Patrimo" },
      { property: "og:description", content: "Insights automáticos e perguntas sobre os seus números." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agente,
});

function Agente() {
  const { data, isLoading } = useFinance();
  const ask = useServerFn(askAgent);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insights = useMemo(() => {
    if (!data) return [];
    const month = monthKeyToday();
    const start = `${month}-01`;
    const end = toISODate(new Date());
    const totals = periodTotals(data.transactions, start, end);
    const out: string[] = [];

    out.push(
      `Seu patrimônio atual é ${formatBRL(netWorth(data.accounts, data.transactions))}, somando todas as contas.`,
    );

    out.push(
      totals.result >= 0
        ? `Neste mês entraram ${formatBRL(totals.income)} e saíram ${formatBRL(totals.expense)}, com sobra de ${formatBRL(totals.result)}.`
        : `Neste mês você gastou ${formatBRL(Math.abs(totals.result))} mais do que recebeu.`,
    );

    const top = expensesByCategory(data.transactions, data.categories, start, end)[0];
    if (top) {
      out.push(
        `A maior despesa do mês é ${top.name}: ${formatBRL(top.total)}, ${top.share.toFixed(0)}% do total gasto.`,
      );
    }

    for (const status of budgetStatus(data.budgets, data.categories, data.transactions, month)) {
      if (status.level === "excedido") {
        out.push(
          `O orçamento de ${status.category?.name ?? "categoria"} passou do limite: ${formatBRL(status.spent)} de ${formatBRL(status.budget.limit_amount)}.`,
        );
      } else if (status.level === "atencao") {
        out.push(
          `O orçamento de ${status.category?.name ?? "categoria"} já usou ${status.usage.toFixed(0)}% do limite.`,
        );
      }
    }

    for (const card of data.cards.filter((c) => !c.archived)) {
      const used = cardUsedLimit(card, data.transactions);
      if (card.limit_amount > 0 && used / card.limit_amount >= 0.7) {
        out.push(
          `O cartão ${card.name} está com ${((used / card.limit_amount) * 100).toFixed(0)}% do limite comprometido.`,
        );
      }
    }

    const nextMonth = futureCommitments(data.commitments)[0];
    if (nextMonth) {
      out.push(
        `Em ${nextMonth.label} você tem ${formatBRL(nextMonth.despesas)} de compromissos já registrados.`,
      );
    }

    for (const goal of data.goals) {
      out.push(
        `Para a meta ${goal.name}, guarde ${formatBRL(requiredMonthlySaving(goal))} por mês até o prazo.`,
      );
    }

    return out;
  }, [data]);

  async function submit() {
    if (question.trim().length < 3) {
      setError("Escreva sua pergunta com um pouco mais de detalhe.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await ask({ data: { question: question.trim() } });
      setAnswer(result.answer);
    } catch {
      setError("Não consegui analisar agora. Tente novamente em instantes.");
    } finally {
      setPending(false);
    }
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Agente Financeiro">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Agente Financeiro" description="Leitura automática dos seus dados">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Registre lançamentos para receber análises.
              </p>
            ) : (
              insights.map((insight) => (
                <p key={insight} className="rounded-lg bg-muted px-4 py-3 text-sm">
                  {insight}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pergunte sobre seus números</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={question}
              maxLength={500}
              rows={3}
              placeholder="Quanto gastei com alimentação nos últimos três meses?"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button onClick={() => void submit()} disabled={pending}>
              <Send className="mr-1.5 h-4 w-4" />
              {pending ? "Analisando..." : "Perguntar"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {answer && (
              <div className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm">
                {answer}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
