create policy empresa_config_insert_own
  on public.empresa_config
  for insert to authenticated
  with check (empresa_id = public.current_empresa_id());
