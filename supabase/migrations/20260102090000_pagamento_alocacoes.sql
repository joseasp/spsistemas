create table if not exists public.pagamento_alocacoes (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references public.pagamentos(id) on delete cascade,
  transacao_id uuid not null references public.transacoes(id) on delete cascade,
  valor_aplicado numeric not null,
  created_at timestamptz not null default now(),
  empresa_id uuid not null default public.current_empresa_id()
);

alter table public.pagamento_alocacoes
  add constraint pagamento_alocacoes_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id);

create index if not exists pagamento_alocacoes_empresa_id_idx
  on public.pagamento_alocacoes (empresa_id);

create index if not exists pagamento_alocacoes_pagamento_id_idx
  on public.pagamento_alocacoes (pagamento_id);

create index if not exists pagamento_alocacoes_transacao_id_idx
  on public.pagamento_alocacoes (transacao_id);

create unique index if not exists pagamento_alocacoes_pagamento_transacao_key
  on public.pagamento_alocacoes (pagamento_id, transacao_id);

alter table public.pagamento_alocacoes enable row level security;

create policy pagamento_alocacoes_empresa_isolation
  on public.pagamento_alocacoes
  for all to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

alter table public.empresa_config
  add column if not exists pdv_layout text not null default 'RESTAURANTE';
