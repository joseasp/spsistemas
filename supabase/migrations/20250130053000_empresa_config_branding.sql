alter table public.empresa_config
  add column if not exists nome_exibicao text,
  add column if not exists logo_url text,
  add column if not exists cor_primaria text,
  add column if not exists cor_secundaria text,
  add column if not exists cor_accent text,
  add column if not exists cor_fundo text;
