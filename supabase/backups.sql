-- Caderno de Estudos: pasta privada para as cópias automáticas (backups)
-- Cole em SQL Editor › New query e clique em Run. Pode rodar mais de uma vez sem problema.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do nothing;

drop policy if exists "backups dono le" on storage.objects;
drop policy if exists "backups dono envia" on storage.objects;
drop policy if exists "backups dono altera" on storage.objects;
drop policy if exists "backups dono apaga" on storage.objects;
create policy "backups dono le" on storage.objects for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "backups dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "backups dono altera" on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "backups dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
