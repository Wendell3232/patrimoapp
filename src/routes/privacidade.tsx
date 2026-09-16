import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLayout } from "@/components/app/LegalLayout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e LGPD — Patrimo" },
      {
        name: "description",
        content:
          "Como o Patrimo coleta, usa e protege seus dados, e como exercer seus direitos previstos na LGPD.",
      },
      { property: "og:title", content: "Privacidade e LGPD — Patrimo" },
      {
        property: "og:description",
        content: "Dados coletados, bases legais, retenção, segurança e direitos do titular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalLayout title="Política de Privacidade e LGPD" updatedAt="setembro de 2026">
      <section className="space-y-3">
        <h2>1. Quem trata seus dados</h2>
        <p>
          O Patrimo trata seus dados pessoais como controlador, conforme a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018). Contato de privacidade e encarregado (DPO):{" "}
          <strong>suportepatrimo@gmail.com</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Dados que coletamos</h2>
        <h3>Você informa</h3>
        <ul>
          <li>Cadastro: nome completo e e-mail.</li>
          <li>Código de licença: para validar seu acesso vitalício após a compra.</li>
          <li>
            Senha: armazenada apenas como hash pelo nosso provedor de autenticação; nunca temos
            acesso ao texto original.
          </li>
          <li>
            Dados financeiros que você digita: renda mensal, contas, saldos, cartões, lançamentos,
            compromissos, metas e orçamentos.
          </li>
          <li>Perguntas enviadas ao assistente financeiro.</li>
        </ul>
        <h3>Coletado automaticamente</h3>
        <ul>
          <li>Registros técnicos de acesso e erros (data, hora, tipo de requisição) para segurança e correção de falhas.</li>
          <li>Sessão de login e preferência de tema, guardados no seu próprio navegador.</li>
        </ul>
        <h3>Não coletamos</h3>
        <ul>
          <li>CPF, RG, endereço, telefone ou foto.</li>
          <li>Dados de cartão de crédito real, dados bancários ou acesso a extratos.</li>
          <li>Cookies de publicidade ou rastreamento de terceiros para marketing.</li>
        </ul>
        <p>
          Não usamos logins de terceiros: o acesso à conta é feito apenas com
          e-mail e senha cadastrados no Patrimo.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Para que usamos</h2>
        <ul>
          <li><strong>Execução do contrato:</strong> manter sua conta, validar sua licença e calcular seus números.</li>
          <li><strong>Consentimento:</strong> uso do assistente financeiro.</li>
          <li><strong>Interesse legítimo:</strong> segurança, prevenção de abuso e correção de erros.</li>
          <li><strong>Obrigação legal:</strong> atendimento a determinações legais e a pedidos de titulares.</li>
        </ul>
        <p>
          Não vendemos dados pessoais, não fazemos marketing direto sem consentimento e não tomamos
          decisões automatizadas que restrinjam seus direitos.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Compartilhamento</h2>
        <p>Compartilhamos o mínimo necessário com operadores que sustentam o serviço:</p>
        <ul>
          <li>Provedor de hospedagem, banco de dados e autenticação da aplicação.</li>
          <li>Provedor do modelo de linguagem que responde no assistente financeiro, apenas quando você envia uma pergunta.</li>
          <li>Provedor de checkout (Wiven): apenas o necessário para concluir a compra e o reembolso. Não armazenamos dados de cartão de crédito real de pagamento.</li>
          <li>Autoridades competentes, quando houver obrigação legal ou ordem judicial.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>5. Segurança</h2>
        <ul>
          <li>Transmissão criptografada por HTTPS/TLS e dados em repouso criptografados pelo provedor.</li>
          <li>Isolamento por usuário no banco de dados: cada consulta só devolve os registros do próprio titular.</li>
          <li>Visitantes não autenticados não têm nenhum acesso às tabelas de dados.</li>
          <li>Senhas com hash e verificação contra listas públicas de senhas vazadas.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente imune a incidentes. Em caso de incidente relevante,
          comunicaremos você e a ANPD conforme a LGPD.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Retenção e exclusão</h2>
        <ul>
          <li>Seus dados ficam guardados enquanto sua conta existir.</li>
          <li>Ao excluir a conta pela tela de Perfil, seus registros financeiros e seu perfil são apagados de imediato.</li>
          <li>Registros técnicos de segurança podem permanecer por até 90 dias.</li>
          <li>Cópias de backup do provedor são sobrescritas em até 30 dias.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>7. Seus direitos LGPD e como exercê-los no app</h2>
        <ul>
          <li><strong>Acesso e portabilidade:</strong> baixe todos os seus dados em JSON em Perfil, no cartão Privacidade e dados.</li>
          <li><strong>Correção:</strong> edite nome, renda, contas e lançamentos nas próprias telas do app.</li>
          <li><strong>Exclusão e revogação de consentimento:</strong> use Excluir minha conta em Perfil.</li>
          <li><strong>Informação e oposição:</strong> esta página descreve todo o tratamento; para se opor a algum uso, escreva para <strong>suportepatrimo@gmail.com</strong>.</li>
        </ul>
        <p>
          Pedidos enviados por e-mail são confirmados em até 2 dias úteis e respondidos em até 15
          dias, sem custo.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Menores de idade</h2>
        <p>O Patrimo é destinado a maiores de 18 anos e não coleta dados de menores intencionalmente.</p>
      </section>

      <section className="space-y-3">
        <h2>9. Alterações</h2>
        <p>
          Se esta política mudar de forma relevante, avisaremos no app antes de a mudança valer.
          Veja também os{" "}
          <Link to="/termos" className="text-primary hover:underline">
            Termos de Uso
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
