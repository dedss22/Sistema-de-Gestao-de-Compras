# 🛍️ Sistema de Gestão de Compras & Cardápio Digital da Estadia

Sistema completo e progressivo (PWA Mobile-First) para **equipe de gerência e cozinheiras de casas de temporada de alto padrão** (Trancoso, Caraíva, Arraial d'Ajuda, Barra Grande, etc.).

O sistema opera **100% no plano Free do Supabase** (sem cartão cadastrado, sem custos, sem chave `service_role` no código e sem passos burocráticos como 2FA).

---

## ⚡ 1. Configuração Inicial no Supabase

### Passo A: Aplicar o Banco de Dados no SQL Editor (Passo Único)
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2. Abra o menu **SQL Editor** (`>_`) e clique em **+ New query**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql), copie todo o conteúdo e cole no editor.
4. Clique em **Run** (ou `Ctrl+Enter`).
   - O script cria as tabelas `estadias`, `pedidos` (com status, auditoria e anexos) e `historico_atividades`, ativa RLS e define as funções RPC da cozinheira (`obter_estadia` e `criar_pedido` com lock `FOR UPDATE`).

---

### Passo B: Usuários da Equipe e Controle de Acesso
O sistema conta com 3 logins nominais configurados com auditoria em tempo real de qualquer ação executada:

| Nome do Membro | Login | Senha | Perfil / Cargo |
| :--- | :--- | :--- | :--- |
| **Alexandre Pampolini** | `alexandre` | `paralelo17` | Gerente Operacional |
| **André Balbino** | `andre` | `Qwe*775533` | Concierge |
| **Lorena Oliveira** | `lorena` | `paralelo1267` | Supervisora de Estadias |

Na tela de login do `/admin`, basta clicar no perfil desejado para preencher os dados instantaneamente com 1 clique, ou digitar o login/e-mail e a senha manualmente.

---

### Passo C: Configurar o `.env`
1. No Supabase, vá em **Project Settings** -> **API**.
2. Copie a **Project URL** e a chave pública **`anon` `public`** (⚠️ **NUNCA** use a `service_role`).
3. No arquivo `.env` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

---

## 🚀 2. Como Rodar a Aplicação

```bash
# Instalar dependências
npm install

# Rodar o servidor de desenvolvimento
npm run dev
```

Acesse no navegador ou celular:
- **Painel da Equipe**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **Cardápio Digital**: [http://localhost:5173/](http://localhost:5173/)

---

## 🧪 3. Guia de Teste do Fluxo Completo

### Etapa 1: Equipe cadastra a estadia no `/admin`
1. Abra [http://localhost:5173/admin](http://localhost:5173/admin).
2. Faça login com o seu usuário (ex: clique no cartão de **Alexandre Pampolini**, **André Balbino** ou **Lorena Oliveira**).
3. Clique em **+ Nova Estadia**:
   - **Casa**: *Villa Trancoso*
   - **Entrada / Saída**: escolha as datas
   - **Hóspedes**: *8*
   - **Titular**: *Dr. Roberto Andrade*
   - **Responsável (Equipe)**: selecione no menu dropdown (**André Balbino**, **Alexandre Pampolini** ou **Lorena Oliveira**)
4. Salve. A estadia aparecerá na aba **Ativas** com indicação de autoria: *"Cadastrada por [Nome]"*.
5. Clique em **Copiar Link** (copia `/e/codigo`) ou **WhatsApp** (gera a mensagem cordial para a cozinheira).

---

### Etapa 2: Cozinheira acessa o link e se identifica
1. Em outra aba (ou no celular), abra o link copiado (ex: `http://localhost:5173/e/codigo`).
2. A tela inicial de boas-vindas exibe o resumo da estadia travado (Casa, Período, Hóspedes).
3. A cozinheira digita seu nome (ex: *Maria da Glória*) e clica no botão grande **Começar**.
4. O cardápio digital é aberto com os kits e porções calculados para 8 hóspedes. O nome dela fica guardado no aparelho.

---

### Etapa 3: Cozinheira monta e envia o Pedido
1. Adicione itens ou aplique um kit (ex: *Café da Manhã* ou peixes e mercado).
2. Clique na barra inferior **Revisar lista**.
3. No modal de revisão, clique no botão verde **Finalizar pedido**.
4. É exibida a confirmação obrigatória: *"Depois de enviar não será possível alterar este pedido."*
5. Clique em **Sim, enviar pedido**. O pedido entra imediatamente no status **⏳ Em Aprovação**.

---

### Etapa 4: Funil de Status dos Pedidos (Aprovação, Fornecedores e Anexos)
1. No painel `/admin`, vá na aba **Todos os Pedidos**.
2. O pedido recém-criado aparece como **⏳ Em Aprovação** com o nome da cozinheira em destaque.
3. **Aprovar ou Rejeitar:**
   - Clique em **✓ Aprovar Pedido**: avança para **📤 Enviar para o(s) Fornecedor(es)** e registra quem aprovou e que horas.
   - Ou clique em **✕ Rejeitar**: muda para **❌ Rejeitado**. Se foi engano, o botão **↩ Voltar para Aprovação** permite reabrir o pedido imediatamente.
4. **Envio aos Fornecedores:**
   - Com o pedido aprovado, quem for responsável envia a lista aos fornecedores e clica em **Marcar Pedido Enviado**.
   - O status avança para **📦 Preparação & Entrega**, registrando quem enviou e o horário.
5. **Preparação, Entrega & Relatório Final (Fotos e PDFs):**
   - Na fase de **Preparação & Entrega**, clique no pedido para abrir os detalhes.
   - Na seção **Relatório Final & Comprovantes**, anexe fotos das compras entregues, fotos de notas fiscais ou relatórios em PDF. As imagens contam com zoom ao clicar e os PDFs abrem em nova aba.
   - Clique em **🏁 Finalizar Pedido**: conclui o ciclo do pedido, gravando o responsável pela finalização e a data/hora oficial no fuso `America/Bahia`.

---

### Etapa 5: Histórico de Ações & Auditoria em Tempo Real
1. No painel `/admin`, clique na aba **🕒 Histórico de Ações**.
2. Cada evento (aprovações, rejeições, envios, finalizações, arquivamentos e anexos) é registrado no feed cronológico com nome da pessoa, data e horário oficial.
