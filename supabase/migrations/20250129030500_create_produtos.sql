create table if not exists public.produtos (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  nome text,
  preco numeric,
  categoria text,
  ativo boolean
);
