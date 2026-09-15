create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  used_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.licenses enable row level security;

drop policy if exists "licencias_le_own" on public.licenses;
create policy "licencias_le_own" on public.licenses
  for select
  using (auth.uid() = used_by);

create or replace function public.redeem_license(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_used_by uuid;
begin
  select id, used_by into v_id, v_used_by
    from public.licenses
    where code = upper(trim(p_code))
    for update;

  if v_id is null then
    return false;
  end if;

  if v_used_by is not null then
    return false;
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