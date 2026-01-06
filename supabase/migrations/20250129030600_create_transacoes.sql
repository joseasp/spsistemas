create table if not exists public.transacoes (
  id uuid,
  cliente_id uuid,
  caixa_operacao_id uuid,
  valor numeric,
  data_transacao timestamptz,
  forma_pagamento text,
  status_pagamento text,
  nome_funcionario_empresa text,
  nome_cliente_avulso text,
  anotacoes text,
  estornado boolean,
  id_transa cao_estornada uuid,
  created_at timestamptz,
  updated_at timestamptz,
  status_preparo text,
  data_local date
);
