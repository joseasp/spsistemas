create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.transacoes
  add column if not exists event_at timestamptz,
  add column if not exists business_date date;

alter table public.pagamentos
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists event_at timestamptz,
  add column if not exists business_date date;

alter table public.transacoes
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column event_at set default now();

alter table public.pagamentos
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column event_at set default now();

create or replace function public.sync_transacao_event_at()
returns trigger
language plpgsql
as $$
begin
  if new.event_at is null then
    new.event_at = coalesce(new.data_transacao, now());
  end if;
  if new.business_date is null then
    new.business_date = coalesce(new.data_local, new.event_at::date);
  end if;
  return new;
end;
$$;

create or replace function public.sync_pagamento_event_at()
returns trigger
language plpgsql
as $$
begin
  if new.event_at is null then
    new.event_at = coalesce(new.data_pagamento, now());
  end if;
  if new.business_date is null then
    new.business_date = new.event_at::date;
  end if;
  return new;
end;
$$;

drop trigger if exists set_transacoes_updated_at on public.transacoes;
create trigger set_transacoes_updated_at
  before update on public.transacoes
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_pagamentos_updated_at on public.pagamentos;
create trigger set_pagamentos_updated_at
  before update on public.pagamentos
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_transacoes_event_at on public.transacoes;
create trigger set_transacoes_event_at
  before insert or update on public.transacoes
  for each row execute procedure public.sync_transacao_event_at();

drop trigger if exists set_pagamentos_event_at on public.pagamentos;
create trigger set_pagamentos_event_at
  before insert or update on public.pagamentos
  for each row execute procedure public.sync_pagamento_event_at();

update public.transacoes
  set event_at = coalesce(event_at, data_transacao, created_at, now()),
      business_date = coalesce(business_date, data_local, (coalesce(event_at, data_transacao, created_at, now()))::date)
  where event_at is null or business_date is null;

update public.pagamentos
  set event_at = coalesce(event_at, data_pagamento, created_at, now()),
      business_date = coalesce(business_date, (coalesce(event_at, data_pagamento, created_at, now()))::date),
      created_at = coalesce(created_at, now()),
      updated_at = coalesce(updated_at, now())
  where event_at is null or business_date is null or created_at is null or updated_at is null;
