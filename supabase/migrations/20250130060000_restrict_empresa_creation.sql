create table if not exists public.empresa_convites_criacao (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists empresa_convites_criacao_email_key
  on public.empresa_convites_criacao (lower(email));

alter table public.empresa_convites_criacao enable row level security;

create or replace function public.can_create_empresa()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return false;
  end if;

  if not exists (select 1 from public.empresa_usuarios) then
    return true;
  end if;

  select email into v_email
  from auth.users
  where id = auth.uid()
  limit 1;

  if v_email is null then
    return false;
  end if;

  return exists (
    select 1
    from public.empresa_convites_criacao
    where lower(email) = lower(v_email)
      and accepted_at is null
  );
end;
$$;

create or replace function public.bootstrap_empresa(nome_empresa text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid;
  v_empresa uuid;
  v_email text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth required';
  end if;

  if exists (select 1 from public.empresa_usuarios where user_id = v_user) then
    raise exception 'usuario ja possui empresa';
  end if;

  if not public.can_create_empresa() then
    raise exception 'acesso nao liberado';
  end if;

  select email into v_email
  from auth.users
  where id = v_user
  limit 1;

  insert into public.empresas (nome)
  values (nome_empresa)
  returning id into v_empresa;

  insert into public.empresa_usuarios (empresa_id, user_id, role)
  values (v_empresa, v_user, 'owner');

  insert into public.empresa_config (empresa_id)
  values (v_empresa);

  if v_email is not null then
    update public.empresa_convites_criacao
    set accepted_at = now()
    where lower(email) = lower(v_email)
      and accepted_at is null;
  end if;

  return v_empresa;
end;
$$;
