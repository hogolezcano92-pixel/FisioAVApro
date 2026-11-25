drop view if exists public.patient_portal_profile;
create or replace function public.patient_portal_profile()
returns table (id uuid, full_name text, birth_date date)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, p.full_name, p.birth_date
  from public.patients p
  join public.patient_portal_access pa on pa.patient_id = p.id
  where pa.patient_user_id = (select auth.uid())
    and pa.active = true
$$;
revoke all on function public.patient_portal_profile() from public, anon;
grant execute on function public.patient_portal_profile() to authenticated;
