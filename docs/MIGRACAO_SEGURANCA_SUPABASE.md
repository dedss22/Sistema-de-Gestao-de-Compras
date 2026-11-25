# Guia de Evolução Segura do Supabase (Schema, Storage e Segurança RLS/Auth)

Este guia explica, em passos simples e seguros, como atualizar o seu projeto no **Supabase (Plano Free)** sem interromper o funcionamento do sistema em produção.

Você pode aplicar cada etapa no seu ritmo, na ordem abaixo:

1. **Etapa 1 — Atualizar o Schema do Banco (`supabase/schema.sql`)**: adiciona colunas e índices que faltavam, sem apagar nem travar nada.
2. **Etapa 2 — Ativar o Storage de Comprovantes (Parte 1 da migração `02_storage_and_rls_hardening.sql`)**: evita que fotos de notas fiscais e comprovantes em Base64 ocupem o limite de 500 MB do banco Postgres.
3. **Etapa 3 — Criar as contas da equipe no Supabase Auth e aplicar o Hardening de RLS (Parte 2 da migração `02_storage_and_rls_hardening.sql`)**: impede acesso direto às tabelas via chave pública `anon`, mantendo o link da cozinheira funcionando normalmente.

---

## Etapa 1: Rodar o Update Aditivo do `supabase/schema.sql`

O arquivo `supabase/schema.sql` foi atualizado de forma **100% aditiva e re-executável** (usa `if not exists` e `create or replace`). Isso significa que você pode rodá-lo novamente no seu banco que já está no ar sem perder nenhum dado.

### O que essa atualização adiciona:
- Colunas de auditoria de edição na tabela `pedidos`: `editado_por_nome`, `editado_por_login`, `editado_em` e `historico_edicoes`.
- Colunas de auditoria na tabela `estadias`: `atualizada_por_nome`, `atualizada_por_login` e `reativada_por_login`.
- Coluna opcional `dados_backup` na tabela `historico_atividades`.
- Novos índices para deixar as consultas mais rápidas: `idx_pedidos_numero` e `idx_historico_estadia`.
- Mantém as políticas atuais (`anon, authenticated`) para que nada pare de funcionar antes da Etapa 3.

### Como aplicar:
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. No menu lateral esquerdo, clique em **SQL Editor** e depois em **New query**.
3. Abra o arquivo `supabase/schema.sql` deste repositório, copie **todo** o conteúdo e cole no SQL Editor.
4. Clique em **Run** (ou `Ctrl + Enter`).
5. Confirme se apareceu a mensagem de sucesso (`Success. No rows returned`).

---

## Etapa 2: Ativar o Bucket `comprovantes` (Supabase Storage)

Hoje, quando alguém anexa uma nota fiscal ou comprovante de pagamento, o sistema salva a imagem comprimida diretamente no banco de dados (em texto Base64). Com o tempo, isso consome o espaço gratuito do Postgres (500 MB) rapidamente.

Com o bucket `comprovantes` ativado, o aplicativo passa a enviar as fotos e PDFs automaticamente para o **Supabase Storage** (que oferece 1 GB no plano gratuito) e guarda apenas uma referência leve no banco de dados.

> **Segurança contra falhas (Fallback Automático):** Enquanto você não ativar este bucket, o aplicativo detecta automaticamente e continua salvando em Base64/IndexedDB sem quebrar nada. Comprovantes antigos já salvos em Base64 também continuam abrindo normalmente.

