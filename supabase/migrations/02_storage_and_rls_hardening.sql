-- ==============================================================================
-- MIGRAÇÃO 02 (OPCIONAL): STORAGE DE COMPROVANTES + HARDENING RLS/AUTH
-- Sistema de Estadias e Pedidos do Cardápio Digital (Plano Free Supabase)
--
-- COMO USAR ESTE ARQUIVO (leia docs/MIGRACAO_SEGURANCA_SUPABASE.md):
--   • PARTE 1 (ativa por padrão): cria o bucket privado `comprovantes` no
--     Supabase Storage e libera leitura/upload controlados para o app atual
--     (evita encher o banco Postgres de 500MB com Base64). É 100% re-executável.
--   • PARTE 2 (comentada): bloqueia acesso `anon` direto às tabelas e ao bucket,
--     exigindo login real via Supabase Auth (mantendo `obter_estadia` e
--     `criar_pedido` liberadas para o link público da cozinheira).
--     ATENÇÃO: Só descomente a PARTE 2 depois de criar Alexandre, André e
--     Lorena em Authentication -> Users no painel do Supabase!
-- ==============================================================================

-- ==============================================================================
-- PARTE 1: BUCKET PRIVADO `comprovantes` NO SUPABASE STORAGE
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes',
  'comprovantes',
  false,
  15728640, -- 15 MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas iniciais compatíveis com o login atual da equipe (anon + authenticated)
-- O bucket continua privado (public = false): arquivos só são lidos via URL assinada.
drop policy if exists "Comprovantes: leitura controlada" on storage.objects;
create policy "Comprovantes: leitura controlada"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'comprovantes');

drop policy if exists "Comprovantes: upload controlado" on storage.objects;
create policy "Comprovantes: upload controlado"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'comprovantes');

drop policy if exists "Comprovantes: atualizacao controlada" on storage.objects;
create policy "Comprovantes: atualizacao controlada"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'comprovantes')
  with check (bucket_id = 'comprovantes');

drop policy if exists "Comprovantes: exclusao controlada" on storage.objects;
create policy "Comprovantes: exclusao controlada"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'comprovantes');


-- ==============================================================================
-- PARTE 2: HARDENING DE RLS E REVOGAÇÃO DE `anon` (APLICAR APÓS SUPABASE AUTH)
-- ==============================================================================
-- IMPORTANTE:
-- 1) Crie os usuários da equipe (Alexandre, André e Lorena) no Supabase Auth
--    usando os mesmos e-mails cadastrados no sistema.
-- 2) Confira que o login via Supabase Auth está funcionando no painel admin.
-- 3) Remova os `-- ` das linhas abaixo e execute no SQL Editor do Supabase.
-- ==============================================================================

/*
-- A) Revoga acesso direto da role pública `anon` às tabelas administrativas
revoke all on table estadias from anon;
revoke all on table pedidos from anon;
revoke all on table historico_atividades from anon;

-- Garante permissões apenas para usuários autenticados (equipe logada)
grant select, insert, update, delete on table estadias to authenticated;
grant select, insert, update, delete on table pedidos to authenticated;
grant select, insert, update, delete on table historico_atividades to authenticated;

-- B) Substitui políticas permissivas por políticas exclusivas de `authenticated`
drop policy if exists "Equipe gerencia estadias" on estadias;
create policy "Equipe autenticada gerencia estadias"
  on estadias
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Equipe gerencia pedidos" on pedidos;
create policy "Equipe autenticada gerencia pedidos"
  on pedidos
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Equipe visualiza e grava histórico" on historico_atividades;
create policy "Equipe autenticada gerencia historico"
  on historico_atividades
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- C) Restringe o bucket `comprovantes` apenas para usuários autenticados
drop policy if exists "Comprovantes: leitura controlada" on storage.objects;
create policy "Comprovantes: leitura autenticada"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'comprovantes' and auth.role() = 'authenticated');

drop policy if exists "Comprovantes: upload controlado" on storage.objects;
create policy "Comprovantes: upload autenticado"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'comprovantes' and auth.role() = 'authenticated');

drop policy if exists "Comprovantes: atualizacao controlada" on storage.objects;
create policy "Comprovantes: atualizacao autenticada"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'comprovantes' and auth.role() = 'authenticated')
  with check (bucket_id = 'comprovantes' and auth.role() = 'authenticated');

drop policy if exists "Comprovantes: exclusao controlada" on storage.objects;
create policy "Comprovantes: exclusao autenticada"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'comprovantes' and auth.role() = 'authenticated');

-- D) Mantém o fluxo público da cozinheira (/e/:codigo) 100% funcional via RPC
--    As funções SECURITY DEFINER validam o código da estadia sem expor dados
--    sensíveis (titular/funcionário) nem liberar leitura direta nas tabelas.
revoke execute on function obter_estadia(text) from public;
grant execute on function obter_estadia(text) to anon, authenticated;

revoke execute on function criar_pedido(text, text, jsonb) from public;
grant execute on function criar_pedido(text, text, jsonb) to anon, authenticated;
*/
