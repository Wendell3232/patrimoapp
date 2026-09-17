alter table public.licenses
  alter column code drop not null;

create or replace function public.has_license_for_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null then
    return false;
  end if;

  select id into v_id
    from public.licenses
   where used_by = v_uid
   limit 1;

  if v_id is null and v_email is not null then
    select id into v_id
      from public.licenses
     where lower(email) = v_email
     limit 1;
  end if;

  if v_id is null then
    return false;
  end if;

  update public.licenses
     set used_by = coalesce(used_by, v_uid),
         redeemed_at = coalesce(redeemed_at, now())
   where id = v_id;

  return true;
end;
$$;

revoke execute on function public.has_license_for_user() from public, anon;
grant execute on function public.has_license_for_user() to authenticated;
grant execute on function public.has_license_for_user() to service_role;