import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLayout } from "@/components/app/LegalLayout";
import { PRICE_LABEL } from "@/lib/sales";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Patrimo" },
      {
        name: "description",
        content:
          "Condições de uso do Patrimo: licença de acesso, pagamento único, ativação, reembolso e LGPD.",
      },
      { property: "og:title", content: "Termos de Uso — Patrimo" },
      {
        property: "og:description",
        content:
          "Termos de uso, licença vitalícia, garantia de 7 dias e tratamento de dados conforme a LGPD.",
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
          Ao criar uma conta, adquirir uma licença e utilizar o Patrimo, você concorda com estes
          Termos de Uso e com a{" "}
          <Link to="/privacidade" className="text-primary hover:underline">
            Política de Privacidade e LGPD
          </Link>
          . Se não concordar, não adquira a licença nem utilize o serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. O que é o Patrimo</h2>
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
        <h2>3. Conta e cadastro</h2>
        <ul>
          <li>É necessário ter 18 anos ou mais e fornecer nome e e-mail válidos.</li>
          <li>Você é responsável por manter a senha em sigilo e pelo que ocorre na sua conta.</li>
          <li>Cada pessoa acessa apenas os próprios dados; não é permitido tentar acessar dados de terceiros.</li>
          <li>O acesso é pessoal e intransferível, vinculado ao titular da conta.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Licença de uso vitalícia</h2>
        <p>
          O Patrimo é comercializado por uma{" "}
          <strong>licença individual de pagamento único de {PRICE_LABEL}</strong>, sem mensalidade ou
          renovação.
        </p>
        <ul>
          <li>A licença dá acesso a todos os recursos do serviço enquanto ele existir, incluindo atualizações futuras.</li>
          <li>A licença é pessoal, não transferível e não compartilhável entre várias pessoas.</li>
          <li>Ao excluir sua conta, o acesso ao serviço com aquela licença é encerrado; a licença fica vinculada ao e-mail da compra e não pode ser transferida para outra conta.</li>
          <li>Podemos suspender o acesso por violação destes Termos, sem direito a reembolso nesse caso.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>5. Ativação</h2>
        <p>
          Após a confirmação do pagamento, seu acesso é liberado automaticamente na conta que usar o{" "}
          <strong>mesmo e-mail da compra</strong> — sem código para ativar.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Pagamentos</h2>
        <ul>
          <li>O pagamento é processado pelo provedor de checkout Wiven, com PIX (aprovação imediata), cartão de crédito ou boleto.</li>
          <li>Não coletamos, armazenamos ou processamos dados de cartão de crédito real de pagamento.</li>
          <li>Os cartões cadastrados no app são apenas rótulos para organizar suas faturas e não geram cobranças.</li>
          <li>Dúvidas sobre comprovante, nota fiscal ou cobrança devem ser tratadas com o provedor de checkout utilizado.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>7. Garantia e reembolso</h2>
        <p>
          Você tem <strong>7 (sete) dias de garantia</strong> a partir da compra. Dentro desse
          período, se o produto não atender, você pode solicitar o reembolso, que será processado
          pelo provedor de checkout conforme a política aplicável (incluindo o direito de
          arrependimento previsto no art. 49 do Código de Defesa do Consumidor para compras fora do
          estabelecimento comercial). Após o reembolso, o código de licença é revogado.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Conduta do usuário</h2>
        <ul>
          <li>É proibido usar o serviço para atividades ilícitas ou que violem direitos de terceiros.</li>
          <li>Não é permitido sobrecarregar a infraestrutura, tentar acessar sistemas alheios ou aplicar engenharia reversa.</li>
          <li>Comprar, revender ou distribuir códigos de licença sem autorização é proibido.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>9. Seus dados e a LGPD</h2>
        <p>
          Tratamos seus dados pessoais conforme a{" "}
          <Link to="/privacidade" className="text-primary hover:underline">
            Política de Privacidade e LGPD
          </Link>{" "}
          e a Lei nº 13.709/2018. Em resumo:
        </p>
        <ul>
          <li>
            <strong>Bases legais:</strong> execução do contrato (fornecer o serviço e validar sua
            licença), consentimento (onde você escolher fornecer dados além do necessário) e
            interesse legítimo (segurança e correção de falhas).
          </li>
          <li>
            <strong>Direitos do titular:</strong> você pode acessar, corrigir, exportar e excluir
            seus dados direto no app, e também se opor ou pedir esclarecimentos por e-mail.
          </li>
          <li>
            <strong>Dados de pagamento:</strong> não recebemos nem guardamos dados de cartão de
            crédito real; a venda e o reembolso são tratados pelo provedor de checkout.
          </li>
          <li>
            Em caso de incidente com dados pessoais, comunicaremos você e a ANPD conforme a lei.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>10. Disponibilidade e responsabilidade</h2>
        <p>
          O serviço é fornecido no estado em que se encontra. Não garantimos disponibilidade
          ininterrupta nem a exatidão de projeções, que dependem dos dados informados por você.
          Recomendamos exportar seus dados periodicamente pela tela de Perfil.
        </p>
      </section>

      <section className="space-y-3">
        <h2>11. Alterações e encerramento</h2>
        <ul>
          <li>Podemos alterar ou descontinuar funcionalidades, avisando com antecedência quando a mudança for relevante.</li>
          <li>Você pode encerrar sua conta quando quiser pela tela de Perfil, e seus dados serão excluídos.</li>
          <li>Podemos encerrar contas que violem estes Termos ou sejam usadas para fins ilícitos.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>12. Lei aplicável e contato</h2>
        <p>
          Estes Termos são regidos pelas leis brasileiras, incluindo a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).
          Dúvidas e solicitações: <strong>suportepatrimo@gmail.com</strong>.
        </p>
      </section>
    </LegalLayout>
  );
}