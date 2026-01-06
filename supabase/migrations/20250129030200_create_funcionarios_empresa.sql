create table if not exists public.funcionarios_empresa (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  nome text,
  cliente_id uuid
);
