-- Prevent RLS recursion when a professional shares an assessment or document.
-- The previous INSERT policy queried assessments/clinical_documents directly.
-- Their patient-facing SELECT policies query patient_portal_shares, creating a cycle.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_share_patient_portal_record(
  p_patient_id uuid,
  p_professional_user_id uuid,
  p_record_type text,
  p_record_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or p_professional_user_id is distinct from auth.uid() then
    return false;
  end if;

  if not exists (
    select 1
    from public.patients p
    where p.id = p_patient_id
      and p.user_id = auth.uid()
  ) then
    return false;
  end if;

  if p_record_type = 'assessment' then
    return exists (
      select 1
      from public.assessments a
      where a.id = p_record_id
        and a.patient_id = p_patient_id
        and a.user_id = auth.uid()
    );
  elsif p_record_type = 'document' then
    return exists (
      select 1
      from public.clinical_documents d
      where d.id = p_record_id
        and d.patient_id = p_patient_id
        and d.user_id = auth.uid()
    );
  end if;

  return false;
end;
$function$;

revoke all on function private.can_share_patient_portal_record(uuid, uuid, text, uuid) from public, anon;
grant execute on function private.can_share_patient_portal_record(uuid, uuid, text, uuid) to authenticated;

drop policy if exists patient_portal_shares_professional_insert on public.patient_portal_shares;
create policy patient_portal_shares_professional_insert
on public.patient_portal_shares
for insert
to authenticated
with check (
  private.can_share_patient_portal_record(
    patient_id,
    professional_user_id,
    record_type,
    record_id
  )
);
