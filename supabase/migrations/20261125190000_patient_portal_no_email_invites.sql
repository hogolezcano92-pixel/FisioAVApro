create or replace function public.create_patient_portal_invite(p_patient_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth
as $function$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação profissional necessária.';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and user_id = auth.uid()) then
    raise exception 'Paciente não encontrado ou sem permissão.';
  end if;
  if exists (select 1 from public.patient_portal_access where patient_id = p_patient_id and active = true) then
    raise exception 'Este paciente já possui acesso ativo ao portal.';
  end if;
  update public.patient_portal_invites
  set expires_at = now()
  where patient_id = p_patient_id and used_at is null and expires_at > now();
  v_code := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.patient_portal_invites (patient_id, professional_user_id, code_hash, expires_at)
  values (p_patient_id, auth.uid(), encode(extensions.digest(v_code, 'sha256'), 'hex'), now() + interval '7 days');
  return v_code;
end;
$function$;

create or replace function public.claim_patient_portal_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $function$
declare
  v_invite public.patient_portal_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Inicie o acesso pelo portal para ativar o convite.';
  end if;
  if coalesce(length(trim(p_code)), 0) < 32 then
    raise exception 'Código de convite inválido.';
  end if;
  select i.* into v_invite
  from public.patient_portal_invites i
  where i.code_hash = encode(extensions.digest(trim(p_code), 'sha256'), 'hex')
    and i.used_at is null and i.expires_at > now()
  for update;
  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
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
$function$;

revoke all on function public.create_patient_portal_invite(uuid) from public, anon;
revoke all on function public.claim_patient_portal_invite(text) from public, anon;
grant execute on function public.create_patient_portal_invite(uuid) to authenticated;
grant execute on function public.claim_patient_portal_invite(text) to authenticated;
