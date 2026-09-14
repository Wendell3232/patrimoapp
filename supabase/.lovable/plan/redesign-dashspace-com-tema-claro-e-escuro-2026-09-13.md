# Redesign DashSpace com tema claro e escuro

## Objetivo
Atualizar a experiência visual completa do Patrimo para seguir a linguagem do TailGrids DashSpace: painel limpo, navegação lateral refinada, cabeçalho utilitário, cartões analíticos, hierarquia compacta e excelente leitura de dados. Adicionar escolha persistente entre tema claro, escuro e automático.

## O que será feito
- Reestruturar o menu lateral e o cabeçalho do aplicativo para aproximá-los do DashSpace, preservando todas as rotas e funções atuais.
- Refinar a identidade visual global: paleta, tipografia, espaçamento, bordas, sombras, campos, seletores, diálogos, botões e estados de interação.
- Criar um seletor de tema claro/escuro/automático no cabeçalho, salvando a preferência no navegador e respeitando o tema do sistema.
- Aplicar o tema antes da página aparecer para evitar troca visual durante o carregamento.
- Atualizar o dashboard com melhor hierarquia para indicadores, filtros, gráficos, contas, compromissos e movimentações, sem alterar cálculos nem dados.
- Garantir que as demais telas autenticadas e públicas herdem a mesma identidade e funcionem corretamente nos dois temas.
- Revisar os metadados das páginas e manter a navegação móvel dedicada.

## Detalhes técnicos
- Usar apenas tokens semânticos no sistema global de estilos, com paletas completas para claro e escuro.
- Implementar o controle de tema em um componente reutilizável e acessível, sem nova dependência.
- Adaptar as cores dos gráficos e indicadores para manter contraste nos dois temas.
- Preservar autenticação, regras financeiras, banco de dados e isolamento de dados.
- Validar desktop e celular, incluindo persistência do tema, ausência de sobreposição e erros no navegador.
