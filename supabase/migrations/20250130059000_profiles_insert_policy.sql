create policy profiles_insert_own
  on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

insert into public.profiles (id, email, nome)
select u.id,
       u.email,
       nullif(trim(coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'name', '')), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
