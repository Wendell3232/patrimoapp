import type { FinanceData } from "./data";
import {
  accountAvailability,
  budgetStatus,
  cardAvailableLimit,
  cardUsedLimit,
  detectUnusualExpenses,
  expensesByCategory,
  futureCommitments,
  goalPacing,
  netWorth,
  periodTotals,
  predictBudgetPacing,
  toMoney,
  variation,
} from "./finance";
import type { Account, Category, CreditCard, Goal } from "./finance";
import {
  formatBRL,
  formatMonthLabel,
  formatPercent,
  monthKeyToday,
  parseISODate,
  toISODate,
} from "./format";

interface Period {
  start: string;
  end: string;
  label: string;
  kind: "current" | "prevMonth" | "twoMonthsAgo" | "year" | "last3" | "thisWeek" | "lastWeek" | "today" | "fullMonth" | "specificMonth";
}

interface Entity {
  category?: Category;
  account?: Account;
  card?: CreditCard;
  goals: Goal[];
}

const CATEGORY_TERMS: Record<string, string[]> = {
  alimentacao: [
    "comida", "mercado", "supermercado", "restaurante", "ifood", "lanche", "feira",
    "delivery", "entregas", "padaria", "cafe", "açougue", "acougue",
  ],
  transporte: [
    "uber", "taxi", "gasolina", "combustivel", "posto", "carro", "onibus", "metro",
    "estacionamento", "passagem", "pedagio", "mobilidade",
  ],
  moradia: [
    "aluguel", "condominio", "luz", "agua", "energia", "internet", "casa", "iptu",
    "conta de casa", "reforma",
  ],
  lazer: [
    "cinema", "show", "viagem", "passeio", "diversao", "game", "stream", "festa",
    "entretenimento", "netflix", "spotify", "bar", "restaurantes",
  ],
  saude: [
    "farmacia", "remedio", "medico", "consulta", "exame", "dentista", "academia",
    "psicologo", "plano de saude",
  ],
  educacao: [
    "curso", "escola", "faculdade", "mensalidade", "livro", "aula", "assinatura",
  ],
};

const MONTH_NAMES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

