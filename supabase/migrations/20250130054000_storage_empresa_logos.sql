insert into storage.buckets (id, name, public)
values ('empresa-logos', 'empresa-logos', true)
on conflict (id) do nothing;

create policy "empresa_logos_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'empresa-logos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa_logos_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'empresa-logos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa_logos_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'empresa-logos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  )
  with check (
    bucket_id = 'empresa-logos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa_logos_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'empresa-logos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
