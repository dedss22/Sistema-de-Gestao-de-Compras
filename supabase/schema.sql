-- ==============================================================================
-- SCHEMA SUPABASE: SISTEMA DE ESTADIAS E PEDIDOS DO CARDÁPIO DIGITAL
-- Compatível 100% com Plano Free (Postgres, Supabase Auth, RLS, RPCs)
-- Arquivo re-executável: pode ser colado e executado no SQL Editor do Supabase
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
create extension if not exists "pgcrypto";

-- 2. FUNÇÃO AUXILIAR: GERAÇÃO DE CÓDIGO ALEATÓRIO (10 CARACTERES)
-- Gera códigos únicos, não sequenciais, sem caracteres ambíguos (ex: 0/O, 1/l/I)
create or replace function gerar_codigo_estadia()
returns text
language plpgsql
as $$
declare
  chars text := '23456789abcdefghjkmnpqrstuvwxyz';
  resultado text := '';
  i int;
begin
  for i in 1..10 loop
    resultado := resultado || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return resultado;
end;
$$;

-- 3. TABELA: ESTADIAS
create table if not exists estadias (
  id uuid default gen_random_uuid() primary key,
  codigo text not null unique,
  casa varchar(150) not null,
  entrada date not null,
  saida date not null,
  hospedes int not null check (hospedes >= 1),
  titular varchar(150) not null,
  funcionario varchar(150) not null,
  status text not null default 'ativa' check (status in ('ativa', 'finalizada', 'arquivada')),
  criada_por_nome varchar(150),
  criada_por_login varchar(80),
  finalizada_por_nome varchar(150),
  finalizada_por_login varchar(80),
  finalizada_em timestamptz,
  arquivada_por_nome varchar(150),
  arquivada_por_login varchar(80),
  arquivada_em timestamptz,
  reativada_por_nome varchar(150),
  reativada_em timestamptz,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  constraint check_datas check (saida >= entrada)
);

-- Garantir colunas de auditoria caso a tabela já exista
alter table estadias add column if not exists criada_por_nome varchar(150);
alter table estadias add column if not exists criada_por_login varchar(80);
alter table estadias add column if not exists finalizada_por_nome varchar(150);
alter table estadias add column if not exists finalizada_por_login varchar(80);
alter table estadias add column if not exists finalizada_em timestamptz;
alter table estadias add column if not exists arquivada_por_nome varchar(150);
alter table estadias add column if not exists arquivada_por_login varchar(80);
alter table estadias add column if not exists arquivada_em timestamptz;
alter table estadias add column if not exists reativada_por_nome varchar(150);
alter table estadias add column if not exists reativada_em timestamptz;
alter table estadias add column if not exists adiantamentos jsonb not null default '[]'::jsonb;

-- Índices para busca rápida e listagens
create index if not exists idx_estadias_codigo on estadias (codigo);
create index if not exists idx_estadias_status on estadias (status);
create index if not exists idx_estadias_criada_em on estadias (criada_em desc);

-- 4. TABELA: PEDIDOS
create table if not exists pedidos (
  id uuid default gen_random_uuid() primary key,
  estadia_id uuid not null references estadias(id) on delete cascade,
  numero int not null,
  cozinheira varchar(120) not null,
  finalizado_em timestamptz not null default now(),
  status text not null default 'em_aprovacao' check (status in ('em_aprovacao', 'enviar_fornecedores', 'preparacao_entrega', 'finalizado', 'rejeitado')),
  aprovado_por_nome varchar(150),
  aprovado_por_login varchar(80),
  aprovado_em timestamptz,
  rejeitado_por_nome varchar(150),
  rejeitado_por_login varchar(80),
  rejeitado_em timestamptz,
  reaberto_por_nome varchar(150),
  reaberto_por_login varchar(80),
  reaberto_em timestamptz,
  enviado_fornecedor_por_nome varchar(150),
  enviado_fornecedor_por_login varchar(80),
  enviado_fornecedor_em timestamptz,
  concluido_por_nome varchar(150),
  concluido_por_login varchar(80),
  concluido_em timestamptz,
  anexos jsonb not null default '[]'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  constraint uk_estadia_numero unique (estadia_id, numero),
  constraint check_itens_formato check (jsonb_typeof(itens) = 'array'),
  constraint check_itens_limite check (jsonb_array_length(itens) <= 300)
);