function norm(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function money(value: number): string {
  return formatBRL(value);
}

function capitalizeLabel(startISO: string): string {
  return formatMonthLabel(parseISODate(startISO));
}

function resolvePeriod(q: string, now: Date): Period {
  const today = toISODate(now);
  const y = now.getFullYear();
  const m = now.getMonth();

  const explicit = /(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/.exec(q);
  if (explicit && explicit[1]) {
    const month = MONTH_NAMES[explicit[1] as keyof typeof MONTH_NAMES]!;
    const lastYear = /ano passado/.test(q);
    let year = y;
    if (/^[12]\d{3}$/.test(q)) {
      const match = /(^|\s)([12]\d{3})(\s|$)/.exec(q);
      year = match && match[2] ? Number(match[2]) : y;
    } else if (lastYear) {
      year = y - 1;
    } else if (month > m) {
      year = y - 1;
    }
    const isCurrent = year === y && month === m;
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = isCurrent ? today : toISODate(new Date(year, month + 1, 0));
    return { start, end, label: capitalizeLabel(start), kind: isCurrent ? "current" : "specificMonth" };
  }

  if (/mes retrasado|dois meses atras|retrasado/.test(q)) {
    const s = new Date(y, m - 2, 1);
    return { start: toISODate(s), end: toISODate(new Date(y, m - 1, 0)), label: "Mês retrasado", kind: "twoMonthsAgo" };
  }
  if (/mes passado|ultimo mes|mes anterior|o mes passado|mes que passou/.test(q)) {
    const s = new Date(y, m - 1, 1);
    return { start: toISODate(s), end: toISODate(new Date(y, m, 0)), label: "Mês passado", kind: "prevMonth" };
  }
  if (/este ano|esse ano|ano atual|acumulado do ano|desde janeiro/.test(q)) {
    return { start: `${y}-01-01`, end: today, label: "Este ano", kind: "year" };
  }
  if (/ultimos 3 mes|ultimos tres mes|\b3 mes\b|tres mes|\b90 dia|trimestre/.test(q)) {
    const s = new Date(y, m - 2, 1);
    return { start: toISODate(s), end: today, label: "Últimos 3 meses", kind: "last3" };
  }
  if (/semana passada|semana anterior/.test(q)) {
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(y, m, now.getDate() - dow - 7);
    return { start: toISODate(monday), end: toISODate(new Date(y, m, monday.getDate() + 6)), label: "Semana passada", kind: "lastWeek" };
  }
  if (/esta semana|essa semana|esta semana/.test(q)) {
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(y, m, now.getDate() - dow);
    return { start: toISODate(monday), end: today, label: "Esta semana", kind: "thisWeek" };
  }
  if (/hoje|neste momento|no momento|de hoje|agora/.test(q)) {
    return { start: today, end: today, label: "Hoje", kind: "today" };
  }
  if (/mes inteiro|mes todo|mes completo|mes fechado|integral/.test(q)) {
    const s = new Date(y, m, 1);
    return { start: toISODate(s), end: toISODate(new Date(y, m + 1, 0)), label: "Este mês (completo)", kind: "fullMonth" };
  }
  const s = new Date(y, m, 1);
  return { start: toISODate(s), end: today, label: "Este mês", kind: "current" };
}

function findCategory(q: string, categories: Category[]): Category | undefined {
  for (const category of categories) {
    const catName = norm(category.name);
    if (q.includes(catName)) return category;
    const extras = CATEGORY_TERMS[catName];
    if (extras && extras.some((term) => q.includes(term))) return category;
  }
  return undefined;
}

function findAccount(q: string, accounts: Account[]): Account | undefined {
  const synonyms: Record<string, string[]> = {
    corrente: ["corrente"],
    poupanca: ["poupanca"],
    dinheiro: ["dinheiro", "carteira", "cofrinho"],
    investimentos: ["investimento", "investimentos", "aplicacoes", "aplicacao"],
  };
  for (const account of accounts) {
    const name = norm(account.name);
    if (name && q.includes(name)) return account;
  }
  for (const account of accounts) {
    const terms = synonyms[account.type];
    if (terms && terms.some((term) => q.includes(term))) return account;
  }
  return undefined;
}

function findCard(q: string, cards: CreditCard[]): CreditCard | undefined {
  for (const card of cards) {
    const name = norm(card.name);
    if (name && q.includes(name)) return card;
  }
  return undefined;
}

function focusedGoals(q: string, goals: Goal[]): Goal[] {
  const matched = goals.filter((goal) => {
    const name = norm(goal.name);
    if (q.includes(name)) return true;
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    return words.some((word) => q.includes(word));
  });
  return matched;
}

function prevPeriodOf(startISO: string): { start: string; end: string } {
  const d = parseISODate(startISO);
  return {
    start: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
    end: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
  };
}

function monthEndOf(startISO: string): string {
  const d = parseISODate(startISO);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function analyzeFinanceQuery(question: string, data: FinanceData): string {
  const q = norm(question).trim();
  const now = new Date();
  const todayISO = toISODate(now);
  const currentMonthKey = monthKeyToday(now);
  const monthStart = `${currentMonthKey}-01`;
  const endOfMonth = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const currentDay = Math.max(now.getDate(), 1);
  const daysRemaining = Math.max(parseISODate(endOfMonth).getDate() - currentDay, 1);
  const period = resolvePeriod(q, now);

  const totals = periodTotals(data.transactions, period.start, period.end);
  const currentTotals = periodTotals(data.transactions, monthStart, todayISO);
  const totalNetWorth = netWorth(data.accounts, data.transactions);

  const category = findCategory(q, data.categories);
  const account = findAccount(q, data.accounts);
  const card = findCard(q, data.cards);
  const matchedGoals = focusedGoals(q, data.goals);
  const goalGeneric = /meta|metas|objetivo|reserva de emergencia|cumprir metas|poupar mais|minhas metas|guarda dinheiro|juntar dinheiro/.test(q);
  const goalFocal = matchedGoals.length > 0 && /falta|faltando|faltam|ritmo|atrasad|cumprir|conclui|guard|poupar|vou conseguir|atingir|reserva/.test(q);
  const shouldHandleGoals = goalGeneric || goalFocal;

  const isCardQuestion = /cartao|cartoes|fatura|limite do cartao/.test(q);
  const isBillsQuestion = /vence|vencimento|vencer|pagar|pagamento|boleto|devo|tenho que pagar|compromisso|contas a pagar/.test(q);
  const isCashflowQuestion = /posso gastar|pra gastar|tenho pra gastar|sobrou|sobra|disponivel|fechar o mes|ate o fim do mes|pro fim do mes|fim de semana|final de semana/.test(q);
  const isBudgetsQuestion = /orcamento|orcamentos|estour|teto|planejado|planejamento/.test(q);
  const isSpendListQuestion = /onde estou gastando|gastando mais|maiores gastos|maior gasto|principais despesas|onde foi meu dinheiro|onde gastei|quanto gastei|quanto eu gastei|top gastos|maiores despesas|maior despesa|o que mais sai|quanto saiu|total de gastos/.test(q);
  const isTrendQuestion = /mes passado|comparad|comparar|evoluc|aumentou|diminui|subiu|caiu|mais que|menos que|tendenci|mudanc|variacao|melhorei|piorou|crescendo|cresceu|reduziu/.test(q);
  const isEconomyQuestion = /economiz|cortar|reduzir|revisar|atipico|sugest|dica|como posso melhorar|organizar|crescer|sobrar mais|poupar mais|guardar mais|o que voce recomenda/.test(q);
  const isWealthQuestion = /quanto tenho|saldo|patrimonio|dinheiro guardado|meu total|minhas contas|meu valor|riqueza/.test(q);

  const isGreeting = /^(ola|oi|bom dia|boa tarde|boa noite|e ai|eai|tudo bem|opa|hello|hi)\b/.test(q) && q.split(/\s+/).length <= 4 && !isCardQuestion && !isBillsQuestion && !isCashflowQuestion && !isSpendListQuestion && !isWealthQuestion && !category && !shouldHandleGoals;

  if (isGreeting) {
    return (
      "Olá! 👋 Sou o Agente Financeiro do Patrimo, seu analista pessoal.\n\n" +
      "Posso te dizer, com base apenas nos seus números:\n" +
      "• Onde seu dinheiro está indo (categorias e maiores gastos);\n" +
      "• Quanto você pode gastar até o fim do mês com segurança;\n" +
      "• Quais contas e faturas vencem em breve;\n" +
      "• Como estão suas metas e quanto falta para cumprir;\n" +
      "• Se seus gastos estão altos demais e onde dá para economizar.\n\n" +
      "Pergunte do seu jeito, por exemplo: “quanto gastei com mercado este mês?” ou “estou gastando mais que no mês passado?”"
    );
  }

  // 1. METAS FINANCEIRAS
  if (shouldHandleGoals) {
    if (data.goals.length === 0) {
      return (
        "Você ainda não cadastrou nenhuma meta financeira.\n\n" +
        "Ter um objetivo claro — como uma Reserva de Emergência ou uma Viagem — ajuda a poupar com propósito. " +
        "Vá até a aba **Metas**, escolha um valor e uma data desejada. O Patrimo calcula automaticamente quanto guardar por mês."
      );
    }

    const goalsToShow = matchedGoals.length > 0 ? matchedGoals : data.goals;

    const monthsElapsed = Math.max(now.getMonth() + 1, 1);
    const yearStart = `${now.getFullYear()}-01-01`;
    const avgMonthlyIncome =
      monthsElapsed > 0
        ? periodTotals(data.transactions, yearStart, todayISO).income / monthsElapsed
        : 0;

    let response = "Aqui está o panorama das suas metas:\n\n";
    let totalNeeded = 0;

    for (const goal of goalsToShow) {
      const pacing = goalPacing(goal);
      totalNeeded += pacing.monthlyNeeded;

      const badge =
        pacing.percentage >= 100
          ? "✅ Concluída"
          : pacing.status === "no_ritmo"
            ? "🟢 No ritmo"
            : pacing.status === "atencao"
              ? "🟡 Atenção"
              : "🔴 Precisa de reforço";

      response += `• **${goal.name}** (${badge}): acumulado **${money(pacing.current)}** de **${money(pacing.target)}** (${pacing.percentage.toFixed(0)}%).\n`;
      if (pacing.missing > 0) {
        response += `   Faltam **${money(pacing.missing)}**; para alcançar em ${pacing.monthsLeft} mês(es), guarde **${money(pacing.monthlyNeeded)}/mês**.\n`;
        if (avgMonthlyIncome > 0) {
          const debtRatio = pacing.monthlyNeeded / Math.max(avgMonthlyIncome, 1);
          response += `   Isso representa **${(debtRatio * 100).toFixed(0)}%** da sua renda mensal média — um esforço ${debtRatio <= 0.1 ? "leve e sustentável 📊" : debtRatio <= 0.25 ? "saudável 📊" : "que pede atenção 📊"}.\n`;
        }
      }
      response += `\n`;
    }

    if (totalNeeded > 0) {
      const targetNote = matchedGoals.length > 0 ? "para bater essa meta" : "para manter todas no prazo";
      response += `🎯 **Total a poupar:** **${money(totalNeeded)}/mês** ${targetNote}.\n\n`;
    }
    response += `💡 **Dica:** Ajustar a data-alvo da meta que estiver mais apertada já alivia o valor mensal — o Patrimo recalcula tudo na hora.`;
    return response;
  }

  // 2. CARTÕES DE CRÉDITO / FATURAS
  if (isCardQuestion) {
    if (data.cards.length === 0) {
      return (
        "Você não possui cartões de crédito cadastrados. Você pode cadastrar seus cartões na aba **Cartões** para acompanhar limites e faturas."
      );
    }
    const activeCards = data.cards.filter((c) => !c.archived);
    const focusCards = card ? [card] : activeCards;
    const singleCard = focusCards[0];

    let response = focusCards.length === 1 && singleCard ? `Resumo do cartão **${singleCard.name}**:\n\n` : "Resumo dos seus cartões de crédito:\n\n";

    for (const activeCard of focusCards) {
      const used = cardUsedLimit(activeCard, data.transactions);
      const available = cardAvailableLimit(activeCard, data.transactions);
      const usagePercent = toMoney(activeCard.limit_amount) > 0 ? (used / toMoney(activeCard.limit_amount)) * 100 : 0;

      const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), activeCard.due_day);
      const dueNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, activeCard.due_day);
      const nextDue = dueThisMonth >= now ? dueThisMonth : dueNextMonth;
      const daysToDue = Math.round((nextDue.getTime() - now.getTime()) / 86400000);

      response += `💳 **${activeCard.name}**:\n`;
      response += `• **Fatura em aberto:** ${money(used)}\n`;
      response += `• **Limite disponível:** ${money(available)} de ${money(toMoney(activeCard.limit_amount))} (${usagePercent.toFixed(0)}% comprometido)\n`;
      response += `• **Próximo vencimento:** dia ${activeCard.due_day}${daysToDue >= 0 && daysToDue <= 30 ? ` (em ${daysToDue} dia(s))` : ""}\n\n`;
      if (used > 0 && daysToDue <= 3) {
        response += `⚠️ A fatura de **${money(Math.max(used, 0))}** vence em poucos dias — confirme o saldo na conta de pagamento.\n\n`;
      }
      if (usagePercent > 70) {
        response += `📈 Você já usou **${usagePercent.toFixed(0)}%** do limite. Considere usar outras modalidades ou esperar a próxima fatura para compras grandes.\n\n`;
      }
    }

    response += `\n_Compras no cartão só debitam sua conta quando a fatura é paga — por isso ele não aparece como saldo no seu patrimônio._`;
    return response;
  }

  // 3. CONSULTA DE CATEGORIA ESPECÍFICA
  if (category) {
    const catTxs = data.transactions.filter(
      (tx) =>
        tx.kind === "despesa" &&
        !tx.is_invoice_payment &&
        tx.category_id === category.id &&
        tx.occurred_on >= period.start &&
        tx.occurred_on <= period.end,
    );
    const totalSpent = catTxs.reduce((sum, tx) => sum + toMoney(tx.amount), 0);
    const periodExpense = periodTotals(data.transactions, period.start, period.end).expense;
    const share = periodExpense > 0 ? (totalSpent / periodExpense) * 100 : 0;
    const biggest = [...catTxs].sort((a, b) => toMoney(b.amount) - toMoney(a.amount))[0];

    const prev = prevPeriodOf(period.start);
    const prevTotal = catTxs.length > 0
      ? data.transactions
          .filter(
            (tx) =>
              tx.kind === "despesa" &&
              !tx.is_invoice_payment &&
              tx.category_id === category.id &&
              tx.occurred_on >= prev.start &&
              tx.occurred_on <= prev.end,
          )
          .reduce((sum, tx) => sum + toMoney(tx.amount), 0)
      : 0;

    const budget = data.budgets.find(
      (b) => b.category_id === category.id && b.month.startsWith(currentMonthKey),
    );

    const catLabel =
      period.kind === "current" ? "neste mês" : period.kind === "year" ? "este ano" : `em ${period.label.toLowerCase()}`;
    let response = `Sobre **${category.name}** ${catLabel}:\n\n`;
    response += `• **Total gasto:** ${money(totalSpent)} em ${catTxs.length} lançamento(s).\n`;
    if (share > 0) {
      response += `• **Participação:** ${share.toFixed(0)}% de todas as despesas do período.\n`;
    }

    if (period.kind === "current" && prevTotal > 0) {
      const change = variation(totalSpent, prevTotal);
      response += `• **Comparado ao mês passado:** ${money(prevTotal)} → ${money(totalSpent)} (${formatPercent(change)}).\n`;
      if (change > 15) response += `   🔺 Este mês ${category.name} está acima do habitual — vale revisar.\n`;
      if (change < -15) response += `   🔻 Boa direção: está abaixo do habitual!\n`;
    }

    if (budget && toMoney(budget.limit_amount) > 0) {
      const usage = (totalSpent / toMoney(budget.limit_amount)) * 100;
      const remaining = Math.max(toMoney(budget.limit_amount) - totalSpent, 0);
      response += `• **Orçamento:** ${money(toMoney(budget.limit_amount))} — já usou ${usage.toFixed(0)}%, restam **${money(remaining)}**.\n`;
      if (usage >= 100) response += `   ⚠️ Você já estourou o teto desta categoria este mês.\n`;
    }

    if (biggest) {
      response += `• **Maior lançamento:** ${biggest.description || "Gasto sem descrição"} de **${money(toMoney(biggest.amount))}** em ${biggest.occurred_on.split("-").reverse().join("/")}.\n`;
    }

    response += `\n💡 **Dica acolhedora:** Se essa categoria costuma pesar, defina um teto em **Planejamento > Orçamentos** — ajuda a ter consciência sem rigidez.`;
    return response;
  }

  // 4. CONTAS A PAGAR / VENCIMENTOS
  if (isBillsQuestion) {
    const windowStart = todayISO;
    let windowEnd = todayISO;
    let windowLabel = "";

    if (/semana|7 dias|sete dias|proximos dias|essa semana|proximos 7/.test(q)) {
      windowEnd = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
      windowLabel = "nos próximos 7 dias";
    } else if (/mes|mês/.test(q)) {
      windowEnd = endOfMonth;
      windowLabel = "até o fim do mês";
    } else {
      windowEnd = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
      windowLabel = "nos próximos 30 dias";
    }

    const overdue = data.commitments.filter(
      (c) => c.status === "pendente" && c.kind === "despesa" && c.due_date < todayISO,
    );

    const inWindow = data.commitments.filter(
      (c) =>
        c.status === "pendente" &&
        c.kind === "despesa" &&
        c.due_date >= windowStart &&
        c.due_date <= windowEnd,
    );

    const cardInvoicesDue: { name: string; amount: number; due: string }[] = [];
    for (const activeCard of data.cards.filter((c) => !c.archived)) {
      const open = cardUsedLimit(activeCard, data.transactions);
      if (open > 0) {
        for (const due of [
          new Date(now.getFullYear(), now.getMonth(), activeCard.due_day),
          new Date(now.getFullYear(), now.getMonth() + 1, activeCard.due_day),
        ]) {
          const iso = toISODate(due);
          if (iso >= windowStart && iso <= windowEnd) {
            cardInvoicesDue.push({ name: `Fatura ${activeCard.name}`, amount: open, due: iso });
            break;
          }
        }
      }
    }

    const totalDue = inWindow.reduce((sum, c) => sum + toMoney(c.amount), 0) + cardInvoicesDue.reduce((sum, c) => sum + c.amount, 0);

    if (overdue.length === 0 && inWindow.length === 0 && cardInvoicesDue.length === 0) {
      return (
        `Boas notícias! 🎉 Não há contas nem faturas a vencer ${windowLabel}. ` +
        `Seu fluxo de caixa está tranquilo neste período.`
      );
    }

    let response = overdue.length > 0 ? `🔔 **Já vencidas (atenção):**\n` : "";
    for (const bill of overdue) {
      response += `• **${bill.description}**: ${money(toMoney(bill.amount))} (vencia em ${bill.due_date.split("-").reverse().join("/")})\n`;
    }
    if (overdue.length > 0) response += `\n`;

    response += totalDue > 0 || inWindow.length > 0 || cardInvoicesDue.length > 0
      ? `Você tem **${inWindow.length + cardInvoicesDue.length} compromisso(s)** ${windowLabel}, somando **${money(totalDue)}**:\n\n`
      : "";

    for (const bill of inWindow) {
      response += `• **${bill.description}**: ${money(toMoney(bill.amount))} (vence em ${bill.due_date.split("-").reverse().join("/")})\n`;
    }
    for (const invoice of cardInvoicesDue) {
      response += `• **${invoice.name}**: ${money(invoice.amount)} (vence em ${invoice.due.split("-").reverse().join("/")})\n`;
    }

    if (overdue.length > 0) {
      response += `\n⚠️ Recomendo regularizar as vencidas primeiro e manter **${money(totalDue + overdue.reduce((s, c) => s + toMoney(c.amount), 0))}** reservados na conta do débito.`;
    } else {
      response += `\n💡 Mantenha **${money(totalDue)}** reservados na conta do débito para o dia do vencimento.`;
    }
    return response;
  }

  // 5. QUANTO POSSO GASTAR / CAIXA DISPONÍVEL
  if (isCashflowQuestion) {
    let safeToSpend = 0;
    let usedAccounts = 0;
    const pool = account
      ? [account]
      : data.accounts.filter((a) => !a.archived && a.type !== "investimentos");
    for (const acc of pool) {
      const avail = accountAvailability(acc, data.transactions, data.commitments, data.cards, daysRemaining);
      safeToSpend += Math.max(avail.availableBalance, 0);
      usedAccounts++;
    }
    const freeFromNextMonth = pool.length > 0
      ? pool.reduce((s, acc) => {
          const avail = accountAvailability(acc, data.transactions, data.commitments, data.cards, 60);
          return s + Math.max(avail.availableBalance, 0);
        }, 0)
      : 0;

    const dailySafe = daysRemaining > 0 ? safeToSpend / daysRemaining : 0;
    const weekendSafe = dailySafe * 2;

    if (safeToSpend <= 0) {
      return (
        `Atenção ao fluxo de caixa: considerando os compromissos agendados, o saldo livre nas contas do dia a dia está no limite.\n\n` +
        `Recomendo segurar compras não essenciais até que entre uma nova receita ou o próximo salário.`
      );
    }

    let response = `Fazendo as contas com segurança:\n\n`;
    if (account) {
      response += `• **Conta ${account.name}:** saldo livre de **${money(safeToSpend)}** após compromissos.\n`;
    } else {
      response += `• **Saldo livre:** cerca de **${money(safeToSpend)}** disponíveis entre ${usedAccounts} conta(s) do dia a dia, já reservando contas e faturas.\n`;
    }
    if (/fim de semana|final de semana/.test(q)) {
      response += `• **Fim de semana:** dá para usar cerca de **${money(weekendSafe)}** sem comprometer suas contas.\n`;
    } else {
      response += `• **Dias restantes no mês:** ${daysRemaining} dia(s).\n`;
      response += `• **Média recomendada por dia:** até **${money(dailySafe)}/dia** para fechar no azul.\n`;
      response += `• **Fim de semana:** cerca de **${money(weekendSafe)}** para extras.\n`;
    }
    if (freeFromNextMonth > safeToSpend) {
      response += `\n📈 **Boa notícia:** olhando os próximos 60 dias, seu espaço ainda sobe para **${money(freeFromNextMonth)}** com as próximas receitas.\n`;
    }
    response += `\n💡 Lembrando que o limite total inclui contas reservadas para metas — se quiser, eu calculo o que sobraria guardando um valor fixo por mês.`;
    return response;
  }

  // 6. ORÇAMENTOS
  if (isBudgetsQuestion) {
    const budgets = budgetStatus(data.budgets, data.categories, data.transactions, currentMonthKey);
    if (budgets.length === 0) {
      return (
        "Você ainda não definiu orçamentos para este mês.\n\n" +
        "Criar um teto simples por categoria (ex: mercado, transporte, lazer) ajuda a enxergar para onde vai o dinheiro sem surpresas. " +
        "Vá em **Planejamento > Orçamentos** e defina seus limites."
      );
    }

    let response = `Estes são seus orçamentos do mês e o ritmo atual:\n\n`;
    for (const b of budgets) {
      const forecast = predictBudgetPacing(b.spent, toMoney(b.budget.limit_amount), currentMonthKey);
      const state =
        b.level === "excedido" ? "🔴 excedido" : b.level === "atencao" ? "🟡 perto do limite" : "🟢 controle";
      response += `• **${b.category?.name ?? "Categoria"}** (${state}): ${money(b.spent)} de ${money(toMoney(b.budget.limit_amount))} (${b.usage.toFixed(0)}%).\n`;
      if (b.level !== "ok" && forecast.willExceed) {
        response += `   📊 No ritmo atual, deve fechar o mês em **${money(forecast.projectedTotal)}** — cerca de **${money(forecast.projectedExcess)}** acima do teto.\n`;
      }
    }

    const over = budgets.filter((b) => b.level !== "ok");
    if (over.length > 0) {
      response += `\n💡 **Sugestão:** reduzir **10%** no maior orçamento estourado já evita boa parte do estouro do mês.`;
    } else {
      response += `\n💡 Seus tetos estão sendo respeitados. Ótimo cuidado com o planejamento!`;
    }
    return response;
  }

  // 7. ONDE ESTOU GASTANDO / MAIORES GASTOS
  if (isSpendListQuestion && !isTrendQuestion) {
    const cats = expensesByCategory(data.transactions, data.categories, period.start, period.end);
    const periodExpense = totals.expense;

    if (cats.length === 0) {
      return `No período **${period.label.toLowerCase()}**, você ainda não registrou despesas. Assim que lançar suas compras ou contas, mostro a divisão por categorias na hora!`;
    }

    let response = `Em **${period.label.toLowerCase()}**, seus gastos somam **${money(periodExpense)}**. Confira onde o dinheiro foi:\n\n`;
    cats.slice(0, 4).forEach((cat, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "▫️";
      response += `${medal} **${cat.name}**: ${money(cat.total)} (${cat.share.toFixed(0)}%)\n`;
    });

    const allTxs = data.transactions.filter(
      (tx) =>
        tx.kind === "despesa" &&
        !tx.is_invoice_payment &&
        tx.occurred_on >= period.start &&
        tx.occurred_on <= period.end,
    );
    const biggest = [...allTxs].sort((a, b) => toMoney(b.amount) - toMoney(a.amount))[0];
    if (biggest) {
      response += `\n**Maior lançamento isolado:** ${biggest.description || "Gasto sem descrição"} (${money(toMoney(biggest.amount))}).\n`;
    }

    if (period.kind === "current") {
      const top = cats[0];
      const prev = prevPeriodOf(period.start);
      const prevTop = expensesByCategory(data.transactions, data.categories, prev.start, prev.end)[0];
      if (top && prevTop && prevTop.total > 0) {
        const change = variation(top.total, prevTop.total);
        response += `\n📈 **Comparação:** em ${top.name} você registra ${money(top.total)} — contra ${money(prevTop.total)} no mês passado (${formatPercent(change)}).\n`;
      }
    }

    response += `\n💡 **Dica acolhedora:** escolha uma dessas categorias e defina um teto em **Planejamento > Orçamentos** para criar margem sem abrir mão do que importa.`;
    return response;
  }

  // 8. COMPARAÇÕES E TENDÊNCIAS
  if (isTrendQuestion) {
    const prev = prevPeriodOf(period.start);
    const prevTotals = periodTotals(data.transactions, prev.start, prev.end);
    const hasExpenses = totals.expense > 0 || prevTotals.expense > 0;

    let response = `Comparando **${period.label.toLowerCase()}** com o período anterior (${capitalizeLabel(prev.start).toLowerCase()}):\n\n`;
    if (totals.income > 0 || prevTotals.income > 0) {
      response += `• **Receitas:** ${money(prevTotals.income)} → ${money(totals.income)} (${formatPercent(variation(totals.income, prevTotals.income))})\n`;
    }
    if (hasExpenses) {
      response += `• **Despesas:** ${money(prevTotals.expense)} → ${money(totals.expense)} (${formatPercent(variation(totals.expense, prevTotals.expense))})\n`;
    }
    if (totals.result !== prevTotals.result || totals.result !== 0 || prevTotals.result !== 0) {
      response += `• **Resultado:** ${money(prevTotals.result)} → ${money(totals.result)}\n`;
    }

    const currCats = expensesByCategory(data.transactions, data.categories, period.start, period.end);
    const prevCats = expensesByCategory(data.transactions, data.categories, prev.start, prev.end);
    let deltaTop: { name: string; diff: number } | undefined;
    const catMap = new Map(prevCats.map((c) => [c.name, c.total]));
    for (const cat of currCats) {
      const prevVal = catMap.get(cat.name) ?? 0;
      const diff = cat.total - prevVal;
      if (!deltaTop || diff > deltaTop.diff) deltaTop = { name: cat.name, diff };
    }
    if (deltaTop && deltaTop.diff > 0) {
      response += `\n🔺 **Maior alta de categoria:** ${deltaTop.name} subiu **${money(deltaTop.diff)}** em relação ao período anterior.\n`;
    }
    if (deltaTop && deltaTop.diff < 0 && currCats[0]) {
      response += `\n🔻 **Maior queda:** ${currCats[0].name} caiu **${money(Math.abs(deltaTop.diff))}**.\n`;
    }

    const axis = variation(totals.expense, prevTotals.expense);
    response += `\n💡 **Leitura do Patrimo:** ${hasExpenses ? (axis > 5 ? "as despesas estão crescendo — vale revisar as maiores categorias." : axis < -5 ? "você está reduzindo despesas — ótimo ritmo, continue!" : "o ritmo está estável, sem sobressaltos.") : "ainda não há despesas suficientes para comparar."}`;
    return response;
  }

  // 9. GASTOS PARA REVISAR / COMO ECONOMIZAR
  if (isEconomyQuestion) {
    const unusual = detectUnusualExpenses(data.transactions, data.categories, period.start, period.end);
    const budgetsOver = budgetStatus(data.budgets, data.categories, data.transactions, currentMonthKey).filter(
      (b) => b.level === "excedido" || b.level === "atencao",
    );
    const topCats = expensesByCategory(data.transactions, data.categories, period.start, period.end);

    let response = `Analisando seu padrão recente, separei pontos práticos para você:\n\n`;
    let found = false;

    if (unusual.length > 0) {
      found = true;
      response += `🔍 **Gastos acima da média recente:**\n`;
      for (const u of unusual) {
        response += `• **${u.transaction.description || "Lançamento"}** de **${money(toMoney(u.transaction.amount))}** (${u.categoryName}, ~${u.differenceFactor}x a sua média).\n`;
      }
      response += `\n`;
    }

    if (budgetsOver.length > 0) {
      found = true;
      response += `⚠️ **Categorias perto ou acima do orçamento:**\n`;
      for (const b of budgetsOver) {
        response += `• **${b.category?.name ?? "Categoria"}**: ${b.usage.toFixed(0)}% usado (${money(b.spent)} de ${money(b.budget.limit_amount)}).\n`;
      }
      response += `\n`;
    }

    let savingSuggestion = "";
    const topCat = topCats[0];
    if (topCat) {
      const potential = topCat.total * 0.1;
      const firstGoal = data.goals[0];
      savingSuggestion = `Reduzir **10%** em **${topCat.name}** libera cerca de **${money(potential)}/mês**.`;
      if (firstGoal) {
        const pacing = goalPacing(firstGoal);
        if (pacing.missing > 0 && potential > 0) {
          const monthsSaved = Math.floor(pacing.missing / Math.max(potential, 1));
          savingSuggestion += ` Isso aceleraria a meta “${firstGoal.name}” em ~**${Math.max(monthsSaved, 1)} mês(es)**.`;
        }
      }
      response += `💰 **Lugar de onde pode vir a folga:** ${savingSuggestion}\n\n`;
      found = true;
    }

    if (!found) {
      response += `Seu mês está bem controlado — sem gastos atípicos nem estouro de tetos. 🎉\n\n` +
        `Se quiser aumentar sua margem, a maior categoria é **${topCats[0]?.name ?? "—"}**: pequenos ajustes semanais nela abrem espaço para suas metas.`;
    } else {
      response += `💡 **Como agir sem radicalismo:** comece por um teto um pouco menor na categoria que mais pesou e observe 15 dias. O que sobrar, direcione para suas metas.`;
    }
    return response;
  }

  // 10. SALDO / PATRIMÔNIO
  if (isWealthQuestion) {
    const accounts = account
      ? [account]
      : data.accounts.filter((a) => !a.archived);

    let response = `Seu patrimônio total hoje é de **${money(totalNetWorth)}**, somando todas as suas contas:\n\n`;

    for (const acc of accounts) {
      const avail = accountAvailability(acc, data.transactions, data.commitments, data.cards, 30);
      response += `• **${acc.name}**: saldo de **${money(avail.currentBalance)}** (${money(avail.availableBalance)} livre após compromissos previstos).\n`;
    }

    response += `\nLembrando: o limite do cartão de crédito não entra no patrimônio, pois é meio de pagamento, não dinheiro próprio.`;
    return response;
  }

  // 11. INSIGHT GERAL (VISÃO 360°)
  const topCat = expensesByCategory(data.transactions, data.categories, monthStart, todayISO)[0];
  const savingsRate = currentTotals.income > 0 ? (currentTotals.result / currentTotals.income) * 100 : 0;
  const upcomingTotal = futureCommitments(data.commitments)[0]?.despesas ?? 0;
  const firstGoal = data.goals[0];

  let response = `Aqui está sua visão financeira de hoje, com números reais:\n\n`;
  response += `1. **Patrimônio Total:** ${money(totalNetWorth)}.\n`;
  response += `2. **Este mês:** entraram ${money(currentTotals.income)} e saíram ${money(currentTotals.expense)} — resultado de **${money(currentTotals.result)}** (${savingsRate.toFixed(0)}% da renda economizada).\n`;
  if (topCat && topCat.total > 0) {
    response += `3. **Maior gasto do mês:** ${topCat.name} (${money(topCat.total)}). Se quiser, pergunto sobre qualquer categoria.\n`;
  }
  if (upcomingTotal > 0) {
    response += `4. **Compromissos futuros:** ${money(upcomingTotal)} previstos para o próximo período.\n`;
  }
  if (firstGoal) {
    const pacing = goalPacing(firstGoal);
    response += `5. **Sua meta “${firstGoal.name}”:** ${money(pacing.current)} de ${money(pacing.target)} — falta ${money(pacing.missing)} (${pacing.percentage.toFixed(0)}%).\n`;
  }

  response += `\nPode me perguntar coisas como *"quanto gastei com lazer no mês passado?"*, *"estou gastando mais que antes?"* ou *"o que vai vencer esta semana?"* — eu calculo tudo na hora, do seu jeito.`;
  return response;
}