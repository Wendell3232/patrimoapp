alter table public.licenses
  add column if not exists email text,
  add column if not exists payment_id text;

create unique index if not exists licenses_payment_id_key
  on public.licenses (payment_id)
  where payment_id is not null;

revoke execute on function public.redeem_license(text) from public, anon;

create or replace function public.redeem_license(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_used_by uuid;
  v_email text;
  v_claimer text;
begin
  select id, used_by, email into v_id, v_used_by, v_email
    from public.licenses
    where code = upper(trim(p_code))
    for update;

  if v_id is null then
    return false;
  end if;

  if v_used_by is not null then
    return false;
  end if;

  v_claimer := nullif(auth.jwt() ->> 'email', '');

  if v_email is not null and v_claimer is not null then
    if lower(v_claimer) <> lower(v_email) then
      return false;
    end if;
  end if;

  update public.licenses
     set used_by = auth.uid(),
         redeemed_at = now()
   where id = v_id;

  return true;
end;
$$;

grant execute on function public.redeem_license(text) to authenticated;
grant execute on function public.redeem_license(text) to service_role;