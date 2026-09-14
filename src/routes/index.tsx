import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard, LineChart, Moon, ShieldCheck, Target, Wallet } from "lucide-react";

import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patrimo — Organização financeira pessoal" },
      {
        name: "description",
        content:
          "Controle contas, cartões, metas e orçamentos em reais, com patrimônio contínuo e relatórios claros.",
      },
      { property: "og:title", content: "Patrimo — Organização financeira pessoal" },
      {
        property: "og:description",
        content:
          "Patrimônio contínuo, faturas de cartão, compromissos futuros e metas em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Wallet,
    title: "Patrimônio contínuo",
    text: "Seu saldo acumula mês após mês. Transferências entre contas não distorcem nada.",
  },
  {
    icon: CreditCard,
    title: "Cartões sem surpresa",
    text: "Compras parceladas geram as parcelas futuras e a fatura só debita no pagamento.",
  },
  {
    icon: Target,
    title: "Metas com cálculo pronto",
    text: "Informe o valor e o prazo. Mostramos quanto guardar por mês.",
  },
  {
    icon: LineChart,
    title: "Relatórios objetivos",
    text: "Entradas, despesas, categorias e evolução do patrimônio em gráficos limpos.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <span className="flex items-center gap-3 font-display text-xl font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              P
            </span>
            Patrimo
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase text-primary">Finanças pessoais em reais</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Enxergue seu dinheiro por completo, do saldo de hoje ao compromisso do próximo ano.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Contas, cartões, parcelas, metas e orçamentos organizados com regras financeiras
            corretas. Sem conexão bancária, sem planilha, sem ruído.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Criar minha conta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Cada pessoa acessa apenas os próprios dados.
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Moon className="h-4 w-4 text-primary" />
            Tema claro, escuro ou automático.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-lg border border-border bg-card p-6 shadow-elevated transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10">
                <pillar.icon className="h-5 w-5 text-primary" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">{pillar.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{pillar.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
