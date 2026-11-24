-- Caderno de Estudos: configuração do banco no Supabase
-- Cole tudo isto em SQL Editor › New query e clique em Run.

-- 1. Tabela única com todos os dados do caderno
create table if not exists public.docs (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner, col, id)
);
create index if not exists docs_owner_col on public.docs(owner, col);

-- 2. Cada usuário só vê e altera os próprios dados
alter table public.docs enable row level security;
drop policy if exists "dono le" on public.docs;
drop policy if exists "dono insere" on public.docs;
drop policy if exists "dono altera" on public.docs;
drop policy if exists "dono apaga" on public.docs;
create policy "dono le" on public.docs for select to authenticated using (owner = auth.uid());
create policy "dono insere" on public.docs for insert to authenticated with check (owner = auth.uid());
create policy "dono altera" on public.docs for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "dono apaga" on public.docs for delete to authenticated using (owner = auth.uid());

-- 3. Atualização em tempo real entre aparelhos
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 4. Pasta privada para os PDFs (até 20 MB por arquivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "pdfs dono le" on storage.objects;
drop policy if exists "pdfs dono envia" on storage.objects;
drop policy if exists "pdfs dono apaga" on storage.objects;
create policy "pdfs dono le" on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdfs dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdfs dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
