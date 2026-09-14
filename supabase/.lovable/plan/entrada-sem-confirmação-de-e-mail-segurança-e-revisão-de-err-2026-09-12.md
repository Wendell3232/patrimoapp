# Entrada sem confirmação de e-mail, segurança e revisão de erros

## 1. Cadastro entra direto (sem e-mail de verificação)

Hoje quem cria conta com e-mail e senha fica preso esperando um e-mail que sai de um remetente genérico da plataforma — normalmente cai em spam ou não chega, porque o app ainda não tem domínio de envio próprio.

O que muda:
- A conta passa a ser ativada na hora: ao criar, o usuário já entra e vai direto para os primeiros passos.
- A tela de "confirme seu e-mail" deixa de aparecer; some também a mensagem que pedia confirmação.
- Nada muda no login com Google.

Fica registrado como pendência: se você quiser mais tarde e-mails de verdade (verificação, recuperação de senha com a sua marca), isso precisa de um domínio seu configurado. Enquanto não houver, a recuperação de senha continua saindo pelo remetente genérico e pode não chegar — vale avisar isso na tela de login.

## 2. Segurança do banco

A verificação apontou dois avisos, ambos sobre as duas rotinas internas do banco (a que prepara o perfil e a que carrega dados de exemplo): elas podem ser chamadas por qualquer visitante, mesmo sem login. Na prática elas já recusam quem não está autenticado, mas o acesso não deveria nem existir.

Correção: retirar a permissão de execução dessas duas rotinas de visitantes anônimos, mantendo apenas usuários logados. Depois disso, rodo a verificação novamente para confirmar que os avisos saíram.

Também confirmei o que já está correto: todas as tabelas têm isolamento por usuário ativo, com regras que só permitem ver e alterar os próprios dados, e as chaves sensíveis não aparecem em nenhum lugar do app.

## 3. Revisão de erros

Verificação de tipos: sem nenhum erro. Nenhum erro de execução registrado no app.

O que encontrei:
- Cerca de 540 apontamentos de formatação de código (espaços e quebras de linha), sem efeito no funcionamento. Vou aplicar a correção automática para deixar o projeto limpo.
- Um aviso restante está num arquivo gerado automaticamente pela plataforma — não pode ser alterado e é inofensivo.
- Pontos que quero conferir com atenção enquanto arrumo, por serem regras de dinheiro: o pagamento de fatura não pode contar como despesa do mês (só debitar a conta), o aviso automático de orçamento não pode se repetir todo carregamento, e quem entra pela primeira vez com Google precisa cair nos primeiros passos e não na Visão Geral.

## Detalhes técnicos

- `supabase--configure_auth` com `auto_confirm_email: true`; ajustar `src/routes/auth.tsx` removendo o estado `confirmSent` e o bloco `!data.session`, redirecionando sempre para `/onboarding`.
- Migração com `REVOKE EXECUTE ON FUNCTION public.ensure_profile(text,text), public.bootstrap_user_data(text,text) FROM anon, PUBLIC;` mantendo `GRANT EXECUTE ... TO authenticated`.
- `bunx eslint src --fix` para o lote de formatação; `previewAuthStorage.ts` fica intocado.
- Revalidar `is_invoice_payment` em `periodTotals`/`accountBalance` (`src/lib/finance.ts`), o guarda de sincronização em `syncNotifications` (`src/lib/notifications.ts` + `AppShell`), e o destino pós-Google em `handleGoogle` versus o gate de `_authenticated/route.tsx`.
- Rodar `supabase--linter` e nova verificação de segurança ao final.
