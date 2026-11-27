drop policy if exists patient_portal_messages_select on public.patient_portal_messages;
create policy patient_portal_messages_select on public.patient_portal_messages
for select to authenticated using (
  exists (
    select 1 from public.patient_portal_access pa
    where pa.patient_id=patient_portal_messages.patient_id
      and pa.patient_user_id=auth.uid() and pa.active=true
  )
  or (
    professional_user_id=auth.uid()
    and exists (select 1 from public.patients p where p.id=patient_portal_messages.patient_id and p.user_id=auth.uid())
  )
);