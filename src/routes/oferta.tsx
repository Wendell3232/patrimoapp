import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Check,
  CreditCard,
  FileDown,
  LineChart,
  Lock,
  MessagesSquare,
  Moon,
  PieChart,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  X,
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

const NAV = [
  { href: "#produto", label: "Produto" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#preco", label: "Preço" },
  { href: "#duvidas", label: "Dúvidas" },
];

const TRUST = [
  { icon: Check, label: `Pagamento único de ${PRICE_LABEL}` },
  { icon: ShieldCheck, label: "LGPD · dados protegidos" },
  { icon: Lock, label: "Sem conexão com bancos" },
  { icon: Sparkles, label: "Acesso vitalício com atualizações" },
];

const WITHOUT = [
  "Planilha para atualizar toda semana",
  "Horas perdidas organizando números",
  "Dinheiro some sem você saber para onde foi",
  "Susto no fechamento do mês",
];

const WITH = [
  "Registrado em segundos, sem planilha",
  "Saldo acompanha a virada do mês automaticamente",
  "Relatórios mostram para onde o dinheiro foi",
  "Fechamento tranquilo, todo mês",
];

const STEPS = [
  {
    number: "01",
    title: "Compre",
    text: `Faça o pagamento único de ${PRICE_LABEL} com PIX, cartão ou boleto.`,
  },
  {
    number: "02",
    title: "Receba o código",
    text: "Assim que o pagamento confirmar, você recebe um código de licença.",
  },
  {
    number: "03",
    title: "Crie sua conta e ative",
    text: "Crie sua conta gratuita, cole o código na tela de ativação e pronto: acesso vitalício.",
  },
];

const FEATURES = [
  {
    icon: Wallet,
    title: "Contas e patrimônio",
    text: "Acompanhe seus saldos e veja seu patrimônio evoluir mês a mês, com o saldo seguindo para o mês seguinte.",
  },
  {
    icon: CreditCard,
    title: "Cartões e faturas",
    text: "Compras parceladas entram no cartão uma a uma e aparecem como compromissos futuros.",
  },
  {
    icon: PiggyBank,
    title: "Metas financeiras",
    text: "Reserva de emergência, viagem, entrada do carro: acompanhe o progresso em reais e a previsão de conclusão.",
  },
  {
    icon: LineChart,
    title: "Relatórios claros",
    text: "Entradas, saídas e sobras do período em gráficos simples. Você entende para onde seu dinheiro vai.",
  },
  {
    icon: Target,
    title: "Orçamentos",
    text: "Defina limites por categoria e veja, mês a mês, se está dentro do planejado.",
  },
  {
    icon: Bell,
    title: "Notificações",
    text: "Receba lembretes e avisos relacionados às suas finanças sem bagunçar sua tela.",
  },
  {
    icon: MessagesSquare,
    title: "Assistente financeiro",
    text: "Pergunte e receba resumos e orientações sobre os seus números, baseados nos seus próprios dados.",
  },
  {
    icon: FileDown,
    title: "Exportação dos seus dados",
    text: "Leve seus dados com você: exportação em JSON direto do app, quando quiser.",
  },
  {
    icon: Moon,
    title: "Tema claro e escuro",
    text: "Use no celular, tablet ou computador, com o visual que você prefere.",
  },
];

const PRIVACY = [
  {
    title: "Sem Open Finance",
    text: "Não conectamos no seu banco e nunca pedimos a senha do seu banco. Você lança manualmente.",
  },
  {
    title: "LGPD",
    text: "Tratamos seus dados conforme a Lei nº 13.709/2018, com direitos garantidos.",
  },
  {
    title: "Isolado por usuário",
    text: "Cada pessoa acessa apenas os próprios dados. Nada de dados de terceiros.",
  },
  {
    title: "Zero anúncios",
    text: "Não vendemos dados e não usamos seus números para rastreamento de publicidade.",
  },
];

const AI_PROMPS = [
  "Quanto gastei em restaurantes este mês?",
  "Onde posso cortar gastos?",
  "Quando vou atingir minha meta?",
];

const FAQ = [
  {
    q: "Preciso pagar todos os meses?",
    a: "Não. Você paga R$ 37,90 uma única vez e tem acesso vitalício, incluindo todas as atualizações futuras. Não há assinatura, renovação ou cobrança recorrente.",
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
    q: "E se eu não gostar?",
    a: "Você tem 7 dias de garantia. Se o produto não servir, devolvemos seu dinheiro.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Não conectamos com o seu banco, cada pessoa acessa apenas os próprios dados e o tratamento segue a LGPD. Veja a Política de Privacidade no rodapé.",
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
        {big && <ArrowRight className="ml-2 h-4 w-4" />}
      </a>
    </Button>
  );
}

function Oferta() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3 font-display text-xl font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              P
            </span>
            Patrimo
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <span className="hidden sm:inline-flex">
              <BuyButton big={false} />
            </span>
          </div>
        </div>
      </header>

      <main>
        <section className="text-center" id="produto">
          <div className="mx-auto max-w-3xl px-6 pb-14 pt-16 sm:pt-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Gerenciador financeiro pessoal
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Saiba para onde vai cada real.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Contas, cartões, metas e orçamentos em reais — sem planilha e sem dar a senha do seu
              banco. Acesso vitalício por um único pagamento.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <BuyButton />
              <Button asChild size="lg" variant="outline">
                <a href="#como-funciona">
                  Ver como funciona
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
            <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {TRUST.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <item.icon className="h-4 w-4 text-positive" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
              Imagine fechar o mês sem estresse.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <p className="font-semibold text-muted-foreground">Sem o Patrimo</p>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {WITHOUT.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-positive/40">
                <CardContent className="p-6">
                  <p className="font-semibold text-positive">Com o Patrimo</p>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {WITH.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14" id="como-funciona">
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
            Como funciona em 3 passos
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.number}>
                <CardContent className="space-y-3 p-6">
                  <p className="font-display text-3xl font-bold text-primary">{step.number}</p>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-6 py-14" id="recursos">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
              Tudo incluído. Sem esconder nada.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="space-y-3 p-6">
                    <feature.icon className="h-6 w-6 text-primary" />
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-14" id="privacidade">
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
            Privacidade que é princípio, não recurso.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            Você lança seus dados manualmente — seus números ficam só seus: isolados, sem anúncio e
            tratados conforme a LGPD.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRIVACY.map((item) => (
              <Card key={item.title}>
                <CardContent className="space-y-3 p-5">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link to="/privacidade">Ver nossa Política de Privacidade</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <MessagesSquare className="h-3.5 w-3.5" />
                Assistente financeiro
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">
                Pergunte qualquer coisa sobre o seu dinheiro.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                O assistente responde com base nos seus próprios dados, explicando em português
                claro — e nada sai da sua conta.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {AI_PROMPS.map((prompt) => (
                  <span
                    key={prompt}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    "{prompt}"
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-semibold text-foreground">Resumo instantâneo</p>
                <p className="mt-1.5">
                  Entenda entradas, saídas e sobras do período em segundos, sem abrir relatório.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-semibold text-foreground">Ensina, não só responde</p>
                <p className="mt-1.5">
                  Reserva de emergência, bola de neve, orçamento: o assistente explica no contexto
                  dos seus números.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-14" id="duvidas">
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
            Ainda na dúvida? A gente responde.
          </h2>
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

        <section className="border-t border-border bg-card/40 px-6 py-14" id="preco">
          <div className="mx-auto max-w-md">
            <Card>
              <CardContent className="space-y-4 p-8 text-center">
                <p className="text-sm text-muted-foreground">Pagamento único</p>
                <p className="font-display text-6xl font-bold tracking-tight">{PRICE_LABEL}</p>
                <p className="text-sm text-muted-foreground">
                  acesso vitalício, sem mensalidade e com atualizações inclusas
                </p>
                <ul className="mx-auto grid max-w-xs gap-2 text-left text-sm text-muted-foreground">
                  {[
                    "Todos os recursos liberados",
                    "Sem assinatura e sem renovação",
                    "Garantia de 7 dias",
                    "R$ 37,90 é menos do que um lanche",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-center pt-2">
                  <BuyButton />
                </div>
                <p className="text-xs text-muted-foreground">
                  PIX com aprovação imediata, cartão ou boleto.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Quanto você perdeu esse mês sem saber?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Não precisa de mais disciplina. Precisa de clareza. Pague uma vez e tenha controle
            financeiro por toda a vida.
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