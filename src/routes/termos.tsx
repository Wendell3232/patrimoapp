import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLayout } from "@/components/app/LegalLayout";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Patrimo" },
      {
        name: "description",
        content:
          "Condições de uso do Patrimo: responsabilidades, conta, conteúdo do usuário e encerramento.",
      },
      { property: "og:title", content: "Termos de Uso — Patrimo" },
      {
        property: "og:description",
        content: "Condições de uso do Patrimo para organização financeira pessoal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="setembro de 2026">
      <section className="space-y-3">
        <h2>1. Aceitação</h2>
        <p>
          Ao criar uma conta e utilizar o Patrimo, você concorda com estes Termos de Uso e com a{" "}
          <Link to="/privacidade" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
          . Se não concordar, não utilize o serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. O que o Patrimo é</h2>
        <p>
          O Patrimo é uma ferramenta de organização financeira pessoal em reais. Você registra
          manualmente contas, cartões, lançamentos, compromissos, metas e orçamentos, e o app
          calcula patrimônio, resultados mensais e projeções a partir desses registros.
        </p>
        <ul>
          <li>Não há conexão com bancos, Open Finance ou importação automática de extratos.</li>
          <li>Não somos instituição financeira e não realizamos pagamentos ou transferências reais.</li>
          <li>
            O conteúdo do app, incluindo o assistente financeiro, é informativo e não constitui
            recomendação de investimento.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Conta e uso</h2>
        <ul>
          <li>É necessário ter 18 anos ou mais e fornecer nome e e-mail válidos.</li>
          <li>Você é responsável por manter a senha em sigilo e pelo que ocorre na sua conta.</li>
          <li>Cada pessoa acessa apenas os próprios dados; não é permitido tentar acessar dados de terceiros.</li>
          <li>
            É proibido usar o serviço para atividades ilícitas, sobrecarregar a infraestrutura ou
            aplicar engenharia reversa.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Seus dados e seus registros</h2>
        <p>
          Os registros financeiros que você insere são seus. Você pode corrigi-los, exportá-los em
          formato JSON e excluir a conta com todos os dados a qualquer momento, direto na tela de
          Perfil, sem precisar pedir por e-mail.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Serviço gratuito e sem cobranças</h2>
        <p>
          Hoje o Patrimo não possui planos pagos, cobranças, assinaturas ou processamento de
          pagamentos. Nenhum dado de cartão de crédito real é coletado — os cartões cadastrados são
          apenas rótulos para organizar suas faturas.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Disponibilidade e responsabilidade</h2>
        <p>
          O serviço é fornecido no estado em que se encontra. Não garantimos disponibilidade
          ininterrupta nem a exatidão de projeções, que dependem dos dados informados por você.
          Recomendamos exportar seus dados periodicamente.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Alterações e encerramento</h2>
        <ul>
          <li>Podemos alterar ou descontinuar funcionalidades, avisando com antecedência quando a mudança for relevante.</li>
          <li>Você pode encerrar sua conta quando quiser pela tela de Perfil.</li>
          <li>Podemos encerrar contas que violem estes Termos ou sejam usadas para fins ilícitos.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>8. Lei aplicável e contato</h2>
        <p>
          Estes Termos são regidos pelas leis brasileiras, incluindo a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018). Dúvidas e solicitações:{" "}
          <strong>privacidade@patrimoapp.com</strong>.
        </p>
      </section>
    </LegalLayout>
  );
}
