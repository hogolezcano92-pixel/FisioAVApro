alter table public.patient_portal_shares drop constraint if exists patient_portal_shares_record_type_check;
alter table public.patient_portal_shares add constraint patient_portal_shares_record_type_check
check (record_type in ('assessment','document','exercise','evolution','appointment','treatment_plan','reassessment'));

create or replace function private.can_share_patient_portal_record(
  p_patient_id uuid, p_professional_user_id uuid, p_record_type text, p_record_id uuid
) returns boolean language plpgsql stable security definer set search_path = ''
as $function$
begin
  if auth.uid() is null or p_professional_user_id is distinct from auth.uid() then return false; end if;
  if not exists (select 1 from public.patients p where p.id=p_patient_id and p.user_id=auth.uid()) then return false; end if;
  if p_record_type='assessment' then
    return exists(select 1 from public.assessments r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='document' then
    return exists(select 1 from public.clinical_documents r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='exercise' then
    return exists(select 1 from public.patient_exercise_prescriptions r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='evolution' then
    return exists(select 1 from public.evolutions r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='appointment' then
    return exists(select 1 from public.appointments r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='treatment_plan' then
    return exists(select 1 from public.treatment_plans r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  elsif p_record_type='reassessment' then
    return exists(select 1 from public.reassessments r where r.id=p_record_id and r.patient_id=p_patient_id and r.user_id=auth.uid());
  end if;
  return false;
end;
$function$;

drop policy if exists reassessments_portal_select on public.reassessments;
create policy reassessments_portal_select on public.reassessments
for select to authenticated using (private.can_patient_read_portal_record('reassessment',patient_id,id));
