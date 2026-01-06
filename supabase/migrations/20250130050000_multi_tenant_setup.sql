create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ativo boolean not null default true
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create unique index if not exists empresa_usuarios_user_id_key
  on public.empresa_usuarios (user_id);

create unique index if not exists empresa_usuarios_empresa_user_key
  on public.empresa_usuarios (empresa_id, user_id);

create table if not exists public.empresa_config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  usa_estoque boolean not null default false,
  usa_erp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id
  from public.empresa_usuarios
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

alter table public.caixa_operacoes
  add column if not exists empresa_id uuid;

alter table public.clientes
  add column if not exists empresa_id uuid;

alter table public.funcionarios_empresa
  add column if not exists empresa_id uuid;

alter table public.itens_transacao
  add column if not exists empresa_id uuid;

alter table public.pagamentos
  add column if not exists empresa_id uuid;

alter table public.produtos
  add column if not exists empresa_id uuid;

alter table public.transacoes
  add column if not exists empresa_id uuid;

do $$
declare
  v_empresa uuid;
begin
  select id into v_empresa from public.empresas order by created_at limit 1;
  if v_empresa is null then
    insert into public.empresas (nome)
    values ('Empresa Padrao')
    returning id into v_empresa;
  end if;

  insert into public.empresa_config (empresa_id)
  values (v_empresa)
  on conflict (empresa_id) do nothing;

  update public.caixa_operacoes set empresa_id = v_empresa where empresa_id is null;
  update public.clientes set empresa_id = v_empresa where empresa_id is null;
  update public.funcionarios_empresa set empresa_id = v_empresa where empresa_id is null;
  update public.itens_transacao set empresa_id = v_empresa where empresa_id is null;
  update public.pagamentos set empresa_id = v_empresa where empresa_id is null;
  update public.produtos set empresa_id = v_empresa where empresa_id is null;
  update public.transacoes set empresa_id = v_empresa where empresa_id is null;
end;
$$;

alter table public.caixa_operacoes
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.clientes
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.funcionarios_empresa
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.itens_transacao
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.pagamentos
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.produtos
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.transacoes
  alter column empresa_id set default public.current_empresa_id(),
  alter column empresa_id set not null;

alter table public.caixa_operacoes
  add constraint caixa_operacoes_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.clientes
  add constraint clientes_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.funcionarios_empresa
  add constraint funcionarios_empresa_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.itens_transacao
  add constraint itens_transacao_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.pagamentos
  add constraint pagamentos_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.produtos
  add constraint produtos_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

alter table public.transacoes
  add constraint transacoes_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

create index if not exists caixa_operacoes_empresa_id_idx
  on public.caixa_operacoes (empresa_id);

create index if not exists clientes_empresa_id_idx
  on public.clientes (empresa_id);

create index if not exists funcionarios_empresa_empresa_id_idx
  on public.funcionarios_empresa (empresa_id);

create index if not exists itens_transacao_empresa_id_idx
  on public.itens_transacao (empresa_id);

create index if not exists pagamentos_empresa_id_idx
  on public.pagamentos (empresa_id);

create index if not exists produtos_empresa_id_idx
  on public.produtos (empresa_id);

create index if not exists transacoes_empresa_id_idx
  on public.transacoes (empresa_id);

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.empresa_usuarios enable row level security;
alter table public.empresa_config enable row level security;
alter table public.caixa_operacoes enable row level security;
alter table public.clientes enable row level security;
alter table public.funcionarios_empresa enable row level security;
alter table public.itens_transacao enable row level security;
alter table public.pagamentos enable row level security;
alter table public.produtos enable row level security;
alter table public.transacoes enable row level security;

create policy empresas_select_own
  on public.empresas
  for select to authenticated
  using (id = public.current_empresa_id());

create policy empresas_update_own
  on public.empresas
  for update to authenticated
  using (id = public.current_empresa_id())
  with check (id = public.current_empresa_id());

create policy profiles_select_own
  on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy empresa_usuarios_select_own
  on public.empresa_usuarios
  for select to authenticated
  using (user_id = auth.uid());

create policy empresa_config_select_own
  on public.empresa_config
  for select to authenticated
  using (empresa_id = public.current_empresa_id());

create policy empresa_config_update_own
  on public.empresa_config
  for update to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy caixa_operacoes_empresa_isolation
  on public.caixa_operacoes
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy clientes_empresa_isolation
  on public.clientes
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy funcionarios_empresa_isolation
  on public.funcionarios_empresa
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy itens_transacao_empresa_isolation
  on public.itens_transacao
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy pagamentos_empresa_isolation
  on public.pagamentos
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy produtos_empresa_isolation
  on public.produtos
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy transacoes_empresa_isolation
  on public.transacoes
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());
