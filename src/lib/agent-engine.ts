import type { FinanceData } from "./data";
import {
  accountAvailability,
  budgetStatus,
  cardAvailableLimit,
  cardOpenInvoiceTotal,
  cardUsedLimit,
  detectUnusualExpenses,
  expensesByCategory,
  goalPacing,
  netWorth,
  periodTotals,
} from "./finance";
import { formatBRL, monthKeyToday, toISODate } from "./format";

/**
 * Motor de raciocínio financeiro do Patrimo.
 * Responde em português brasileiro claro, empático, acolhedor e com números exatos,
 * sem jargões e sem julgamentos.
 */
export function analyzeFinanceQuery(question: string, data: FinanceData): string {
  const normalized = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const now = new Date();
  const currentMonthKey = monthKeyToday();
  const monthStart = `${currentMonthKey}-01`;
  const todayISO = toISODate(now);
  const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonthDate.getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(daysInMonth - currentDay, 1);

  const totals = periodTotals(data.transactions, monthStart, todayISO);
  const totalNetWorth = netWorth(data.accounts, data.transactions);

  // 1. ONDE ESTOU GASTANDO MAIS ESTE MÊS / MAIORES GASTOS
  if (
    normalized.includes("onde estou gastando") ||
    normalized.includes("gastando mais") ||
    normalized.includes("maiores gastos") ||
    normalized.includes("maior gasto") ||
    normalized.includes("principais despesas") ||
    normalized.includes("onde foi meu dinheiro") ||
    normalized.includes("onde gastei")
  ) {
    const cats = expensesByCategory(data.transactions, data.categories, monthStart, todayISO);
    if (cats.length === 0) {
      return (
        "Neste mês você ainda não registrou nenhuma despesa. " +
        "Assim que lançar suas compras ou contas, vou te mostrar exatamente a divisão por categorias!"
      );
    }

    const top = cats[0];
    const second = cats[1];
    const third = cats[2];

    let response = `Neste mês, sua maior categoria de despesa é **${top.name}**, somando **${formatBRL(top.total)}** (${top.share.toFixed(0)}% de tudo que saiu).\n\n`;

    if (second) {
      response += `Em segundo lugar está **${second.name}** com **${formatBRL(second.total)}** (${second.share.toFixed(0)}%).\n`;
    }
    if (third) {
      response += `Em terceiro lugar vem **${third.name}** com **${formatBRL(third.total)}** (${third.share.toFixed(0)}%).\n`;
    }

    // Identificar a maior compra individual dessa categoria
    const topCatTxs = data.transactions.filter(
      (t) =>
        t.kind === "despesa" &&
        !t.is_invoice_payment &&
        t.category_id === top.id &&
        t.occurred_on >= monthStart &&
        t.occurred_on <= todayISO,
    );
    if (topCatTxs.length > 0) {
      const biggestTx = [...topCatTxs].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
      if (biggestTx && Number(biggestTx.amount) > 0) {
        response += `\nO maior lançamento individual nessa categoria foi **${biggestTx.description || "Gasto sem descrição"}** no valor de **${formatBRL(Number(biggestTx.amount))}**.`;
      }
    }

    response += `\n\n💡 **Dica acolhedora:** Se quiser colocar um teto saudável para **${top.name}**, você pode definir um valor em **Planejamento > Orçamentos**.`;
    return response;
  }

  // 2. QUANTO POSSO GASTAR ATÉ O FIM DO MÊS / LIMITE DIÁRIO
  if (
    normalized.includes("quanto posso gastar") ||
    normalized.includes("limite diario") ||
    normalized.includes("quanto tenho pra gastar") ||
    normalized.includes("quanto sobrou") ||
    normalized.includes("posso gastar hoje") ||
    normalized.includes("posso gastar esse mes")
  ) {
    // Calcula saldo disponível real em contas correntes e dinheiro
    let availableNow = 0;
    for (const acc of data.accounts.filter((a) => !a.archived && a.type !== "investimentos")) {
      const avail = accountAvailability(acc, data.transactions, data.commitments, data.cards, daysRemaining);
      availableNow += avail.availableBalance;
    }

    // Contas pendentes até o final do mês
    const pendingBillsThisMonth = data.commitments
      .filter(
        (c) =>
          c.status === "pendente" &&
          c.kind === "despesa" &&
          c.due_date >= todayISO &&
          c.due_date <= toISODate(endOfMonthDate),
      )
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const safeToSpend = Math.max(availableNow, 0);
    const dailySafe = daysRemaining > 0 ? safeToSpend / daysRemaining : 0;
    const weekendSafe = dailySafe * 2;

    if (safeToSpend <= 0) {
      return (
        `Atenção ao seu fluxo de caixa: considerando os compromissos que você já tem agendados até o fim do mês ` +
        `(**${formatBRL(pendingBillsThisMonth)}**), o seu saldo disponível nas contas do dia a dia está no limite.\n\n` +
        `Recomendo segurar novas compras não essenciais até que entre uma nova receita ou o próximo salário.`
      );
    }

    return (
      `Fazendo as contas com segurança:\n\n` +
      `• **Saldo livre estimado:** Você tem cerca de **${formatBRL(safeToSpend)}** disponíveis após reservar o valor das contas pendentes deste mês.\n` +
      `• **Dias restantes no mês:** Faltam **${daysRemaining} dias** para virar o mês.\n` +
      `• **Média recomendada por dia:** Até **${formatBRL(dailySafe)}/dia** para fechar o mês no azul.\n` +
      `• **Para o fim de semana:** Cerca de **${formatBRL(weekendSafe)}** para gastos extras sem comprometer suas contas.\n\n` +
      `Essa margem já protege suas contas agendadas!`
    );
  }

  // 3. QUAIS CONTAS VENCEM ESTA SEMANA / PRÓXIMOS VENCIMENTOS
  if (
    normalized.includes("vencem esta semana") ||
    normalized.includes("vencem nessa semana") ||
    normalized.includes("contas da semana") ||
    normalized.includes("contas vencem") ||
    normalized.includes("vencimentos") ||
    normalized.includes("o que tenho que pagar") ||
    normalized.includes("o que pagar")
  ) {
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekISO = toISODate(nextWeekDate);

    const billsDue = data.commitments.filter(
      (c) =>
        c.status === "pendente" &&
        c.kind === "despesa" &&
        c.due_date >= todayISO &&
        c.due_date <= nextWeekISO,
    );

    // Também verifica se tem fatura de cartão vencendo nos próximos 7 dias
    const cardBills: { name: string; amount: number; dueDay: number }[] = [];
    for (const card of data.cards.filter((c) => !c.archived)) {
      const open = cardOpenInvoiceTotal(card, data.transactions);
      if (open > 0) {
        const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), card.due_day);
        const diffDays = (thisMonthDue.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) {
          cardBills.push({ name: `Fatura ${card.name}`, amount: open, dueDay: card.due_day });
        }
      }
    }

    const totalThisWeek =
      billsDue.reduce((sum, b) => sum + Number(b.amount), 0) +
      cardBills.reduce((sum, c) => sum + c.amount, 0);

    if (billsDue.length === 0 && cardBills.length === 0) {
      return (
        "Boas notícias! 🎉\n\n" +
        "Você não tem nenhuma conta ou fatura agendada para vencer nos próximos 7 dias. " +
        "Seu fluxo de caixa está tranquilo nesta semana."
      );
    }

    let response = `Você tem **${billsDue.length + cardBills.length} compromisso(s)** previstos para os próximos 7 dias, totalizando **${formatBRL(totalThisWeek)}**:\n\n`;

    for (const bill of billsDue) {
      const parts = bill.due_date.split("-");
      const formattedDate = `${parts[2]}/${parts[1]}`;
      response += `• **${bill.description}**: ${formatBRL(Number(bill.amount))} (Vencimento: ${formattedDate})\n`;
    }

    for (const card of cardBills) {
      response += `• **${card.name}**: ${formatBRL(card.amount)} (Vencimento: dia ${card.dueDay})\n`;
    }

    response += `\n💡 Certifique-se de manter esse valor na sua conta corrente para quando o débito ocorrer.`;
    return response;
  }

  // 4. METAS FINANCEIRAS / CUMPRIR METAS
  if (
    normalized.includes("meta") ||
    normalized.includes("metas") ||
    normalized.includes("reserva de emergencia") ||
    normalized.includes("objetivo")
  ) {
    if (data.goals.length === 0) {
      return (
        "Você ainda não cadastrou nenhuma meta financeira.\n\n" +
        "Ter um objetivo claro — como uma Reserva de Emergência ou uma Viagem — ajuda a poupar com propósito. " +
        "Vá até a aba **Metas** e crie a sua primeira meta estipulando um valor e uma data desejada. " +
        "O Patrimo calculará automaticamente quanto você precisa guardar a cada mês!"
      );
    }

    let response = `Aqui está o panorama das suas metas financeiras:\n\n`;
    let totalNeededThisMonth = 0;

    for (const goal of data.goals) {
      const pacing = goalPacing(goal);
      totalNeededThisMonth += pacing.monthlyNeeded;

      const badge =
        pacing.percentage >= 100
          ? "✅ Concluída"
          : pacing.status === "no_ritmo"
            ? "🟢 No ritmo"
            : pacing.status === "atencao"
              ? "🟡 Atenção"
              : "🔴 Precisa de reforço";

      response += `• **${goal.name}** (${badge}):\n`;
      response += `  - Acumulado: **${formatBRL(pacing.current)}** de **${formatBRL(pacing.target)}** (${pacing.percentage.toFixed(0)}%)\n`;
      if (pacing.missing > 0) {
        response += `  - Para atingir no prazo (${pacing.monthsLeft} meses restantes), guarde **${formatBRL(pacing.monthlyNeeded)}/mês**.\n`;
      }
      response += `\n`;
    }

    if (totalNeededThisMonth > 0) {
      response += `🎯 **Total para poupar este mês:** Para manter todas as suas metas no prazo, o ideal é reservar **${formatBRL(totalNeededThisMonth)}** somando todas elas.`;
    }

    return response;
  }

  // 5. QUAIS GASTOS POSSO REVISAR / ONDE ECONOMIZAR / CORTES
  if (
    normalized.includes("revisar") ||
    normalized.includes("economizar") ||
    normalized.includes("onde cortar") ||
    normalized.includes("gastos desnecessarios") ||
    normalized.includes("gastos atipicos") ||
    normalized.includes("poupar mais")
  ) {
    const unusual = detectUnusualExpenses(data.transactions, data.categories, monthStart, todayISO);
    const budgetsOver = budgetStatus(data.budgets, data.categories, data.transactions, currentMonthKey).filter(
      (b) => b.level === "excedido" || b.level === "atencao",
    );

    let response = `Analisando seu padrão recente, separei alguns pontos que valem uma checagem cuidadosa:\n\n`;

    let foundPoints = false;

    if (unusual.length > 0) {
      foundPoints = true;
      response += `🔍 **Gastos acima da média recente:**\n`;
      for (const u of unusual) {
        response += `• **${u.transaction.description || "Lançamento"}** de **${formatBRL(Number(u.transaction.amount))}** na categoria *${u.categoryName}* (cerca de ${u.differenceFactor}x acima da média).\n`;
      }
      response += `\n`;
    }

    if (budgetsOver.length > 0) {
      foundPoints = true;
      response += `⚠️ **Categorias perto ou acima do orçamento:**\n`;
      for (const b of budgetsOver) {
        response += `• **${b.category?.name ?? "Categoria"}**: já atingiu **${b.usage.toFixed(0)}%** do limite previsto (${formatBRL(b.spent)} de ${formatBRL(b.budget.limit_amount)}).\n`;
      }
      response += `\n`;
    }

    if (!foundPoints) {
      const topCats = expensesByCategory(data.transactions, data.categories, monthStart, todayISO);
      if (topCats.length > 0) {
        response += `Você não teve gastos atípicos nem estourou orçamentos este mês! Se quiser aumentar sua margem de economia, a categoria onde mais tem saído dinheiro é **${topCats[0].name}** (${formatBRL(topCats[0].total)}). Pequenos ajustes semanais nela já abrem espaço para suas metas.`;
      } else {
        response += `Seu mês está bem controlado e não há registros de exageros ou desvios do planejamento. Parabéns pelo cuidado com o dinheiro!`;
      }
    } else {
      response += `💡 **Como agir:** Não é preciso cortar tudo. Comece estipulando um teto um pouco menor para a categoria que mais pesou e veja como se sente nos próximos 15 dias.`;
    }

    return response;
  }

  // 6. CARTÕES DE CRÉDITO / FATURAS
  if (
    normalized.includes("cartao") ||
    normalized.includes("cartoes") ||
    normalized.includes("fatura") ||
    normalized.includes("limite")
  ) {
    if (data.cards.length === 0) {
      return (
        "Você não possui cartões de crédito cadastrados no momento. " +
        "Você pode cadastrar seus cartões na aba **Cartões** para acompanhar limites e faturas futuras."
      );
    }

    let response = `Aqui está o resumo dos seus cartões de crédito:\n\n`;

    for (const card of data.cards.filter((c) => !c.archived)) {
      const used = cardUsedLimit(card, data.transactions);
      const available = cardAvailableLimit(card, data.transactions);
      const usagePercent = card.limit_amount > 0 ? (used / card.limit_amount) * 100 : 0;

      response += `💳 **${card.name}**:\n`;
      response += `• **Fatura aberta atual:** ${formatBRL(used)}\n`;
      response += `• **Limite disponível:** ${formatBRL(available)} de ${formatBRL(card.limit_amount)} (${usagePercent.toFixed(0)}% comprometido)\n`;
      response += `• **Vencimento:** dia ${card.due_day} | **Fechamento:** dia ${card.closing_day}\n`;
      response += `\n`;
    }

    response += `Lembrete importante do Patrimo: as compras feitas no cartão não reduzem o saldo da sua conta bancária na hora da compra; o valor só é debitado quando você confirma o pagamento da fatura.`;
    return response;
  }

  // 7. CONSULTA DE CATEGORIA ESPECÍFICA (alimentação, mercado, transporte, etc.)
  for (const cat of data.categories) {
    const catNameNorm = cat.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const synonyms: Record<string, string[]> = {
      alimentacao: ["comida", "mercado", "supermercado", "restaurante", "ifood", "lanche"],
      transporte: ["uber", "gasolina", "combustivel", "carro", "onibus", "metro"],
      moradia: ["aluguel", "condominio", "luz", "agua", "energia", "casa"],
      lazer: ["passeio", "viagem", "cinema", "show", "diversao"],
      saude: ["farmacia", "remedio", "medico", "consulta", "exame"],
    };

    const isMatch =
      normalized.includes(catNameNorm) ||
      (synonyms[catNameNorm] && synonyms[catNameNorm].some((s) => normalized.includes(s)));

    if (isMatch) {
      const catTxs = data.transactions.filter(
        (t) =>
          t.kind === "despesa" &&
          !t.is_invoice_payment &&
          t.category_id === cat.id &&
          t.occurred_on >= monthStart &&
          t.occurred_on <= todayISO,
      );

      const totalSpent = catTxs.reduce((sum, t) => sum + Number(t.amount), 0);
      const budget = data.budgets.find(
        (b) => b.category_id === cat.id && b.month.startsWith(currentMonthKey),
      );

      let response = `Sobre a categoria **${cat.name}** neste mês:\n\n`;
      response += `• **Total gasto até agora:** ${formatBRL(totalSpent)} em ${catTxs.length} lançamento(s).\n`;

      if (budget && budget.limit_amount > 0) {
        const usage = (totalSpent / budget.limit_amount) * 100;
        const remaining = Math.max(budget.limit_amount - totalSpent, 0);
        response += `• **Orçamento definido:** ${formatBRL(budget.limit_amount)} (você já usou ${usage.toFixed(0)}%, restam ${formatBRL(remaining)}).\n`;
      }

      if (catTxs.length > 0) {
        response += `\n**Últimos lançamentos:**\n`;
        for (const tx of catTxs.slice(0, 3)) {
          response += `• ${tx.description || "Gasto"}: ${formatBRL(Number(tx.amount))} em ${tx.occurred_on.split("-").reverse().join("/")}\n`;
        }
      }

      return response;
    }
  }

  // 8. SALDO / PATRIMÔNIO / QUANTO TENHO
  if (
    normalized.includes("saldo") ||
    normalized.includes("patrimonio") ||
    normalized.includes("quanto tenho") ||
    normalized.includes("dinheiro guardado")
  ) {
    let response = `Seu patrimônio total hoje é de **${formatBRL(totalNetWorth)}**, somando todas as suas contas cadastradas:\n\n`;

    for (const acc of data.accounts.filter((a) => !a.archived)) {
      const avail = accountAvailability(acc, data.transactions, data.commitments, data.cards, 30);
      response += `• **${acc.name}**: saldo atual de **${formatBRL(avail.currentBalance)}** (sendo ${formatBRL(avail.availableBalance)} livre após compromissos previstos).\n`;
    }

    response += `\nLembrando que o limite do cartão de crédito não entra nesta conta, pois cartão é um meio de pagamento com fatura e não dinheiro próprio.`;
    return response;
  }

  // 9. RESPOSTA GERAL E CONVERSACIONAL (VISÃO 360°)
  return (
    `Aqui está uma visão clara e acolhedora da sua situação financeira hoje:\n\n` +
    `1. **Patrimônio Total:** Você tem **${formatBRL(totalNetWorth)}** distribuídos entre suas contas.\n` +
    `2. **Neste mês:** Entraram **${formatBRL(totals.income)}** e saíram **${formatBRL(totals.expense)}**, com resultado de **${formatBRL(totals.result)}**.\n` +
    `3. **Próximo foco:** Acompanhar as contas futuras e manter os gastos do dia a dia dentro da média para continuar no azul.\n\n` +
    `Se você quiser saber algo específico, pode clicar em uma das perguntas sugeridas ou perguntar sobre um cartão, categoria ou meta!`
  );
}
