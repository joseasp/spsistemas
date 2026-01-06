create table if not exists public.empresa_convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email text not null,
  role text not null default 'user',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists empresa_convites_empresa_email_key
  on public.empresa_convites (empresa_id, email);

alter table public.empresa_convites enable row level security;

create policy empresa_convites_admin_all
  on public.empresa_convites
  for all to authenticated
  using (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  )
  with check (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  );

create or replace function public.list_empresa_convites()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, email, role, created_at
  from public.empresa_convites
  where empresa_id = public.current_empresa_id()
    and public.is_empresa_admin()
    and accepted_at is null
  order by created_at desc;
$$;

create or replace function public.invite_user_to_empresa(user_email text, user_role text default 'user')
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
  v_email text;
begin
  if not public.is_empresa_admin() then
    raise exception 'permissao negada';
  end if;

  v_email := lower(trim(user_email));
  if v_email = '' then
    raise exception 'email invalido';
  end if;

  v_role := lower(coalesce(user_role, 'user'));
  if v_role not in ('user', 'admin') then
    raise exception 'role invalida';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is not null then
    if exists (select 1 from public.empresa_usuarios where user_id = v_user_id) then
      raise exception 'usuario ja pertence a uma empresa';
    end if;

    insert into public.empresa_usuarios (empresa_id, user_id, role)
    values (public.current_empresa_id(), v_user_id, v_role);

    delete from public.empresa_convites
    where empresa_id = public.current_empresa_id()
      and lower(email) = v_email;

    return 'added';
  end if;

  insert into public.empresa_convites (empresa_id, email, role, created_by, accepted_at)
  values (public.current_empresa_id(), v_email, v_role, auth.uid(), null)
  on conflict (empresa_id, email)
  do update set
    role = excluded.role,
    created_by = excluded.created_by,
    created_at = now(),
    accepted_at = null;

  return 'invited';
end;
$$;

create or replace function public.accept_empresa_convite()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_invite record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth required';
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id
  limit 1;

  if v_email is null then
    return null;
  end if;

  if exists (select 1 from public.empresa_usuarios where user_id = v_user_id) then
    return null;
  end if;

  select id, empresa_id, role
  into v_invite
  from public.empresa_convites
  where lower(email) = lower(v_email)
    and accepted_at is null
  order by created_at desc
  limit 1;

  if v_invite is null then
    return null;
  end if;

  insert into public.empresa_usuarios (empresa_id, user_id, role)
  values (v_invite.empresa_id, v_user_id, v_invite.role);

  update public.empresa_convites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.empresa_id;
end;
$$;
