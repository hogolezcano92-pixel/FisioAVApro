create index if not exists patient_exercise_prescriptions_user_idx on public.patient_exercise_prescriptions(user_id);
create index if not exists patient_exercise_logs_user_idx on public.patient_exercise_logs(user_id);
create index if not exists patient_portal_access_professional_idx on public.patient_portal_access(professional_user_id);
create index if not exists patient_portal_exercise_logs_prescription_idx on public.patient_portal_exercise_logs(prescription_id);
create index if not exists patient_portal_exercise_logs_patient_user_idx on public.patient_portal_exercise_logs(patient_user_id);
create index if not exists patient_portal_messages_professional_idx on public.patient_portal_messages(professional_user_id);
create index if not exists patient_portal_messages_sender_idx on public.patient_portal_messages(sender_user_id);

drop policy if exists patient_portal_exercise_logs_patient_select on public.patient_portal_exercise_logs;
drop policy if exists patient_portal_exercise_logs_professional_select on public.patient_portal_exercise_logs;
create policy patient_portal_exercise_logs_select on public.patient_portal_exercise_logs
for select to authenticated using (
  (patient_user_id=(select auth.uid()) and exists (
    select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_exercise_logs.patient_id
      and pa.patient_user_id=(select auth.uid()) and pa.active=true
  ))
  or exists (
    select 1 from public.patients p where p.id=patient_portal_exercise_logs.patient_id and p.user_id=(select auth.uid())
  )
);
drop policy if exists patient_portal_exercise_logs_patient_insert on public.patient_portal_exercise_logs;
create policy patient_portal_exercise_logs_patient_insert on public.patient_portal_exercise_logs
for insert to authenticated with check (
  patient_user_id=(select auth.uid()) and exists (
    select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_exercise_logs.patient_id
      and pa.patient_user_id=(select auth.uid()) and pa.active=true
  ) and private.can_patient_read_portal_record('exercise',patient_id,prescription_id)
);

drop policy if exists patient_portal_messages_select on public.patient_portal_messages;
create policy patient_portal_messages_select on public.patient_portal_messages
for select to authenticated using (
  exists (
    select 1 from public.patient_portal_access pa
    where pa.patient_id=patient_portal_messages.patient_id
      and pa.patient_user_id=(select auth.uid()) and pa.active=true
  )
  or (
    professional_user_id=(select auth.uid())
    and exists (select 1 from public.patients p where p.id=patient_portal_messages.patient_id and p.user_id=(select auth.uid()))
  )
);
drop policy if exists patient_portal_messages_insert_patient on public.patient_portal_messages;
drop policy if exists patient_portal_messages_insert_professional on public.patient_portal_messages;
create policy patient_portal_messages_insert on public.patient_portal_messages
for insert to authenticated with check (
  (
    sender_role='patient' and sender_user_id=(select auth.uid()) and exists (
      select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_messages.patient_id
        and pa.patient_user_id=(select auth.uid()) and pa.professional_user_id=patient_portal_messages.professional_user_id and pa.active=true
    )
  )
  or
  (
    sender_role='professional' and sender_user_id=(select auth.uid()) and professional_user_id=(select auth.uid()) and exists (
      select 1 from public.patients p where p.id=patient_portal_messages.patient_id and p.user_id=(select auth.uid())
    )
  )
);