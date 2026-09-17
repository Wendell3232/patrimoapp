import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CHECKOUT_URL, PRICE_LABEL } from "@/lib/sales";

export const Route = createFileRoute("/oferta")({
  head: () => ({
    meta: [
      { title: "Patrimo — clareza para o seu dinheiro" },
      {
        name: "description",
        content: `Patrimo: organize suas finanças pessoais com contas, cartões, metas e relatórios claros. Pagamento único de ${PRICE_LABEL}.`,
      },
      {
        property: "og:title",
        content: "Patrimo — clareza para o seu dinheiro",
      },
      {
        property: "og:description",
        content: `Patrimo: organize suas finanças pessoais com contas, cartões, metas e relatórios claros. Pagamento único de ${PRICE_LABEL}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Oferta,
});

const CSS = `
.pl { --ink:#17212b; --muted:#66717d; --line:#e6e9ed; --paper:#ffffff; --canvas:#f8faf9; --green:#2869ed; --green-deep:#174fbe; --green-pale:#edf3ff; --blue:#2869ed; --shadow:0 20px 50px rgba(26,37,48,.09); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing:antialiased; background:var(--paper); color:var(--ink); }
html { scroll-behavior: smooth; }
.pl a { color: inherit; text-decoration: none; }
.pl .wrap { width:min(1120px, calc(100% - 48px)); margin:0 auto; }
.pl .notice { background:#174fbe; color:#fff; font-size:13px; padding:11px 0; text-align:center; }
.pl header { height:74px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); }
.pl .brand { display:inline-flex; align-items:center; gap:10px; font-weight:750; letter-spacing:-.03em; font-size:19px; }
.pl .mark { display:grid; place-items:center; width:28px; height:28px; border-radius:8px; background:var(--green); color:#fff; font-size:15px; font-weight:800; }
.pl nav { display:flex; gap:28px; align-items:center; color:var(--muted); font-size:14px; }
.pl .button { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:48px; padding:0 20px; border-radius:9px; background:var(--green); color:#fff; font-weight:700; font-size:15px; transition:.2s ease; }
.pl .button:hover { background:var(--green-deep); transform:translateY(-1px); }
.pl .button.light { background:#fff; color:var(--ink); border:1px solid var(--line); }
.pl .button.light:hover { background:#f5f7f6; }
.pl .button.small { min-height:38px; padding:0 14px; font-size:14px; }
.pl .hero { padding:92px 0 76px; background:linear-gradient(180deg,#fbfdfc 0%,#fff 100%); overflow:hidden; }
.pl .hero-grid { display:grid; grid-template-columns:.96fr 1.04fr; align-items:center; gap:70px; }
.pl .eyebrow { display:inline-flex; align-items:center; gap:8px; color:var(--green-deep); background:var(--green-pale); border-radius:999px; padding:7px 11px; font-size:13px; font-weight:700; }
.pl .eyebrow i { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--green); }
.pl h1 { max-width:640px; margin:18px 0; font-size:clamp(42px,5.1vw,66px); line-height:1.03; letter-spacing:-.065em; }
.pl .lead { max-width:530px; color:var(--muted); font-size:18px; line-height:1.6; }
.pl .hero-actions { display:flex; gap:12px; margin-top:29px; }
.pl .microcopy { margin:13px 0 0; color:var(--muted); font-size:13px; }
.pl .checkline { display:flex; flex-wrap:wrap; gap:16px; margin-top:29px; color:#3e4a54; font-size:13px; }
.pl .checkline span::before { content:"✓"; color:var(--green); font-weight:800; margin-right:6px; }
.pl .app-window { background:#fff; border:1px solid #dce4e0; border-radius:16px; box-shadow:var(--shadow); overflow:hidden; transform:rotate(1.5deg); }
.pl .app-top { height:44px; display:flex; align-items:center; gap:6px; padding:0 16px; background:#f6f8f7; border-bottom:1px solid var(--line); }
.pl .dot { width:8px; height:8px; border-radius:50%; background:#d2d9d5; }
.pl .app-body { display:grid; grid-template-columns:145px 1fr; min-height:365px; }
.pl .sidebar { padding:18px 13px; border-right:1px solid var(--line); color:#78828a; font-size:11px; }
.pl .side-brand { margin:0 0 22px 5px; color:var(--ink); font-size:14px; font-weight:800; }
.pl .side-item { padding:8px 8px; margin-bottom:5px; border-radius:6px; }
.pl .side-item.active { background:var(--green-pale); color:var(--green-deep); font-weight:700; }
.pl .dashboard { padding:24px 25px; }
.pl .dashboard-head { display:flex; justify-content:space-between; align-items:start; }
.pl .dashboard h3 { margin:0 0 4px; font-size:16px; letter-spacing:-.03em; }
.pl .dashboard small { color:#86909a; }
.pl .avatar { width:24px; height:24px; border-radius:50%; background:#dff0e9; }
.pl .balance { margin:25px 0 20px; font-size:25px; font-weight:760; letter-spacing:-.05em; }
.pl .balance span { display:block; margin-bottom:5px; font-size:10px; letter-spacing:0; color:#7c878f; font-weight:600; text-transform:uppercase; }
.pl .chart { display:flex; align-items:end; gap:8px; height:86px; padding:12px; background:#f7faf8; border-radius:9px; }
.pl .bar { width:14%; background:#b9dfd0; border-radius:4px 4px 0 0; }
.pl .bar:last-child { background:var(--green); }
.pl .cards { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:13px; }
.pl .mini-card { padding:12px; border:1px solid var(--line); border-radius:8px; }
.pl .mini-card b { display:block; margin-top:7px; font-size:13px; }
.pl .mini-card span { color:#7c878f; font-size:10px; }
.pl section { padding:96px 0; }
.pl .section-label { color:var(--green); font-size:13px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.pl h2 { max-width:650px; margin:10px 0 16px; font-size:clamp(32px,4vw,48px); letter-spacing:-.055em; line-height:1.08; }
.pl .section-lead { max-width:600px; color:var(--muted); font-size:17px; line-height:1.6; }
.pl .outcomes { padding-top:44px; display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.pl .outcome { padding:24px 0; border-top:1px solid var(--line); }
.pl .number { color:var(--green); font-size:13px; font-weight:800; }
.pl .outcome h3 { margin:17px 0 8px; font-size:19px; letter-spacing:-.035em; }
.pl .outcome p { margin:0; color:var(--muted); line-height:1.55; font-size:15px; }
.pl .soft { background:#f4f7ff; }
.pl .included { display:grid; grid-template-columns:.84fr 1.16fr; gap:70px; align-items:start; }
.pl .feature-list { border-top:1px solid var(--line); }
.pl .feature { display:grid; grid-template-columns:34px 1fr; gap:14px; padding:19px 0; border-bottom:1px solid var(--line); }
.pl .feature-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:8px; background:var(--green-pale); color:var(--green); font-weight:800; }
.pl .feature strong { display:block; margin-bottom:4px; font-size:15px; }
.pl .feature span { color:var(--muted); font-size:14px; line-height:1.5; }
.pl .how { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:48px; }
.pl .step { padding:25px; min-height:206px; border:1px solid var(--line); border-radius:12px; background:#fff; }
.pl .step-n { color:var(--green); font-size:13px; font-weight:800; }
.pl .step h3 { margin:34px 0 8px; font-size:19px; letter-spacing:-.03em; }
.pl .step p { margin:0; color:var(--muted); font-size:14px; line-height:1.55; }
.pl .honest { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:44px; }
.pl .honest-card { padding:28px; border-radius:12px; background:#fff; border:1px solid var(--line); }
.pl .honest-card h3 { margin:0 0 15px; font-size:19px; letter-spacing:-.035em; }
.pl .honest-card ul { margin:0; padding:0; list-style:none; }
.pl .honest-card li { position:relative; padding:8px 0 8px 23px; color:var(--muted); line-height:1.45; font-size:14px; }
.pl .honest-card li::before { content:"✓"; position:absolute; left:0; color:var(--green); font-weight:800; }
.pl .honest-card.no li::before { content:"—"; color:#8b959d; }
.pl .privacy { display:grid; grid-template-columns:.85fr 1.15fr; gap:70px; align-items:center; }
.pl .privacy-points { display:grid; gap:17px; }
.pl .privacy-points div { padding:16px 0; border-bottom:1px solid var(--line); }
.pl .privacy-points b { display:block; margin-bottom:5px; font-size:15px; }
.pl .privacy-points p { margin:0; color:var(--muted); font-size:14px; line-height:1.5; }
.pl .price-box { max-width:650px; margin:0 auto; text-align:center; border:1px solid #cfe7dc; border-radius:16px; padding:52px 32px; background:linear-gradient(135deg,#f0faf5,#fff); }
.pl .price-box h2 { margin:10px auto 7px; }
.pl .price { margin:20px 0 7px; font-size:58px; font-weight:800; letter-spacing:-.07em; }
.pl .price-sub { color:var(--muted); font-size:15px; }
.pl .price-box .button { min-width:260px; margin-top:27px; }
.pl .guarantee { margin-top:18px; color:var(--muted); font-size:13px; }
.pl .faq { max-width:760px; margin:38px auto 0; }
.pl details { padding:19px 0; border-bottom:1px solid var(--line); }
.pl summary { cursor:pointer; font-weight:700; font-size:16px; list-style:none; }
.pl summary::after { content:"+"; float:right; color:var(--green); font-size:21px; font-weight:400; }
.pl details[open] summary::after { content:"−"; }
.pl details p { max-width:680px; margin:13px 0 0; color:var(--muted); font-size:14px; line-height:1.6; }
.pl footer { padding:32px 0 44px; border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
.pl .footer-row { display:flex; align-items:center; justify-content:space-between; gap:20px; }
.pl .footer-links { display:flex; gap:18px; }
@media (max-width:760px) {
  .pl .wrap { width:min(100% - 34px, 560px); }
  .pl header { height:64px; }
  .pl nav { display:none; }
  .pl .hero { padding:64px 0 54px; }
  .pl .hero-grid, .pl .included, .pl .privacy { grid-template-columns:1fr; gap:42px; }
  .pl .hero-copy { text-align:center; }
  .pl h1 { font-size:45px; }
  .pl .lead { font-size:16px; }
  .pl .hero-actions { flex-direction:column; }
  .pl .checkline { justify-content:center; gap:9px 16px; }
  .pl .app-window { max-width:470px; margin:0 auto; transform:none; }
  .pl .app-body { grid-template-columns:100px 1fr; min-height:316px; }
  .pl .sidebar { padding:16px 8px; }
  .pl .dashboard { padding:20px 16px; }
  .pl section { padding:68px 0; }
  .pl .outcomes, .pl .how, .pl .honest { grid-template-columns:1fr; }
  .pl .outcomes { gap:0; }
  .pl .how { margin-top:32px; }
  .pl .price { font-size:50px; }
  .pl .price-box { padding:40px 20px; }
  .pl .price-box .button { min-width:100%; }
  .pl .footer-row { align-items:flex-start; flex-direction:column; }
}
`;

function Cta({ children }: { children: ReactNode }) {
  if (!CHECKOUT_URL.startsWith("http")) {
    return (
      <span className="button" style={{ opacity: 0.6, cursor: "not-allowed" }}>
        Link de pagamento em breve
      </span>
    );
  }
  return (
    <a className="button" href={CHECKOUT_URL} rel="noreferrer">
      {children}
    </a>
  );
}

function Oferta() {
  return (
    <div className="pl">
      <style>{CSS}</style>
      <div className="notice">Seu dinheiro mais claro. Sua rotina mais leve.</div>
      <header className="wrap">
        <a className="brand" href="#inicio" aria-label="Patrimo, início">
          <span className="mark">P</span>Patrimo
        </a>
        <nav aria-label="Navegação principal">
          <a href="#recebe">O que você recebe</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <i />
                Gerenciador financeiro pessoal
              </span>
              <h1>Clareza para cuidar melhor do seu dinheiro.</h1>
              <p className="lead">
                Contas, cartões, metas e orçamento em um só lugar. Veja para onde seu dinheiro vai e
                termine o mês com mais tranquilidade.
              </p>
              <div className="hero-actions">
                <Cta>
                  Começar por {PRICE_LABEL} <span>→</span>
                </Cta>
                <a className="button light" href="#recebe">
                  Ver o que está incluso
                </a>
              </div>
              <p className="microcopy">Pagamento único. Sem assinatura ou renovação automática.</p>
              <div className="checkline">
                <span>7 dias de garantia</span>
                <span>Sem mensalidade</span>
                <span>Comece em poucos minutos</span>
              </div>
            </div>
            <div className="app-window" aria-label="Prévia ilustrativa do aplicativo Patrimo">
              <div className="app-top">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <div className="app-body">
                <aside className="sidebar">
                  <div className="side-brand">P Patrimo</div>
                  <div className="side-item active">Visão geral</div>
                  <div className="side-item">Contas</div>
                  <div className="side-item">Cartões</div>
                  <div className="side-item">Metas</div>
                  <div className="side-item">Relatórios</div>
                </aside>
                <div className="dashboard">
                  <div className="dashboard-head">
                    <div>
                      <h3>Olá, Marina</h3>
                      <small>Visão de setembro</small>
                    </div>
                    <span className="avatar" />
                  </div>
                  <div className="balance">
                    <span>Saldo disponível</span>R$ 4.280,00
                  </div>
                  <div className="chart">
                    <div className="bar" style={{ height: "34%" }} />
                    <div className="bar" style={{ height: "51%" }} />
                    <div className="bar" style={{ height: "42%" }} />
                    <div className="bar" style={{ height: "68%" }} />
                    <div className="bar" style={{ height: "82%" }} />
                    <div className="bar" style={{ height: "100%" }} />
                  </div>
                  <div className="cards">
                    <div className="mini-card">
                      <span>Entradas</span>
                      <b>R$ 6.500</b>
                    </div>
                    <div className="mini-card">
                      <span>Saídas</span>
                      <b>R$ 2.220</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recebe">
          <div className="wrap">
            <span className="section-label">Do seu jeito</span>
            <h2>Menos esforço para organizar. Mais contexto para decidir.</h2>
            <p className="section-lead">
              O Patrimo reúne os números que hoje ficam espalhados entre anotações, planilhas e
              memória.
            </p>
            <div className="outcomes">
              <article className="outcome">
                <span className="number">01</span>
                <h3>Veja seu mês com clareza</h3>
                <p>Acompanhe entradas, despesas e saldo sem precisar somar tudo no fim do mês.</p>
              </article>
              <article className="outcome">
                <span className="number">02</span>
                <h3>Planeje sem adivinhar</h3>
                <p>Crie metas e orçamentos em reais para transformar intenção em acompanhamento.</p>
              </article>
              <article className="outcome">
                <span className="number">03</span>
                <h3>Antecipe compromissos</h3>
                <p>Tenha cartões e compras parceladas visíveis antes de elas virarem surpresa.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="soft">
          <div className="wrap included">
            <div>
              <span className="section-label">O que você recebe</span>
              <h2>O essencial para acompanhar sua vida financeira.</h2>
              <p className="section-lead">
                Tudo já está liberado na mesma licença. Sem planos, bloqueios ou cobrança mensal.
              </p>
            </div>
            <div className="feature-list">
              <div className="feature">
                <span className="feature-icon">01</span>
                <div>
                  <strong>Contas, saldos e patrimônio</strong>
                  <span>
                    Registre onde seu dinheiro está e acompanhe sua evolução ao longo do tempo.
                  </span>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">02</span>
                <div>
                  <strong>Cartões e compras parceladas</strong>
                  <span>Organize faturas e veja compromissos futuros antes do fechamento.</span>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">03</span>
                <div>
                  <strong>Metas e orçamentos</strong>
                  <span>
                    Defina um destino para o dinheiro e acompanhe o avanço em valores reais.
                  </span>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">04</span>
                <div>
                  <strong>Relatórios simples</strong>
                  <span>Entenda suas entradas, saídas e categorias sem montar fórmulas.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona">
          <div className="wrap">
            <span className="section-label">Comece em poucos minutos</span>
            <h2>Um processo simples, sem surpresa depois da compra.</h2>
            <div className="how">
              <article className="step">
                <span className="step-n">01</span>
                <h3>Escolha sua licença</h3>
                <p>Faça um único pagamento por PIX, cartão ou boleto, pelo checkout seguro.</p>
              </article>
              <article className="step">
                <span className="step-n">02</span>
                <h3>Receba a confirmação</h3>
                <p>Após o pagamento, seu acesso é liberado automaticamente no e-mail da compra.</p>
              </article>
              <article className="step">
                <span className="step-n">03</span>
                <h3>Crie sua conta</h3>
                <p>
                  Entre com o mesmo e-mail da compra, seu acesso já estará liberado. Cadastre suas
                  contas e comece pelo que já importa para você.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="soft">
          <div className="wrap">
            <span className="section-label">Para a sua rotina</span>
            <h2>Você não precisa ser especialista em finanças para se sentir no controle.</h2>
            <p className="section-lead">
              Comece pelo que já faz parte da sua vida. O Patrimo organiza os números para você
              enxergar suas escolhas com mais calma.
            </p>
            <div className="honest">
              <article className="honest-card">
                <h3>Quando o dinheiro fica visível</h3>
                <ul>
                  <li>Fica mais fácil decidir se cabe uma compra agora.</li>
                  <li>Você acompanha suas metas sem perder o ânimo no caminho.</li>
                  <li>O fechamento do mês deixa de ser uma surpresa.</li>
                </ul>
              </article>
              <article className="honest-card">
                <h3>Feito para ser simples</h3>
                <ul>
                  <li>Visual limpo, em celular, tablet ou computador.</li>
                  <li>Registros rápidos, sem planilhas complicadas.</li>
                  <li>Tudo o que você precisa, sem pagar de novo todo mês.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="soft" id="preco">
          <div className="wrap">
            <div className="price-box">
              <span className="section-label">Licença individual</span>
              <h2>Organize sua vida financeira com um único pagamento.</h2>
              <div className="price">{PRICE_LABEL}</div>
              <p className="price-sub">Sem mensalidade e sem renovação automática.</p>
              <Cta>
                Garantir meu acesso <span>→</span>
              </Cta>
              <p className="guarantee">
                Você tem 7 dias para conhecer o produto. Se não fizer sentido para você, peça o
                reembolso.
              </p>
            </div>
          </div>
        </section>

        <section id="duvidas">
          <div className="wrap">
            <div style={{ textAlign: "center" }}>
              <span className="section-label">Dúvidas frequentes</span>
              <h2 style={{ marginLeft: "auto", marginRight: "auto" }}>
                Tudo para você começar com segurança.
              </h2>
            </div>
            <div className="faq">
              <details>
                <summary>Preciso pagar todo mês?</summary>
                <p>
                  Não. Você faz um único pagamento de {PRICE_LABEL}. Não há assinatura nem renovação
                  automática.
                </p>
              </details>
              <details>
                <summary>Como começo a usar?</summary>
                <p>
                  Após a confirmação do pagamento, crie sua conta com o mesmo e-mail da compra e o
                  acesso já estará liberado. Comece pelas contas e gastos que já fazem parte da sua
                  rotina.
                </p>
              </details>
              <details>
                <summary>Posso usar no celular?</summary>
                <p>
                  Sim. O Patrimo foi pensado para acompanhar sua rotina no celular, tablet ou
                  computador.
                </p>
              </details>
              <details>
                <summary>E se eu não gostar?</summary>
                <p>
                  Você tem 7 dias para conhecer o produto. Se não fizer sentido para você, solicite
                  o reembolso pelo canal de suporte informado no checkout.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-row">
          <div className="brand">
            <span className="mark">P</span>Patrimo
          </div>
          <div className="footer-links">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
            <a href="mailto:suportepatrimo@gmail.com">Suporte</a>
          </div>
          <span>Organização financeira pessoal. Não é recomendação de investimento.</span>
        </div>
      </footer>
    </div>
  );
}
