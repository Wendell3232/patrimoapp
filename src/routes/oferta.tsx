import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  PieChart,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CHECKOUT_URL, PRICE_LABEL } from "@/lib/sales";

export const Route = createFileRoute("/oferta")({
  head: () => ({
    meta: [
      { title: "Patrimo — Organize suas finanças por R$ 37,90 (pagamento único)" },
      {
        name: "description",
        content:
          "Controle contas, cartões, metas e orçamentos em reais, com patrimônio contínuo. Pagamento único de R$ 37,90 com acesso vitalício.",
      },
      { property: "og:title", content: "Patrimo — Organize suas finanças por R$ 37,90" },
      {
        property: "og:description",
        content:
          "Patrimônio contínuo, faturas de cartão, compromissos futuros e metas em um só lugar. Pagamento único, acesso vitalício.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Oferta,
});

const FEATURES = [
  {
    icon: Banknote,
    title: "Patrimônio contínuo",
    text: "Seu dinheiro acompanha a virada do mês sem retrabalho: o saldo de um mês vira o saldo do seguinte automaticamente.",
  },
  {
    icon: CreditCard,
    title: "Faturas que se pagam",
    text: "Compras parceladas entram no cartão uma a uma, mês após mês, e aparecem como compromissos futuros.",
  },
  {
    icon: PieChart,
    title: "Relatórios claros",
    text: "Entradas, saídas e sobras do período em gráficos simples. Você entende para onde seu dinheiro vai.",
  },
  {
    icon: Target,
    title: "Metas de verdade",
    text: "Reserva de emergência, viagem, entrada do carro: acompanhe o progresso em reais e a previsão de conclusão.",
  },
  {
    icon: Sparkles,
    title: "Assistente financeiro",
    text: "Pergunte e receba resumos e orientações sobre os seus números, baseados nos seus próprios dados.",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados só seus",
    text: "Sem conexão com bancos. Cada pessoa vê apenas os próprios dados, com login protegido.",
  },
];

const STEPS = [
  {
    title: "1. Compre",
    text: `Faça o pagamento único de ${PRICE_LABEL} com PIX, cartão ou boleto.`,
  },
  {
    title: "2. Receba o código",
    text: "Assim que o pagamento confirmar, você recebe um código de licença.",
  },
  {
    title: "3. Crie sua conta e ative",
    text: "Crie sua conta gratuita, cole o código e pronto: acesso vitalício.",
  },
];

const FAQ = [
  {
    q: "É mensal?",
    a: "Não. Você paga R$ 37,90 uma única vez e tem acesso vitalício, incluindo todas as atualizações futuras.",
  },
  {
    q: "Como recebo o acesso?",
    a: "Após a confirmação do pagamento, você recebe um código de licença. Basta criar sua conta no app e colar o código na tela de ativação.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "PIX (aprovação imediata), cartão de crédito e boleto, direto na página de checkout.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Não conectamos com o seu banco e cada pessoa acessa apenas os próprios dados, protegidos por login e senha.",
  },
];

function BuyButton({ big = true }: { big?: boolean }) {
  if (!CHECKOUT_URL.startsWith("http")) {
    return (
      <Button size={big ? "lg" : "default"} disabled>
        Link de pagamento em breve
      </Button>
    );
  }
  return (
    <Button asChild size={big ? "lg" : "default"}>
      <a href={CHECKOUT_URL} target="_blank" rel="noreferrer">
        Garantir acesso por {PRICE_LABEL}
        <ArrowRight className="ml-2 h-4 w-4" />
      </a>
    </Button>
  );
}

function Oferta() {
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

      <main>
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Gerenciador financeiro pessoal
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Seu patrimônio, mês a mês, sem planilha.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Contas, cartões parcelados, metas e relatórios em reais — com o saldo sempre
            acompanhando a virada do mês.
          </p>

          <div className="mt-10 rounded-2xl border border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">Pagamento único</p>
            <p className="mt-1 font-display text-5xl font-bold tracking-tight">
              {PRICE_LABEL}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">acesso vitalício, sem mensalidade</p>
            <div className="mt-6 flex justify-center">
              <BuyButton />
            </div>
            <ul className="mx-auto mt-6 grid max-w-sm gap-2 text-left text-sm text-muted-foreground">
              {["Pagamento único de R$ 37,90", "Acesso vitalício com atualizações", "Cancelamento não é necessário — você nunca renova"].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-display text-2xl font-semibold">Como funciona</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step) => (
                <Card key={step.title}>
                  <CardContent className="space-y-2 p-5">
                    <p className="text-sm font-semibold text-primary">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-center font-display text-2xl font-semibold">
            O que você ganha
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="space-y-3 p-5">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <p className="font-semibold">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="text-center font-display text-2xl font-semibold">Dúvidas frequentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <Card key={item.q}>
                <CardContent className="p-5">
                  <p className="font-medium">{item.q}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-semibold">
            Mais um motivo para começar hoje.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {PRICE_LABEL} é menos do que um lanche. Seu controle financeiro dura a vida toda.
          </p>
          <div className="mt-6 flex justify-center">
            <BuyButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Garantia de 7 dias: se não servir, devolvemos seu dinheiro.
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        <p>
          Patrimo ·{" "}
          <Link to="/privacidade" className="hover:underline">
            Privacidade
          </Link>{" "}
          ·{" "}
          <Link to="/termos" className="hover:underline">
            Termos de Uso
          </Link>
        </p>
        <p className="mt-2">
          As informações exibidas são calculadas com base nos dados que você informa e não
          constituem recomendação de investimento.
        </p>
      </footer>
    </div>
  );
}