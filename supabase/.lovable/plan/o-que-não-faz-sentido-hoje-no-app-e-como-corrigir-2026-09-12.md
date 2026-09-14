# O que não faz sentido hoje no app — e como corrigir

Auditoria feita lendo todo o código e as migrações. Abaixo, o que está incoerente, em ordem de gravidade, seguido do que eu faria.

## Problemas graves (quebram a regra financeira prometida)

1. **Fatura de cartão nunca é paga.** O app promete "a fatura só debita no pagamento", mas não existe nenhum botão de pagar fatura. Consequência: o saldo da conta fica sempre inflado, o patrimônio nunca desconta o que foi gasto no cartão e o limite disponível só diminui, nunca volta.
2. **"Marcar como pago" nos Compromissos não move dinheiro.** Só muda o rótulo para "pago"; não debita conta nem paga a fatura.
3. **Meta nunca evolui.** O valor já guardado é gravado só na criação e não há como registrar um aporte, então o "quanto guardar por mês" congela.
4. **Orçamentos só existem no mês atual.** Ao virar o mês, a tela fica vazia e é preciso recriar tudo à mão.
5. **Notificações nunca são criadas.** A tela promete avisos de orçamento, fatura e compromisso, mas nada gera esses avisos — ela fica sempre vazia.

## Fluxos que parecem funcionar mas não fazem nada

6. **Excluir categoria** mostra a mensagem "categoria em uso" que nunca acontece: na prática a exclusão sempre passa, apaga a categoria de todo o histórico e apaga os orçamentos ligados a ela, sem confirmação.
7. **Escolher plano** grava a escolha, mas não existe cobrança — parece assinatura e não é.
8. **Sem editar nem excluir** em Contas, Cartões, Metas e Orçamentos. Um saldo inicial errado ou cartão duplicado não tem como ser corrigido, mesmo existindo a ideia de "arquivar" no banco.
9. **Renda mensal** existe no banco e nunca é perguntada nem mostrada em lugar algum.

## Incoerências menores

10. **Variação em %** é calculada de três formas diferentes no mesmo painel: o patrimônio mostra "+100%" quando o período anterior era zero, enquanto Entradas e Despesas simplesmente escondem a variação na mesma situação.
11. **Primeiros passos sem porteiro.** Quem cria uma conta direto pela tela de Contas nunca passa pelo onboarding e fica marcado como "não concluiu" para sempre. Entrar com Google vai sempre para a Visão Geral, mesmo sendo o primeiro acesso.
12. **Limite estourado sem alerta.** O "limite disponível" pode aparecer negativo sem nenhum destaque visual.
13. **No celular**, Orçamentos, Relatórios, Perfil e Configurações ficam só no menu lateral, fora da barra inferior.
14. **Dados de demonstração** existem no banco como rotina pronta, mas nada no app os usa — código morto que confunde.

## Como eu corrijo (ordem sugerida)

**Etapa 1 — fechar o ciclo do dinheiro (o mais importante)**
- Botão "Pagar fatura" no cartão: escolhe a conta, o valor e a data, debita o saldo, baixa os compromissos da fatura e libera o limite.
- "Marcar como pago" nos Compromissos passa a registrar o pagamento de verdade (ou pagar a fatura, quando for compromisso de cartão).
- Alerta visual quando o limite disponível fica negativo.

**Etapa 2 — metas e orçamentos vivos**
- Registrar aporte na meta (com histórico), atualizando o progresso e o "quanto guardar por mês".
- Seletor de mês nos Orçamentos e opção de repetir os limites do mês anterior.

**Etapa 3 — avisos e edição**
- Gerar avisos automáticos de orçamento em 90% e 100%, fatura próxima do vencimento e compromisso vencendo, dentro da própria tela de Notificações.
- Editar/arquivar/excluir em Contas, Cartões, Metas e Orçamentos, com confirmação.
- Excluir categoria com aviso honesto do que acontece com o histórico.

**Etapa 4 — coerência final**
- Uma única regra de variação percentual em todo o app.
- Primeiros passos obrigatórios enquanto não concluídos, inclusive entrando com Google.
- Perguntar a renda mensal nos primeiros passos e usá-la na Visão Geral (percentual comprometido), ou remover o campo.
- Barra inferior do celular com acesso a Orçamentos e Relatórios.
- Remover a rotina de dados de demonstração ou transformá-la num botão opcional em Configurações.

## Notas técnicas

- Pagamento de fatura usa `transactions.is_invoice_payment`, já previsto em `src/lib/finance.ts:178-183` e nunca gravado por nenhuma tela; a transação de pagamento aponta para a conta pagadora e baixa os `commitments` da fatura.
- `Transaction.paid` é coluna morta: nenhum cálculo a lê. Definir se passa a filtrar valores realizados ou é removida.
- Centralizar `variation()` de `src/lib/finance.ts:256` e remover as duplicações em `src/routes/_authenticated/dashboard.tsx:77-78` e `:168-183`.
- Gate de onboarding em `src/routes/_authenticated/route.tsx` lendo `profiles.onboarding_completed`, substituindo a heurística `accounts.length === 0` do dashboard.
- Avisos gerados por rotina agendada usando `src/integrations/supabase/cron-auth.ts` (hoje sem nenhum endpoint) ou calculados e persistidos ao carregar os dados.
- `bootstrap_user_data` (`drizzle/migrations/0001_...sql`) está órfã; `ensure_profile` só cria perfil e categorias.
