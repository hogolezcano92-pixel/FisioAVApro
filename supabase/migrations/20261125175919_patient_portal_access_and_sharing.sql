-- Patient portal: verified email invitation, per-record sharing, and read-only RLS access.
create table public.patient_portal_invites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.patient_portal_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  patient_user_id uuid not null unique references auth.users(id) on delete cascade,
  active boolean not null default true,
  linked_at timestamptz not null default now()
);
create table public.patient_portal_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('assessment', 'document')),
  record_id uuid not null,
  shared_at timestamptz not null default now(),
  unique (patient_id, record_type, record_id)
);
create index patient_portal_access_patient_user_idx on public.patient_portal_access(patient_user_id) where active = true;
create index patient_portal_shares_patient_idx on public.patient_portal_shares(patient_id, record_type, record_id);

alter table public.patient_portal_invites enable row level security;
alter table public.patient_portal_access enable row level security;
alter table public.patient_portal_shares enable row level security;
grant select on public.patient_portal_access to authenticated;
grant select, insert, delete on public.patient_portal_shares to authenticated;

create policy patient_portal_access_professional_select on public.patient_portal_access
for select to authenticated using (professional_user_id = (select auth.uid()));
create policy patient_portal_access_patient_select on public.patient_portal_access
for select to authenticated using (patient_user_id = (select auth.uid()) and active = true);

create policy patient_portal_shares_professional_select on public.patient_portal_shares
for select to authenticated using (
  professional_user_id = (select auth.uid())
  and exists (select 1 from public.patients p where p.id = patient_portal_shares.patient_id and p.user_id = (select auth.uid()))
);
create policy patient_portal_shares_patient_select on public.patient_portal_shares
for select to authenticated using (
  exists (select 1 from public.patient_portal_access pa where pa.patient_id = patient_portal_shares.patient_id and pa.patient_user_id = (select auth.uid()) and pa.active = true)
);
create policy patient_portal_shares_professional_insert on public.patient_portal_shares
for insert to authenticated with check (
  professional_user_id = (select auth.uid())
  and exists (select 1 from public.patients p where p.id = patient_portal_shares.patient_id and p.user_id = (select auth.uid()))
  and (
    (record_type = 'assessment' and exists (select 1 from public.assessments a where a.id = patient_portal_shares.record_id and a.patient_id = patient_portal_shares.patient_id and a.user_id = (select auth.uid())))
    or
    (record_type = 'document' and exists (select 1 from public.clinical_documents d where d.id = patient_portal_shares.record_id and d.patient_id = patient_portal_shares.patient_id and d.user_id = (select auth.uid())))
  )
);
create policy patient_portal_shares_professional_delete on public.patient_portal_shares
for delete to authenticated using (
  professional_user_id = (select auth.uid())
  and exists (select 1 from public.patients p where p.id = patient_portal_shares.patient_id and p.user_id = (select auth.uid()))
);

create policy patients_portal_patient_select on public.patients for select to authenticated using (
  exists (select 1 from public.patient_portal_access pa where pa.patient_id = patients.id and pa.patient_user_id = (select auth.uid()) and pa.active = true)
);
create policy assessments_portal_patient_select on public.assessments for select to authenticated using (
  exists (
    select 1 from public.patient_portal_shares s
    join public.patient_portal_access pa on pa.patient_id = s.patient_id
    where s.patient_id = assessments.patient_id and s.record_type = 'assessment' and s.record_id = assessments.id
      and pa.patient_user_id = (select auth.uid()) and pa.active = true
  )
);
create policy clinical_documents_portal_patient_select on public.clinical_documents for select to authenticated using (
  exists (
    select 1 from public.patient_portal_shares s
    join public.patient_portal_access pa on pa.patient_id = s.patient_id
    where s.patient_id = clinical_documents.patient_id and s.record_type = 'document' and s.record_id = clinical_documents.id
      and pa.patient_user_id = (select auth.uid()) and pa.active = true
  )
);
create policy clinical_docs_storage_patient_select on storage.objects for select to authenticated using (
  bucket_id = 'clinical-documents'
  and exists (
    select 1 from public.clinical_documents d
    join public.patient_portal_shares s on s.patient_id = d.patient_id and s.record_type = 'document' and s.record_id = d.id
    join public.patient_portal_access pa on pa.patient_id = d.patient_id
    where d.storage_path = objects.name and d.storage_bucket = objects.bucket_id
      and d.user_id = s.professional_user_id
      and (storage.foldername(objects.name))[1] = s.professional_user_id::text
      and pa.patient_user_id = (select auth.uid()) and pa.active = true
  )
);

create or replace function public.create_patient_portal_invite(p_patient_id uuid)
returns text language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare v_code text; v_patient_email text;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select email into v_patient_email from public.patients where id = p_patient_id and user_id = auth.uid();
  if not found then raise exception 'Paciente não encontrado ou sem permissão.'; end if;
  if coalesce(trim(v_patient_email), '') = '' then raise exception 'Cadastre o e-mail do paciente antes de gerar o convite.'; end if;
  if exists (select 1 from public.patient_portal_access where patient_id = p_patient_id and active = true) then
    raise exception 'Este paciente já possui acesso ativo ao portal.';
  end if;
  update public.patient_portal_invites set expires_at = now()
    where patient_id = p_patient_id and used_at is null and expires_at > now();
  v_code := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.patient_portal_invites (patient_id, professional_user_id, code_hash, expires_at)
  values (p_patient_id, auth.uid(), encode(extensions.digest(v_code, 'sha256'), 'hex'), now() + interval '7 days');
  return v_code;
end;
$$;

create or replace function public.claim_patient_portal_invite(p_code text)
returns uuid language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare v_invite public.patient_portal_invites%rowtype; v_patient_email text; v_auth_email text; v_confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para ativar o acesso.'; end if;
  if coalesce(length(trim(p_code)), 0) < 32 then raise exception 'Código de convite inválido.'; end if;
  select i.* into v_invite from public.patient_portal_invites i
    where i.code_hash = encode(extensions.digest(trim(p_code), 'sha256'), 'hex')
      and i.used_at is null and i.expires_at > now() for update;
  if not found then raise exception 'Convite inválido, expirado ou já utilizado.'; end if;
  select p.email into v_patient_email from public.patients p
    where p.id = v_invite.patient_id and p.user_id = v_invite.professional_user_id;
  select u.email, u.email_confirmed_at into v_auth_email, v_confirmed_at from auth.users u where u.id = auth.uid();
  if v_confirmed_at is null or lower(trim(coalesce(v_auth_email, ''))) <> lower(trim(coalesce(v_patient_email, ''))) then
    raise exception 'Use uma conta com e-mail confirmado igual ao e-mail cadastrado pelo fisioterapeuta.';
  end if;
  if exists (select 1 from public.patient_portal_access where patient_id = v_invite.patient_id and active = true)
     or exists (select 1 from public.patient_portal_access where patient_user_id = auth.uid() and active = true) then
    raise exception 'Já existe um vínculo ativo para este paciente ou conta.';
  end if;
  insert into public.patient_portal_access (patient_id, professional_user_id, patient_user_id)
    values (v_invite.patient_id, v_invite.professional_user_id, auth.uid());
  update public.patient_portal_invites set used_at = now() where id = v_invite.id;
  return v_invite.patient_id;
end;
$$;

revoke all on function public.create_patient_portal_invite(uuid) from public, anon;
revoke all on function public.claim_patient_portal_invite(text) from public, anon;
grant execute on function public.create_patient_portal_invite(uuid) to authenticated;
grant execute on function public.claim_patient_portal_invite(text) to authenticated;
