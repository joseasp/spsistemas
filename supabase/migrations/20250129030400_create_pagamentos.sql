create table if not exists public.pagamentos (
  id uuid,
  cliente_id uuid,
  valor numeric,
  forma_pagamento text,
  data_pagamento timestamptz,
  observacao text,
  origem_transacao_id uuid,
  estornado boolean,
  observacao_estorno text,
  data_estorno timestamptz
);
