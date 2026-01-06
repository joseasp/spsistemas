create or replace function public.bootstrap_empresa(nome_empresa text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_empresa uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth required';
  end if;

  if exists (select 1 from public.empresa_usuarios where user_id = v_user) then
    raise exception 'usuario ja possui empresa';
  end if;

  -- Se ainda nao ha nenhum usuario associado, reutiliza a empresa existente.
  if not exists (select 1 from public.empresa_usuarios) then
    select id into v_empresa from public.empresas order by created_at limit 1;
    if v_empresa is not null then
      insert into public.empresa_usuarios (empresa_id, user_id, role)
      values (v_empresa, v_user, 'owner');

      insert into public.empresa_config (empresa_id)
      values (v_empresa)
      on conflict (empresa_id) do nothing;

      return v_empresa;
    end if;
  end if;

  insert into public.empresas (nome)
  values (nome_empresa)
  returning id into v_empresa;

  insert into public.empresa_usuarios (empresa_id, user_id, role)
  values (v_empresa, v_user, 'owner');

  insert into public.empresa_config (empresa_id)
  values (v_empresa);

  return v_empresa;
end;
$$;
