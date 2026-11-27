-- Expand individually shareable portal resources and add patient feedback channels.
alter table public.patient_portal_shares
  drop constraint if exists patient_portal_shares_record_type_check;
alter table public.patient_portal_shares
  add constraint patient_portal_shares_record_type_check
  check (record_type in ('assessment','document','exercise','evolution','appointment','treatment_plan'));

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
  end if;
  return false;
end;
$function$;

create or replace function private.can_patient_read_portal_record(
  p_record_type text, p_patient_id uuid, p_record_id uuid
) returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and exists (
    select 1 from public.patient_portal_access pa
    join public.patient_portal_shares s on s.patient_id=pa.patient_id
    where pa.patient_id=p_patient_id and pa.patient_user_id=auth.uid() and pa.active=true
      and s.record_type=p_record_type and s.record_id=p_record_id
  );
$function$;

revoke all on function private.can_share_patient_portal_record(uuid,uuid,text,uuid) from public, anon;
revoke all on function private.can_patient_read_portal_record(text,uuid,uuid) from public, anon;
grant execute on function private.can_share_patient_portal_record(uuid,uuid,text,uuid) to authenticated;
grant execute on function private.can_patient_read_portal_record(text,uuid,uuid) to authenticated;

drop policy if exists patient_portal_shares_professional_insert on public.patient_portal_shares;
create policy patient_portal_shares_professional_insert on public.patient_portal_shares
for insert to authenticated with check (
  private.can_share_patient_portal_record(patient_id,professional_user_id,record_type,record_id)
);

drop policy if exists patient_exercises_portal_select on public.patient_exercise_prescriptions;
create policy patient_exercises_portal_select on public.patient_exercise_prescriptions
for select to authenticated using (
  private.can_patient_read_portal_record('exercise',patient_id,id) and status='ativo'
);

drop policy if exists evolutions_portal_select on public.evolutions;
create policy evolutions_portal_select on public.evolutions
for select to authenticated using (private.can_patient_read_portal_record('evolution',patient_id,id));

drop policy if exists appointments_portal_select on public.appointments;
create policy appointments_portal_select on public.appointments
for select to authenticated using (private.can_patient_read_portal_record('appointment',patient_id,id));

drop policy if exists treatment_plans_portal_select on public.treatment_plans;
create policy treatment_plans_portal_select on public.treatment_plans
for select to authenticated using (private.can_patient_read_portal_record('treatment_plan',patient_id,id));

create table if not exists public.patient_portal_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescription_id uuid not null references public.patient_exercise_prescriptions(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  performed_at timestamptz not null default now(),
  status text not null check(status in ('realizado','nao_realizado')),
  notes text not null default '' check (char_length(notes)<=1000),
  created_at timestamptz not null default now()
);
create index if not exists patient_portal_exercise_logs_patient_idx
  on public.patient_portal_exercise_logs(patient_id,performed_at desc);
alter table public.patient_portal_exercise_logs enable row level security;
grant select,insert on public.patient_portal_exercise_logs to authenticated;

drop policy if exists patient_portal_exercise_logs_patient_select on public.patient_portal_exercise_logs;
create policy patient_portal_exercise_logs_patient_select on public.patient_portal_exercise_logs
for select to authenticated using (patient_user_id=auth.uid() and exists (
  select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_exercise_logs.patient_id
    and pa.patient_user_id=auth.uid() and pa.active=true
));
drop policy if exists patient_portal_exercise_logs_patient_insert on public.patient_portal_exercise_logs;
create policy patient_portal_exercise_logs_patient_insert on public.patient_portal_exercise_logs
for insert to authenticated with check (
  patient_user_id=auth.uid() and exists (
    select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_exercise_logs.patient_id
      and pa.patient_user_id=auth.uid() and pa.active=true
  ) and private.can_patient_read_portal_record('exercise',patient_id,prescription_id)
);
drop policy if exists patient_portal_exercise_logs_professional_select on public.patient_portal_exercise_logs;
create policy patient_portal_exercise_logs_professional_select on public.patient_portal_exercise_logs
for select to authenticated using (exists (
  select 1 from public.patients p where p.id=patient_portal_exercise_logs.patient_id and p.user_id=auth.uid()
));

create table if not exists public.patient_portal_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check(sender_role in ('patient','professional')),
  body text not null check(char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists patient_portal_messages_thread_idx
  on public.patient_portal_messages(patient_id,created_at);
alter table public.patient_portal_messages enable row level security;
grant select,insert on public.patient_portal_messages to authenticated;

drop policy if exists patient_portal_messages_select on public.patient_portal_messages;
create policy patient_portal_messages_select on public.patient_portal_messages
for select to authenticated using (
  (sender_user_id=auth.uid() and sender_role='patient' and exists (
    select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_messages.patient_id
      and pa.patient_user_id=auth.uid() and pa.active=true
  ))
  or (professional_user_id=auth.uid() and exists (
    select 1 from public.patients p where p.id=patient_portal_messages.patient_id and p.user_id=auth.uid()
  ))
);
drop policy if exists patient_portal_messages_insert_patient on public.patient_portal_messages;
create policy patient_portal_messages_insert_patient on public.patient_portal_messages
for insert to authenticated with check (
  sender_role='patient' and sender_user_id=auth.uid() and exists (
    select 1 from public.patient_portal_access pa where pa.patient_id=patient_portal_messages.patient_id
      and pa.patient_user_id=auth.uid() and pa.professional_user_id=patient_portal_messages.professional_user_id and pa.active=true
  )
);
drop policy if exists patient_portal_messages_insert_professional on public.patient_portal_messages;
create policy patient_portal_messages_insert_professional on public.patient_portal_messages
for insert to authenticated with check (
  sender_role='professional' and sender_user_id=auth.uid() and professional_user_id=auth.uid() and exists (
    select 1 from public.patients p where p.id=patient_portal_messages.patient_id and p.user_id=auth.uid()
  )
);
