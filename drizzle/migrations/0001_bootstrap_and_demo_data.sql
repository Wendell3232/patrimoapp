create or replace function public.bootstrap_user_data(p_full_name text default null, p_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  acc_cc uuid; acc_pou uuid; acc_din uuid; acc_inv uuid;
  card_nu uuid; card_it uuid;
  c_sal uuid; c_free uuid; c_rend uuid;
  c_mor uuid; c_ali uuid; c_tra uuid; c_sau uuid; c_edu uuid; c_laz uuid; c_ass uuid; c_com uuid;
  ref date; m int; grp uuid; i int; tx uuid; d date; base numeric;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, full_name, email)
  values (uid, coalesce(p_full_name, ''), p_email)
  on conflict (id) do update
    set full_name = case when public.profiles.full_name = '' then coalesce(p_full_name, '') else public.profiles.full_name end,
        email = coalesce(public.profiles.email, p_email);

  if exists (select 1 from public.accounts where user_id = uid) then
    return;
  end if;

  insert into public.accounts (user_id, name, type, institution, opening_balance, color) values
    (uid, 'Conta Corrente', 'corrente', 'Banco Digital', 2400.00, '#2563eb') returning id into acc_cc;
  insert into public.accounts (user_id, name, type, institution, opening_balance, color) values
    (uid, 'Poupança', 'poupanca', 'Banco Digital', 5200.00, '#0d9488') returning id into acc_pou;
  insert into public.accounts (user_id, name, type, institution, opening_balance, color) values
    (uid, 'Dinheiro', 'dinheiro', null, 320.00, '#a16207') returning id into acc_din;
  insert into public.accounts (user_id, name, type, institution, opening_balance, color) values
    (uid, 'Investimentos', 'investimentos', 'Corretora', 24800.00, '#4f46e5') returning id into acc_inv;

  insert into public.credit_cards (user_id, name, brand, limit_amount, closing_day, due_day, payment_account_id, color)
  values (uid, 'Cartão Principal', 'Visa', 9000.00, 28, 5, acc_cc, '#7c3aed') returning id into card_nu;
  insert into public.credit_cards (user_id, name, brand, limit_amount, closing_day, due_day, payment_account_id, color)
  values (uid, 'Cartão Secundário', 'Mastercard', 4500.00, 20, 1, acc_cc, '#db2777') returning id into card_it;

  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Salário','receita','#16a34a','briefcase') returning id into c_sal;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Freelance','receita','#0ea5e9','laptop') returning id into c_free;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Rendimentos','receita','#14b8a6','trending-up') returning id into c_rend;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Moradia','despesa','#f97316','home') returning id into c_mor;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Alimentação','despesa','#ef4444','utensils') returning id into c_ali;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Transporte','despesa','#3b82f6','car') returning id into c_tra;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Saúde','despesa','#06b6d4','heart-pulse') returning id into c_sau;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Educação','despesa','#8b5cf6','book-open') returning id into c_edu;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Lazer','despesa','#ec4899','ticket') returning id into c_laz;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Assinaturas','despesa','#64748b','repeat') returning id into c_ass;
  insert into public.categories (user_id, name, kind, color, icon) values (uid,'Compras','despesa','#eab308','shopping-bag') returning id into c_com;

  for m in 0..5 loop
    ref := (date_trunc('month', current_date) - (m || ' month')::interval)::date;
    base := 1 + (5 - m) * 0.015;

    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'receita', round(8600 * base, 2), ref + 4, 'Salário mensal', c_sal, acc_cc);

    if m % 2 = 0 then
      insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
      values (uid,'receita', round(1450 * base, 2), ref + 17, 'Projeto freelance', c_free, acc_cc);
    end if;

    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'receita', round(196 * base, 2), ref + 27, 'Rendimento de investimentos', c_rend, acc_inv);

    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'despesa', 2200.00, ref + 9, 'Aluguel', c_mor, acc_cc);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'despesa', round(318 * base, 2), ref + 11, 'Energia e água', c_mor, acc_cc);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, credit_card_id)
    values (uid,'despesa', round(612 * base, 2), ref + 6, 'Supermercado', c_ali, card_nu);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, credit_card_id)
    values (uid,'despesa', round(389 * base, 2), ref + 19, 'Restaurantes', c_ali, card_nu);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'despesa', round(126 * base, 2), ref + 21, 'Feira', c_ali, acc_din);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, credit_card_id)
    values (uid,'despesa', round(432 * base, 2), ref + 13, 'Combustível e transporte', c_tra, card_it);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, credit_card_id)
    values (uid,'despesa', 79.90, ref + 8, 'Assinaturas digitais', c_ass, card_nu);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'despesa', 349.00, ref + 14, 'Plano de saúde', c_sau, acc_cc);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, account_id)
    values (uid,'despesa', 480.00, ref + 15, 'Curso de especialização', c_edu, acc_cc);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, credit_card_id)
    values (uid,'despesa', round(268 * base, 2), ref + 22, 'Cinema e lazer', c_laz, card_it);

    insert into public.transactions (user_id, kind, amount, occurred_on, description, account_id, to_account_id)
    values (uid,'transferencia', 900.00, ref + 6, 'Reserva mensal', acc_cc, acc_pou);
    insert into public.transactions (user_id, kind, amount, occurred_on, description, account_id, to_account_id)
    values (uid,'transferencia', 700.00, ref + 7, 'Aporte em investimentos', acc_cc, acc_inv);
  end loop;

  -- Compra parcelada em 12x iniciada há 2 meses
  grp := gen_random_uuid();
  for i in 1..12 loop
    d := ((date_trunc('month', current_date) - interval '2 month') + ((i - 1) || ' month')::interval)::date + 11;
    insert into public.transactions
      (user_id, kind, amount, occurred_on, description, category_id, credit_card_id,
       installment_group, installment_number, installment_total, paid)
    values (uid,'despesa', 349.90, d, 'Notebook (' || i || '/12)', c_com, card_nu, grp, i, 12, d <= current_date)
    returning id into tx;
    if d > current_date then
      insert into public.commitments (user_id, description, amount, due_date, kind, category_id, credit_card_id, transaction_id)
      values (uid, 'Notebook (' || i || '/12)', 349.90, d, 'despesa', c_com, card_nu, tx);
    end if;
  end loop;

  -- Compra parcelada em 6x iniciada no mês passado
  grp := gen_random_uuid();
  for i in 1..6 loop
    d := ((date_trunc('month', current_date) - interval '1 month') + ((i - 1) || ' month')::interval)::date + 18;
    insert into public.transactions
      (user_id, kind, amount, occurred_on, description, category_id, credit_card_id,
       installment_group, installment_number, installment_total, paid)
    values (uid,'despesa', 216.50, d, 'Passagens aéreas (' || i || '/6)', c_laz, card_it, grp, i, 6, d <= current_date)
    returning id into tx;
    if d > current_date then
      insert into public.commitments (user_id, description, amount, due_date, kind, category_id, credit_card_id, transaction_id)
      values (uid, 'Passagens aéreas (' || i || '/6)', 216.50, d, 'despesa', c_laz, card_it, tx);
    end if;
  end loop;

  -- Compromissos fixos futuros
  for m in 1..3 loop
    ref := (date_trunc('month', current_date) + (m || ' month')::interval)::date;
    insert into public.commitments (user_id, description, amount, due_date, kind, category_id, account_id)
    values (uid, 'Aluguel', 2200.00, ref + 9, 'despesa', c_mor, acc_cc);
    insert into public.commitments (user_id, description, amount, due_date, kind, category_id, account_id)
    values (uid, 'Plano de saúde', 349.00, ref + 14, 'despesa', c_sau, acc_cc);
    insert into public.commitments (user_id, description, amount, due_date, kind, category_id, account_id)
    values (uid, 'Salário', 8600.00, ref + 4, 'receita', c_sal, acc_cc);
  end loop;

  -- Metas
  insert into public.goals (user_id, name, target_amount, current_amount, target_date, account_id) values
    (uid, 'Reserva de emergência', 36000.00, 11800.00, (current_date + interval '14 month')::date, acc_pou),
    (uid, 'Viagem internacional', 18000.00, 4200.00, (current_date + interval '9 month')::date, acc_pou),
    (uid, 'Entrada do imóvel', 90000.00, 24800.00, (current_date + interval '30 month')::date, acc_inv);

  -- Orçamentos do mês atual
  insert into public.budgets (user_id, category_id, month, limit_amount) values
    (uid, c_ali, date_trunc('month', current_date)::date, 1400.00),
    (uid, c_tra, date_trunc('month', current_date)::date, 600.00),
    (uid, c_laz, date_trunc('month', current_date)::date, 450.00),
    (uid, c_mor, date_trunc('month', current_date)::date, 2600.00),
    (uid, c_ass, date_trunc('month', current_date)::date, 120.00);

  -- Notificações
  insert into public.notifications (user_id, title, body, level) values
    (uid, 'Orçamento de Lazer próximo do limite', 'Você já utilizou mais de 90% do orçamento de Lazer neste mês.', 'alerta'),
    (uid, 'Fatura do Cartão Principal fecha em breve', 'O fechamento acontece no dia 28 e o vencimento no dia 5.', 'info'),
    (uid, 'Parcelas futuras registradas', 'Existem compromissos parcelados nos próximos meses.', 'info');
end;
$$;

revoke all on function public.bootstrap_user_data(text, text) from public;
grant execute on function public.bootstrap_user_data(text, text) to authenticated;