-- Garantir colunas de status e auditoria caso a tabela pedidos já exista
alter table pedidos add column if not exists status text not null default 'em_aprovacao';
alter table pedidos add column if not exists aprovado_por_nome varchar(150);
alter table pedidos add column if not exists aprovado_por_login varchar(80);
alter table pedidos add column if not exists aprovado_em timestamptz;
alter table pedidos add column if not exists rejeitado_por_nome varchar(150);
alter table pedidos add column if not exists rejeitado_por_login varchar(80);
alter table pedidos add column if not exists rejeitado_em timestamptz;
alter table pedidos add column if not exists reaberto_por_nome varchar(150);
alter table pedidos add column if not exists reaberto_por_login varchar(80);
alter table pedidos add column if not exists reaberto_em timestamptz;
alter table pedidos add column if not exists enviado_fornecedor_por_nome varchar(150);
alter table pedidos add column if not exists enviado_fornecedor_por_login varchar(80);
alter table pedidos add column if not exists enviado_fornecedor_em timestamptz;
alter table pedidos add column if not exists concluido_por_nome varchar(150);
alter table pedidos add column if not exists concluido_por_login varchar(80);
alter table pedidos add column if not exists concluido_em timestamptz;
alter table pedidos add column if not exists anexos jsonb not null default '[]'::jsonb;

-- Índices para pedidos
create index if not exists idx_pedidos_estadia on pedidos (estadia_id);
create index if not exists idx_pedidos_status on pedidos (status);
create index if not exists idx_pedidos_finalizado_em on pedidos (finalizado_em desc);

-- 5. TRIGGER: GERAÇÃO AUTOMÁTICA DE CÓDIGO ÚNICO ANTES DO INSERT EM ESTADIAS
create or replace function trg_estadias_gerar_codigo()
returns trigger
language plpgsql
as $$
declare
  novo_codigo text;
  tentativas int := 0;
begin
  if new.codigo is null or trim(new.codigo) = '' then
    loop
      novo_codigo := gerar_codigo_estadia();
      exit when not exists (select 1 from estadias where codigo = novo_codigo);
      tentativas := tentativas + 1;
      if tentativas > 50 then
        raise exception 'Não foi possível gerar código único para a estadia após 50 tentativas.';
      end if;
    end loop;
    new.codigo := novo_codigo;
  else
    new.codigo := lower(trim(new.codigo));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_before_insert_estadias on estadias;
create trigger trg_before_insert_estadias
  before insert on estadias
  for each row
  execute function trg_estadias_gerar_codigo();

-- 6. TRIGGER: ATUALIZAÇÃO AUTOMÁTICA DE atualizada_em
create or replace function trg_atualizar_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.atualizada_em := now();
  return new;
end;
$$;

drop trigger if exists trg_before_update_estadias on estadias;
create trigger trg_before_update_estadias
  before update on estadias
  for each row
  execute function trg_atualizar_timestamp();

-- ==============================================================================
-- 7. SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- Habilita RLS em todas as tabelas
alter table estadias enable row level security;
alter table pedidos enable row level security;

-- Revoga acessos públicos e anônimos diretos às tabelas
revoke all on table estadias from public, anon;
revoke all on table pedidos from public, anon;

-- Concede permissões para usuários autenticados (Equipe via Supabase Auth)
grant select, insert, update, delete on table estadias to authenticated;
grant select, insert, update on table pedidos to authenticated;

-- Políticas para usuários autenticados (Equipe)
drop policy if exists "Equipe gerencia estadias" on estadias;
create policy "Equipe gerencia estadias"
  on estadias
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Equipe visualiza pedidos" on pedidos;
drop policy if exists "Equipe gerencia pedidos" on pedidos;
create policy "Equipe gerencia pedidos"
  on pedidos
  for all
  to authenticated
  using (true)
  with check (true);

-- ==============================================================================
-- 8. FUNÇÕES RPC PARA A COZINHEIRA (SECURITY DEFINER)
-- ==============================================================================

