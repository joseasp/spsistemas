create table if not exists public.clientes (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  nome text,
  contato text,
  tipo text,
  observacoes text,
  ativo boolean
);
