create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'name', '')), '');

  insert into public.profiles (id, email, nome)
  values (new.id, new.email, v_nome)
  on conflict (id) do update
  set
    email = excluded.email,
    nome = coalesce(public.profiles.nome, excluded.nome);

  return new;
end;
$$;

drop function if exists public.list_empresa_usuarios();

create or replace function public.list_empresa_usuarios()
returns table (
  user_id uuid,
  email text,
  nome text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select eu.user_id,
         u.email,
         p.nome,
         eu.role,
         eu.created_at
  from public.empresa_usuarios eu
  join auth.users u on u.id = eu.user_id
  left join public.profiles p on p.id = eu.user_id
  where eu.empresa_id = public.current_empresa_id()
    and public.is_empresa_admin()
  order by eu.created_at asc;
$$;

update public.profiles p
set nome = nullif(trim(coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'name', '')), '')
from auth.users u
where p.id = u.id
  and (p.nome is null or p.nome = '')
  and coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'name', '') <> '';
