-- Biblioteca e acompanhamento de exercícios prescritos por paciente.
-- Dados isolados por profissional e paciente via RLS.

create table if not exists public.patient_exercise_prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  category text not null,
  objective text not null default '',
  instructions text not null default '',
  precautions text not null default '',
  sets integer not null default 2 check (sets between 1 and 50),
  reps text not null default '10',
  hold_seconds integer not null default 0 check (hold_seconds between 0 and 3600),
  frequency text not null default '',
  status text not null default 'ativo' check (status in ('ativo','suspenso','concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescription_id uuid not null references public.patient_exercise_prescriptions(id) on delete cascade,
  performed_at timestamptz not null default now(),
  status text not null check (status in ('realizado','nao_realizado')),
  performed_sets integer not null default 0 check (performed_sets between 0 and 50),
  performed_reps text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists patient_exercise_prescriptions_patient_idx
  on public.patient_exercise_prescriptions(patient_id, created_at desc);
create index if not exists patient_exercise_logs_patient_idx
  on public.patient_exercise_logs(patient_id, performed_at desc);
create index if not exists patient_exercise_logs_prescription_idx
  on public.patient_exercise_logs(prescription_id, performed_at desc);

alter table public.patient_exercise_prescriptions enable row level security;
alter table public.patient_exercise_logs enable row level security;

drop policy if exists "Users manage own patient exercise prescriptions" on public.patient_exercise_prescriptions;
create policy "Users manage own patient exercise prescriptions"
  on public.patient_exercise_prescriptions for all to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()
  ));

drop policy if exists "Users manage own patient exercise logs" on public.patient_exercise_logs;
create policy "Users manage own patient exercise logs"
  on public.patient_exercise_logs for all to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()
  ) and exists (
    select 1 from public.patient_exercise_prescriptions ep
    where ep.id = prescription_id and ep.patient_id = patient_id and ep.user_id = auth.uid()
  ));

grant select, insert, update, delete on public.patient_exercise_prescriptions to authenticated;
grant select, insert, update, delete on public.patient_exercise_logs to authenticated;
