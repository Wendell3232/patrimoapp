import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

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

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center">
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Suas finanças em um só lugar.
        </h1>
        <p className="mt-5 text-base text-muted-foreground sm:text-lg">
          Contas, cartões, metas e relatórios simples, sem planilha.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/oferta">
              Criar minha conta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Acesso vitalício por R$ 37,90, pagamento único.
        </p>
      </main>
    </div>
  );
}