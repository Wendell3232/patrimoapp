# Organização financeira pessoal — app premium (BRL)

## Visão

Aplicativo web completo de finanças pessoais, visual fintech sofisticado, sem emojis,
tipografia refinada e ícones vetoriais. Tudo em português do Brasil, valores em BRL.

## Etapa 1 — Base e backend

- Ativar o Lovable Cloud (banco, login, funções de servidor).
- Login por e-mail/senha (com botão ver/ocultar senha) e entrar com Google.
- Cada pessoa vê somente os próprios dados (isolamento no banco por usuário).
- Estrutura de dados: perfil, contas, cartões, categorias, movimentações,
  transferências, parcelas, compromissos, metas, orçamentos, notificações,
  preferências e registro do onboarding.

## Etapa 2 — Regras financeiras (o coração)

- Patrimônio é contínuo: soma dos saldos das contas, nunca zera na virada de mês.
- Receitas e despesas pertencem ao mês selecionado; resultado = receitas − despesas.
- Transferência entre contas move saldo, mas não conta como receita, despesa nem
  altera o patrimônio total.
- Cartão de crédito: limite não é patrimônio. Compra parcelada gera as parcelas
  futuras e os compromissos correspondentes. A fatura só debita a conta no pagamento.

## Etapa 3 — Telas

Sidebar no desktop, barra de navegação própria no mobile.

- Visão Geral: seletor de período (mês, 3 meses, 6 meses, ano, personalizado),
  patrimônio com variação, cards Entradas/Despesas/Resultado, "Onde está meu
  dinheiro?", "Para onde está indo meu dinheiro?" por categoria, compromissos
  futuros, evolução patrimonial em linha e card do Agente Financeiro.
- Movimentações: filtros completos e modais rápidos de Receita, Despesa e Transferência.
- Contas: corrente, poupança, dinheiro, investimentos — detalhe, histórico, transferências.
- Cartões: limites, fatura atual e futuras, parceladas automáticas.
- Compromissos e calendário financeiro com projeção mensal.
- Metas: cálculo automático de quanto guardar por mês.
- Orçamentos: limite por categoria com alerta em 90% e acima de 100%.
- Relatórios: evolução patrimonial, entradas x despesas, categorias, uso de cartões.
- Agente Financeiro: insights automáticos e perguntas em linguagem natural sobre
  os dados reais da pessoa (via IA do Lovable, com leitura só dos dados dela).
- Notificações, Configurações e Perfil.

## Etapa 4 — Onboarding e planos

- Onboarding guiado em 5 passos no primeiro acesso (perfil, contas, cartões,
  categorias/orçamento, meta inicial).
- Página de Planos: Mensal R$ 27,90/mês e Anual R$ 97,90/ano destacado como mais
  vantajoso. Sem plano gratuito. Página de apresentação e escolha; a cobrança real
  precisa de um meio de pagamento — posso ligar isso depois, se você quiser.

## Etapa 5 — Dados de demonstração

Conjunto realista e coerente (contas, cartões com parcelas em andamento,
6 meses de histórico, metas e orçamentos) criado junto com a estrutura do banco,
para a primeira navegação já ficar completa.

## Notas técnicas

- TanStack Start + React, Tailwind, shadcn/ui, gráficos com Recharts.
- Cálculos financeiros centralizados em módulo próprio, com testes das regras
  críticas (patrimônio acumulado, transferência neutra, parcelamento, fatura).
- Sem Open Finance nem integração bancária externa.

## Ordem de entrega

1. Backend + login + isolamento por usuário + dados de demonstração
2. Layout, navegação e Visão Geral
3. Movimentações, contas, cartões
4. Compromissos, metas, orçamentos, relatórios
5. Agente Financeiro, onboarding, planos, notificações/configurações/perfil
