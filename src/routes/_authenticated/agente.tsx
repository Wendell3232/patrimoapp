import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Lightbulb,
  Loader2,
  MessageSquare,
  PiggyBank,
  Send,
  Sparkles,
  Target,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { analyzeFinanceQuery } from "@/lib/agent-engine";
import { askAgent } from "@/lib/agent.functions";
import { useFinance } from "@/lib/data";
import {
  expensesByCategory,
  futureCommitments,
  goalPacing,
  periodTotals,
} from "@/lib/finance";
import { formatBRL, monthKeyToday, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/agente")({
  head: () => ({
    meta: [
      { title: "Agente Financeiro — Patrimo" },
      {
        name: "description",
        content: "Assistente inteligente com leitura clara dos seus números e insights práticos.",
      },
      { property: "og:title", content: "Agente Financeiro — Patrimo" },
      {
        property: "og:description",
        content: "Assistente inteligente com leitura clara dos seus números e insights práticos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agente,
});

interface StructuredInsight {
  id: string;
  icon: typeof Sparkles;
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  actions: { label: string; to: string }[];
}

const SUGGESTED_QUESTIONS = [
  "Onde estou gastando mais este mês?",
  "Quanto posso gastar até o fim do mês?",
  "Quais contas vencem esta semana?",
  "Estou conseguindo cumprir minhas metas?",
  "Quais gastos posso revisar?",
  "Como está o uso dos meus cartões de crédito?",
];

/** Renderiza a resposta do agente com suporte a negrito (**texto**) e bullet points. */
function FormattedAgentAnswer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className={line.startsWith("•") || line.startsWith("-") ? "pl-2" : ""}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={pIdx} className="font-semibold text-foreground">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

function Agente() {
  const { data, isLoading } = useFinance();
  const navigate = useNavigate();
  // ask é usado apenas como fallback quando data não estiver disponível no cliente
  const ask = useServerFn(askAgent);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resumo mensal no topo e 3 insights estruturados
  const { monthSummary, topInsights } = useMemo(() => {
    if (!data) return { monthSummary: "", topInsights: [] };

    const month = monthKeyToday();
    const start = `${month}-01`;
    const end = toISODate(new Date());
    const totals = periodTotals(data.transactions, start, end);

    const monthSummary =
      totals.result >= 0
        ? `Este mês entraram ${formatBRL(totals.income)}, saíram ${formatBRL(totals.expense)} e sobraram ${formatBRL(totals.result)}.`
        : `Este mês entraram ${formatBRL(totals.income)}, saíram ${formatBRL(totals.expense)} e faltaram ${formatBRL(Math.abs(totals.result))}.`;

    const insights: StructuredInsight[] = [];

    // 1. Maior categoria de despesa
    const topCategory = expensesByCategory(data.transactions, data.categories, start, end)[0];
    if (topCategory && topCategory.total > 0) {
      insights.push({
        id: "top-expense",
        icon: PiggyBank,
        whatHappened: `Você gastou mais com ${topCategory.name} neste mês: ${formatBRL(topCategory.total)}.`,
        whyItMatters: `Isso representa ${topCategory.share.toFixed(0)}% de todas as suas despesas do período.`,
        whatToDo: "Verifique se esses gastos estão de acordo com o seu planejamento.",
        actions: [
          { label: `Ver gastos de ${topCategory.name}`, to: "/movimentacoes" },
          { label: "Definir orçamento", to: "/orcamentos" },
        ],
      });
    }

    // 2. Próximos pagamentos
    const upcoming = futureCommitments(data.commitments)[0];
    if (upcoming && upcoming.despesas > 0) {
      insights.push({
        id: "upcoming-bills",
        icon: CalendarClock,
        whatHappened: `Você tem ${formatBRL(upcoming.despesas)} em pagamentos previstos para ${upcoming.label}.`,
        whyItMatters: "Conhecer as saídas com antecedência evita juros e surpresas no saldo.",
        whatToDo: "Confira as datas de vencimento e reserve o saldo na sua conta bancária.",
        actions: [
          { label: "Ver contas futuras", to: "/compromissos" },
          { label: "Ver cartões", to: "/cartoes" },
        ],
      });
    }

    // 3. Metas prioritárias
    if (data.goals.length > 0) {
      const activeGoal = data.goals[0];
      const pacing = goalPacing(activeGoal);
      insights.push({
        id: "goal-insight",
        icon: Target,
        whatHappened: `Para a meta "${activeGoal.name}", faltam ${formatBRL(pacing.missing)}.`,
        whyItMatters: `Guardando ${formatBRL(pacing.monthlyNeeded)} por mês você alcança o prazo estipulado.`,
        whatToDo: "Separe uma quantia neste mês para manter o ritmo sem aperto.",
        actions: [
          { label: "Ver detalhes da meta", to: "/metas" },
          { label: "Registrar valor guardado", to: "/metas" },
        ],
      });
    }

    return {
      monthSummary,
      topInsights: insights.slice(0, 3),
    };
  }, [data]);

  async function handleAsk(queryToAsk?: string) {
    const q = (queryToAsk ?? question).trim();
    if (q.length < 3) {
      setError("Escreva sua dúvida com mais detalhes.");
      return;
    }
    setPending(true);
    setError(null);

    try {
      // Motor analítico direto no cliente (usa os dados já carregados — sem latência de rede)
      if (data) {
        // Pequeno delay para UX fluida
        await new Promise((resolve) => setTimeout(resolve, 380));
        setAnswer(analyzeFinanceQuery(q, data));
        return;
      }

      // Fallback via server function quando os dados do cliente não estão disponíveis
      const result = await ask({ data: { question: q } });
      setAnswer(result.answer);
    } catch {
      if (data) {
        setAnswer(analyzeFinanceQuery(q, data));
      } else {
        setError("Não consegui analisar agora. Tente novamente em instantes.");
      }
    } finally {
      setPending(false);
    }
  }

  function handleSelectQuestion(q: string) {
    setQuestion(q);
    void handleAsk(q);
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Agente Financeiro">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Agente Financeiro"
      description="Assistente inteligente com explicações acolhedoras sobre os seus números"
    >
      <div className="space-y-6">
        {/* RESUMO RÁPIDO DO MÊS */}
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Visão rápida do mês
            </span>
            <p className="mt-0.5 font-bold text-base text-foreground sm:text-lg">
              {monthSummary || "Nenhum lançamento registrado neste mês ainda."}
            </p>
          </div>
        </div>

        {/* 3 INSIGHTS ESTRUTURADOS */}
        {topInsights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Insights prioritários do momento
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              {topInsights.map((insight) => (
                <Card key={insight.id} className="flex flex-col justify-between border-border/80 shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-primary">
                      <insight.icon className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">O que aconteceu</span>
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1">
                      {insight.whatHappened}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">Por que importa:</span>
                      <p className="text-muted-foreground mt-0.5">{insight.whyItMatters}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground">O que você pode fazer:</span>
                      <p className="text-muted-foreground mt-0.5">{insight.whatToDo}</p>
                    </div>

                    <div className="pt-2 border-t border-border flex flex-col gap-1.5">
                      {insight.actions.map((act) => (
                        <Button
                          key={act.label}
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 justify-between text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 px-2"
                        >
                          <Link to={act.to}>
                            <span>{act.label}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PERGUNTAS E RESPOSTAS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Caixa de Pergunta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Faça uma pergunta ao Agente
              </CardTitle>
              <CardDescription className="text-xs">
                O Agente analisa seus dados reais e responde em linguagem simples, sem jargões técnicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chips de perguntas sugeridas */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Perguntas sugeridas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((sug) => (
                    <Button
                      key={sug}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full font-normal"
                      onClick={() => handleSelectQuestion(sug)}
                      disabled={pending}
                    >
                      {sug}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handleAsk();
                    }
                  }}
                  placeholder="Digite sua dúvida... (ex: quanto posso gastar neste fim de semana?)"
                  rows={3}
                  className="resize-none text-sm"
                  maxLength={500}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                  onClick={() => void handleAsk()}
                  disabled={pending || question.trim().length < 3}
                  className="w-full"
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Analisando seus dados...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-4 w-4" />
                      Consultar Agente
                    </>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Ctrl+Enter para enviar · O agente usa somente os seus dados cadastrados
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Caixa de Resposta */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Resposta do Agente
              </CardTitle>
              <CardDescription className="text-xs">
                Explicações acolhedoras baseadas nas suas contas, cartões e movimentações reais.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {pending ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                  <p className="text-xs text-muted-foreground">Analisando seus dados financeiros...</p>
                </div>
              ) : answer ? (
                <div className="rounded-xl border border-primary/20 bg-accent/30 p-4">
                  <FormattedAgentAnswer content={answer} />
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  Selecione uma das perguntas sugeridas ou escreva sua dúvida ao lado para iniciar a conversa.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
