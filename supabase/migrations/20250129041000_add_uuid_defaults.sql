create extension if not exists pgcrypto;

alter table public.caixa_operacoes
  alter column id set default gen_random_uuid();

alter table public.clientes
  alter column id set default gen_random_uuid();

alter table public.funcionarios_empresa
  alter column id set default gen_random_uuid();

alter table public.itens_transacao
  alter column id set default gen_random_uuid();

alter table public.pagamentos
  alter column id set default gen_random_uuid();

alter table public.produtos
  alter column id set default gen_random_uuid();

alter table public.transacoes
  alter column id set default gen_random_uuid();