### Como ativar:
1. No painel do Supabase, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/migrations/02_storage_and_rls_hardening.sql`.
3. Copie **todo** o conteúdo do arquivo (a **Parte 2** já vem comentada com `/* ... */`, então só a **Parte 1** será executada agora) e cole no SQL Editor.
4. Clique em **Run**.

### Como conferir se funcionou:
1. No menu lateral do Supabase, clique em **Storage**.
2. Você verá o bucket privado chamado **`comprovantes`** na lista (com cadeado, indicando que não é público na internet — os arquivos são acessados por URLs temporárias assinadas).
3. Ao anexar um novo comprovante no sistema e abrir a página novamente, o arquivo aparecerá dentro da pasta `pedidos/...` ou `estadias/...` no bucket `comprovantes`.

---

## Etapa 3: Criar Alexandre, André e Lorena no Supabase Auth e Aplicar o Hardening de RLS

Atualmente, para facilitar o início do projeto, as tabelas `estadias`, `pedidos` e `historico_atividades` aceitam conexões com a chave pública `anon`. Para blindar os dados dos hóspedes e notas fiscais contra acesso externo direto pela API pública do Supabase, siga os dois passos abaixo.

### Passo 3.1 — Criar os 3 usuários no Supabase Auth
1. No painel do Supabase, vá em **Authentication** → **Users** (menu lateral esquerdo).
2. Clique em **Add user** → **Create new user** para cada membro da equipe, usando exatamente os e-mails cadastrados no sistema:
   - **Alexandre Pampolini** — E-mail: `alexandre@paralelo17.com.br`
   - **André Balbino** — E-mail: `andre@paralelo17.com.br`
   - **Lorena Oliveira** — E-mail: `lorena@paralelo17.com.br`
3. Defina a senha de cada um e deixe marcada a opção **Auto Confirm User?** (para que possam entrar imediatamente sem precisar confirmar e-mail).
4. *(Opcional, recomendado)* Se quiser que o nome apareça corretamente nos logs vindos do Supabase Auth, após criar cada usuário você pode preencher o `User Metadata` no painel (ou via SQL) com `nome`, `login` e `cargo`.
5. **Teste antes de travar o banco:** faça login no sistema web usando o e-mail completo (ex.: `alexandre@paralelo17.com.br`) e a senha criada no Supabase Auth (confira também se a aplicação está autenticando via `supabase.auth.signInWithPassword` antes de restringir o banco).

> **Atenção:** No código atual do aplicativo, o login padrão ainda autentica localmente via `USUARIOS_EQUIPE` para manter compatibilidade sem Supabase Auth. Só aplique o Passo 3.2 quando a autenticação da equipe estiver usando exclusivamente o `supabase.auth.signInWithPassword` com sessão ativa no Supabase Auth; caso contrário, as requisições da equipe continuarão indo como `anon` e serão bloqueadas.

### Passo 3.2 — Aplicar o Hardening de RLS (bloquear `anon` nas tabelas administrativas)
Quando os 3 logins já estiverem funcionando via Supabase Auth:

1. Abra **SQL Editor** → **New query** no Supabase.
2. Abra o arquivo `supabase/migrations/02_storage_and_rls_hardening.sql` e localize a **PARTE 2: HARDENING DE RLS E REVOGAÇÃO DE `anon`**.
3. Copie apenas o bloco interno entre `/*` e `*/` (sem os marcadores `/*` e `*/`).
4. Cole no SQL Editor e clique em **Run**.

### O que a Parte 2 faz na prática:
- **Bloqueia (`revoke`)** o acesso direto da role pública `anon` às tabelas `estadias`, `pedidos` e `historico_atividades`.
- **Restringe as políticas RLS** dessas 3 tabelas e do bucket `comprovantes` apenas para usuários logados (`authenticated`).
- **Mantém 100% funcional o link da cozinheira (`/e/:codigo`)**: as funções `obter_estadia` e `criar_pedido` continuam liberadas para `anon`, usando `SECURITY DEFINER`, de forma que a cozinheira continua conseguindo abrir a lista da casa e enviar pedidos sem precisar de senha, e sem conseguir ler nomes de hóspedes ou outros pedidos do banco.

---

## Em caso de emergência (Como Reverter)

Se você aplicar a **Parte 2** antes da hora e o painel admin parar de carregar dados:
1. Não se preocupe — nenhum dado foi apagado.
2. Basta colar e rodar novamente o arquivo `supabase/schema.sql` no SQL Editor (para restaurar as políticas `anon, authenticated` das tabelas) e rodar novamente apenas a **Parte 1** do arquivo `supabase/migrations/02_storage_and_rls_hardening.sql` (para restaurar o acesso ao bucket `comprovantes`).