-- a) obter_estadia(p_codigo):
-- Devolve apenas dados públicos essenciais e NUNCA titular nem funcionário.
create or replace function obter_estadia(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estadia record;
begin
  if p_codigo is null or trim(p_codigo) = '' then
    return null;
  end if;

  select id, status, casa, entrada, saida, hospedes
  into v_estadia
  from estadias
  where codigo = lower(trim(p_codigo));

  -- Se o código não existir, devolve vazio/null
  if not found then
    return null;
  end if;

  -- Se a estadia existir mas não for 'ativa', devolve apenas o status
  if v_estadia.status <> 'ativa' then
    return jsonb_build_object(
      'status', v_estadia.status
    );
  end if;

  -- Se ativa, devolve casa, datas, hóspedes e contagem real de pedidos já feitos
  return jsonb_build_object(
    'id', v_estadia.id,
    'status', v_estadia.status,
    'casa', v_estadia.casa,
    'entrada', v_estadia.entrada,
    'saida', v_estadia.saida,
    'hospedes', v_estadia.hospedes,
    'total_pedidos', (select count(*) from pedidos where estadia_id = v_estadia.id)
  );
end;
$$;

-- b) criar_pedido(p_codigo, p_cozinheira, p_itens):
-- Valida estadia ativa, itens, calcula número sequencial bloqueando a linha e grava o pedido.
create or replace function criar_pedido(
  p_codigo text,
  p_cozinheira text,
  p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estadia_id uuid;
  v_status text;
  v_proximo_numero int;
  v_finalizado_em timestamptz;
  v_qtd_itens int;
  v_cozinheira_limpa text;
begin
  -- 1. Validação do nome da cozinheira
  v_cozinheira_limpa := trim(coalesce(p_cozinheira, ''));
  if length(v_cozinheira_limpa) < 2 then
    raise exception 'Nome da cozinheira deve ter no mínimo 2 caracteres.';
  end if;
  if length(v_cozinheira_limpa) > 120 then
    raise exception 'Nome da cozinheira excede o limite máximo de 120 caracteres.';
  end if;

  -- 2. Validação da lista de itens
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Os itens devem ser enviados no formato de lista JSON válida.';
  end if;

  v_qtd_itens := jsonb_array_length(p_itens);
  if v_qtd_itens = 0 then
    raise exception 'O pedido não pode ser finalizado sem itens.';
  end if;
  if v_qtd_itens > 300 then
    raise exception 'O pedido excede o limite máximo permitido de 300 itens.';
  end if;

  -- 3. Localização da estadia e bloqueio de linha (FOR UPDATE) contra concorrência
  select id, status
  into v_estadia_id, v_status
  from estadias
  where codigo = lower(trim(p_codigo))
  for update;

  if not found then
    raise exception 'Estadia não encontrada para o código informado.';
  end if;

  if v_status <> 'ativa' then
    raise exception 'Esta estadia não está ativa para novos pedidos (status atual: %).', v_status;
  end if;

  -- 4. Cálculo sequencial seguro do número do pedido para esta estadia
  select coalesce(max(numero), 0) + 1
  into v_proximo_numero
  from pedidos
  where estadia_id = v_estadia_id;

  v_finalizado_em := now();

  -- 5. Gravação do pedido (inicia com status 'em_aprovacao')
  insert into pedidos (
    estadia_id,
    numero,
    cozinheira,
    finalizado_em,
    status,
    anexos,
    itens
  ) values (
    v_estadia_id,
    v_proximo_numero,
    v_cozinheira_limpa,
    v_finalizado_em,
    'em_aprovacao',
    '[]'::jsonb,
    p_itens
  );

  return jsonb_build_object(
    'numero', v_proximo_numero,
    'finalizado_em', v_finalizado_em
  );
end;
$$;

-- Permissões de execução das funções RPC
revoke execute on function obter_estadia(text) from public;
grant execute on function obter_estadia(text) to anon, authenticated;

revoke execute on function criar_pedido(text, text, jsonb) from public;
grant execute on function criar_pedido(text, text, jsonb) to anon, authenticated;

-- ==============================================================================
-- 9. TABELA: HISTÓRICO DE ATIVIDADES & AUDITORIA
-- Registra quem criou, arquivou, finalizou, excluiu ou reativou estadias
-- ==============================================================================
create table if not exists historico_atividades (
  id text primary key,
  tipo_acao text not null,
  titulo text not null,
  descricao text not null,
  estadia_id text,
  estadia_casa text,
  usuario_nome text not null,
  usuario_login text not null,
  criado_em timestamptz not null default now()
);

-- Índices para busca rápida e cronológica
create index if not exists idx_historico_criado_em on historico_atividades (criado_em desc);
create index if not exists idx_historico_tipo on historico_atividades (tipo_acao);
create index if not exists idx_historico_usuario on historico_atividades (usuario_login);

-- RLS para tabela de histórico
alter table historico_atividades enable row level security;
revoke all on table historico_atividades from public, anon;
grant select, insert on table historico_atividades to authenticated;

drop policy if exists "Equipe visualiza e grava histórico" on historico_atividades;
create policy "Equipe visualiza e grava histórico"
  on historico_atividades
  for all
  to authenticated
  using (true)
  with check (true);

