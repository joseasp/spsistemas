create or replace function public.is_empresa_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.empresa_usuarios
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.get_empresa_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.empresa_usuarios
  where user_id = auth.uid()
  limit 1
$$;

create policy empresa_usuarios_select_admin
  on public.empresa_usuarios
  for select to authenticated
  using (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  );

create policy empresa_usuarios_insert_admin
  on public.empresa_usuarios
  for insert to authenticated
  with check (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  );

create policy empresa_usuarios_update_admin
  on public.empresa_usuarios
  for update to authenticated
  using (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  )
  with check (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  );

create policy empresa_usuarios_delete_admin
  on public.empresa_usuarios
  for delete to authenticated
  using (
    public.is_empresa_admin()
    and empresa_id = public.current_empresa_id()
  );

create or replace function public.list_empresa_usuarios()
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select eu.user_id, u.email, eu.role, eu.created_at
  from public.empresa_usuarios eu
  join auth.users u on u.id = eu.user_id
  where eu.empresa_id = public.current_empresa_id()
    and public.is_empresa_admin()
  order by eu.created_at asc;
$$;

create or replace function public.add_user_to_empresa(user_email text, user_role text default 'user')
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
begin
  if not public.is_empresa_admin() then
    raise exception 'permissao negada';
  end if;

  v_role := lower(coalesce(user_role, 'user'));
  if v_role not in ('user', 'admin') then
    raise exception 'role invalida';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(user_email)
  limit 1;

  if v_user_id is null then
    raise exception 'usuario nao encontrado';
  end if;

  if exists (select 1 from public.empresa_usuarios where user_id = v_user_id) then
    raise exception 'usuario ja pertence a uma empresa';
  end if;

  insert into public.empresa_usuarios (empresa_id, user_id, role)
  values (public.current_empresa_id(), v_user_id, v_role);

  return v_user_id;
end;
$$;

create or replace function public.remove_user_from_empresa(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_target_role text;
  v_owner_count int;
begin
  if not public.is_empresa_admin() then
    raise exception 'permissao negada';
  end if;

  v_role := public.get_empresa_role();
  v_target_role := (
    select role
    from public.empresa_usuarios
    where user_id = target_user_id
      and empresa_id = public.current_empresa_id()
    limit 1
  );

  if v_target_role is null then
    raise exception 'usuario nao pertence a empresa';
  end if;

  if v_target_role = 'owner' and v_role <> 'owner' then
    raise exception 'apenas owner pode remover outro owner';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'nao e permitido remover a si mesmo';
  end if;

  select count(*) into v_owner_count
  from public.empresa_usuarios
  where empresa_id = public.current_empresa_id()
    and role = 'owner';

  if v_target_role = 'owner' and v_owner_count <= 1 then
    raise exception 'empresa precisa de ao menos um owner';
  end if;

  delete from public.empresa_usuarios
  where empresa_id = public.current_empresa_id()
    and user_id = target_user_id;
end;
$$;
