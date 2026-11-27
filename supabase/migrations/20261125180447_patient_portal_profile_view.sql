-- Expose only basic identity fields to the patient portal; keep the clinical patient row private.
drop policy if exists patients_portal_patient_select on public.patients;
create or replace view public.patient_portal_profile
with (security_invoker = false, security_barrier = true)
as
select p.id, p.full_name, p.birth_date
from public.patients p
join public.patient_portal_access pa on pa.patient_id = p.id
where pa.patient_user_id = (select auth.uid())
  and pa.active = true;
revoke all on public.patient_portal_profile from anon;
grant select on public.patient_portal_profile to authenticated;
