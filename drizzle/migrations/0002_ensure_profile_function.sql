create or replace function public.ensure_profile(p_full_name text default null, p_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, full_name, email)
  values (uid, coalesce(p_full_name, ''), p_email)
  on conflict (id) do update
    set full_name = case when public.profiles.full_name = '' then coalesce(p_full_name, '') else public.profiles.full_name end,
        email = coalesce(public.profiles.email, p_email);

  if not exists (select 1 from public.categories where user_id = uid) then
    insert into public.categories (user_id, name, kind, color, icon) values
      (uid,'Salário','receita','#16a34a','briefcase'),
      (uid,'Freelance','receita','#0ea5e9','laptop'),
      (uid,'Rendimentos','receita','#14b8a6','trending-up'),
      (uid,'Outras receitas','receita','#22c55e','plus'),
      (uid,'Moradia','despesa','#f97316','home'),
      (uid,'Alimentação','despesa','#ef4444','utensils'),
      (uid,'Transporte','despesa','#3b82f6','car'),
      (uid,'Saúde','despesa','#06b6d4','heart-pulse'),
      (uid,'Educação','despesa','#8b5cf6','book-open'),
      (uid,'Lazer','despesa','#ec4899','ticket'),
      (uid,'Assinaturas','despesa','#64748b','repeat'),
      (uid,'Compras','despesa','#eab308','shopping-bag'),
      (uid,'Outras despesas','despesa','#94a3b8','circle');
  end if;
end;
$$;

revoke all on function public.ensure_profile(text, text) from public;
grant execute on function public.ensure_profile(text, text) to authenticated;
