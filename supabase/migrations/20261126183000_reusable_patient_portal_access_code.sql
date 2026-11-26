-- Permite reutilizar o código individual para recuperar o acesso do paciente.
-- Gerar um novo código invalida todos os códigos anteriores do mesmo paciente.
create or replace function public.claim_patient_portal_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions', 'auth'
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
    and (i.expires_at is null or i.expires_at > now())
  for update;

  if not found then
    raise exception 'Código inválido, expirado ou substituído. Solicite um novo código ao fisioterapeuta.';
  end if;

  if exists (
    select 1 from public.patient_portal_access
    where patient_user_id = auth.uid() and patient_id <> v_invite.patient_id
  ) then
    raise exception 'Esta conta já está vinculada a outro paciente.';
  end if;

  update public.patient_portal_access
  set patient_user_id = auth.uid(),
      professional_user_id = v_invite.professional_user_id,
      active = true,
      linked_at = now()
  where patient_id = v_invite.patient_id;

  if not found then
    insert into public.patient_portal_access
      (patient_id, professional_user_id, patient_user_id, active)
    values
      (v_invite.patient_id, v_invite.professional_user_id, auth.uid(), true);
  end if;

  -- Mantém o registro de quando o código foi usado pela primeira vez,
  -- mas não bloqueia reutilizações enquanto o código não for substituído.
  update public.patient_portal_invites
  set used_at = coalesce(used_at, now())
  where id = v_invite.id;

  return v_invite.patient_id;
end;
$function$;

create or replace function public.create_patient_portal_invite(p_patient_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions', 'auth'
as $function$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação profissional necessária.';
  end if;

  if not exists (
    select 1 from public.patients
    where id = p_patient_id and user_id = auth.uid()
  ) then
    raise exception 'Paciente não encontrado ou sem permissão.';
  end if;

  -- Revoga qualquer código anterior, inclusive os já utilizados.
  update public.patient_portal_invites
  set expires_at = now()
  where patient_id = p_patient_id
    and (expires_at is null or expires_at > now());

  v_code := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.patient_portal_invites
    (patient_id, professional_user_id, code_hash, expires_at)
  values
    (p_patient_id, auth.uid(), encode(extensions.digest(v_code, 'sha256'), 'hex'), null);

  return v_code;
end;
$function$;