# Fluxo Pessoal

Criar um aplicativo web completo e premium de organização financeira pessoal (fintech moderna, BRL, sem emojis, tipografia e ícones vetoriais refinados).

Principais pilares e regras obrigatórias:
1. Autenticação completa (e-mail/senha com toggle ver/ocultar senha, Google auth) com isolamento rigoroso por usuário (RLS no banco).
2. Regras financeiras:
   - Patrimônio contínuo e acumulativo entre meses (não reseta na virada de mês).
   - Receitas e despesas vinculadas ao período mensal selecionado (resultado = receitas - despesas).
   - Transferências entre contas do usuário não afetam receita, despesa nem o patrimônio total.
   - Cartões de crédito: limite não é patrimônio; compras parceladas geram parcelas futuras e compromissos automáticos; fatura só debita do saldo no pagamento.
3. Módulos e navegação (sidebar no desktop, navegação mobile dedicada):
   - Visão Geral / Dashboard: seletor de períodos (mês, últimos 3/6 meses, ano, custom), patrimônio total com variação, cards Entradas/Despesas/Resultado, seção "Onde está meu dinheiro?" com gráficos elegantes, "Para onde está indo meu dinheiro?" por categoria, compromissos futuros divididos, evolução patrimonial em linha e card do Agente Financeiro.
   - Movimentações & Ação Rápida: filtros completos e modais rápidos para + Receita, - Despesa e ↔ Transferência.
   - Contas: tipos (corrente, poupança, dinheiro, investimentos), detalhes, histórico e transferências.
   - Cartões de Crédito: limites, faturas atuais e futuras, compras parceladas automáticas.
   - Compromissos & Calendário Financeiro: visão futura mensal projetada.
   - Metas: cálculo automático da poupança mensal necessária.
   - Orçamentos: limites por categoria com alertas de consumo (90%, 100%+).
   - Relatórios: evolução patrimonial, entradas x despesas, categorias, uso de cartões.
   - Agente Financeiro: página com insights automáticos e consulta em linguagem natural sobre os dados financeiros reais do usuário.
   - Notificações, Configurações e Perfil.
4. Onboarding guiado em 5 etapas rápidas no primeiro acesso.
5. Página de Planos (sem plano gratuito: Mensal R$ 27,90/mês e Anual R$ 97,90/ano destacado como mais vantajoso).
6. Dados de demonstração realistas e consistentes para navegação inicial impecável. Sem dependência de Open Finance/bancos externos. Design estritamente profissional sem emojis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://money-flow-insight-39.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f4720ee3-3ac0-4c53-bb28-db240dc41ba4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
