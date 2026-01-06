create table if not exists public.itens_transacao (
  id uuid,
  transacao_id uuid,
  produto_id uuid,
  quantidade numeric,
  preco_unitario_congelado numeric,
  nome_produto_congelado text,
  created_at timestamptz,
  updated_at timestamptz
);
