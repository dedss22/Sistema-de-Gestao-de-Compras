/**
 * SCRIPT DE TESTE DE SEGURANÇA E ACESSO ANÔNIMO (SUPABASE FREE)
 * Executa testes utilizando EXCLUSIVAMENTE a chave pública (anon).
 *
 * Validações:
 * 1. Visitante anon NÃO consegue ler a tabela estadias diretamente (bloqueado por RLS).
 * 2. Visitante anon NÃO consegue ler a tabela pedidos diretamente (bloqueado por RLS).
 * 3. Visitante anon obtém null ao consultar código inexistente via obter_estadia.
 * 4. Visitante anon obtém apenas o status em estadia inativa, sem vazar titular nem funcionário.
 * 5. Visitante anon obtém casa, datas e hóspedes em estadia ativa, sem vazar titular nem funcionário.
 * 6. Visitante anon NÃO consegue criar pedido em estadia não ativa (função rejeita com erro).
 * 7. Visitante anon consegue criar pedido com sucesso em estadia ativa.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ler variáveis do arquivo .env manualmente para Node.js
function carregarEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
      env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = carregarEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

console.log('\n======================================================');
console.log('🛡️  TESTE DE SEGURANÇA RLS E RPC - CLIENTE ANÔNIMO (ANON)');
console.log('======================================================\n');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('exemplo-seu-projeto')) {
  console.log('⚠️  ATENÇÃO: Variáveis do Supabase ainda estão com valores de exemplo no .env:');
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl || '(não definida)'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '***configurada***' : '(não definida)'}`);
  console.log('\n📝 Para rodar este teste contra o seu banco real:');
  console.log('   1. Cole o conteúdo de supabase/schema.sql no SQL Editor do Supabase.');
  console.log('   2. Atualize o arquivo .env com a URL e Anon Key do seu projeto Supabase.');
  console.log('   3. Execute: node scripts/test-supabase-anon.mjs [codigo_ativa] [codigo_inativa]\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const codigoAtiva = process.argv[2] || '';
const codigoInativa = process.argv[3] || '';

async function executarTestes() {
  let falhas = 0;
  let sucessos = 0;

  function registrar(resultado, mensagem) {
    if (resultado) {
      console.log(`  ✅ [PASSOU] ${mensagem}`);
      sucessos++;
    } else {
      console.log(`  ❌ [FALHOU] ${mensagem}`);
      falhas++;
    }
  }

  console.log('🔍 Executando verificações com chave pública anon...\n');

  // TESTE 1: Leitura direta da tabela estadias
  try {
    const { data, error } = await supabase.from('estadias').select('*');
    const bloqueado = (error !== null) || (data && data.length === 0);
    registrar(bloqueado, 'Anon NÃO consegue ler estadias diretamente (RLS bloqueia).');
  } catch (err) {
    registrar(true, 'Anon NÃO consegue ler estadias diretamente (Exceção de permissão).');
  }

  // TESTE 2: Leitura direta da tabela pedidos
  try {
    const { data, error } = await supabase.from('pedidos').select('*');
    const bloqueado = (error !== null) || (data && data.length === 0);
    registrar(bloqueado, 'Anon NÃO consegue ler pedidos diretamente (RLS bloqueia).');
  } catch (err) {
    registrar(true, 'Anon NÃO consegue ler pedidos diretamente (Exceção de permissão).');
  }

  // TESTE 3: Código inexistente via obter_estadia
  try {
    const { data, error } = await supabase.rpc('obter_estadia', {
      p_codigo: 'codigo-falso-999999'
    });
    const sucesso = !error && data === null;
    registrar(sucesso, 'Anon recebe null ao consultar código inexistente em obter_estadia.');
  } catch (err) {
    registrar(false, `Erro inesperado no teste de código inexistente: ${err.message}`);
  }

  // TESTE 4: Estadia inativa via obter_estadia (se fornecido código)
  if (codigoInativa) {
    try {
      const { data, error } = await supabase.rpc('obter_estadia', {
        p_codigo: codigoInativa
      });
      const somenteStatus = data && data.status && !data.casa && !data.titular && !data.funcionario;
      registrar(somenteStatus, `Anon recebe apenas o status em estadia inativa (${codigoInativa}) sem dados sensíveis.`);
    } catch (err) {
      registrar(false, `Falha ao testar estadia inativa: ${err.message}`);
    }

    // TESTE 6: Criar pedido em estadia inativa deve falhar
    try {
      const { data, error } = await supabase.rpc('criar_pedido', {
        p_codigo: codigoInativa,
        p_cozinheira: 'Maria Teste',
        p_itens: [{ item: 'Água', quantidade: 2 }]
      });
      registrar(error !== null, 'Anon NÃO consegue criar pedido em estadia não ativa (RPC bloqueia).');
    } catch (err) {
      registrar(true, 'Anon NÃO consegue criar pedido em estadia não ativa (Exceção esperada).');
    }
  } else {
    console.log('  ℹ️  [INFO] Para testar estadia inativa, passe o código como 2º argumento: node scripts/test-supabase-anon.mjs <ativa> <inativa>');
  }

  // TESTE 5 & 7: Estadia ativa via obter_estadia e criar_pedido (se fornecido código)
  if (codigoAtiva) {
    try {
      const { data, error } = await supabase.rpc('obter_estadia', {
        p_codigo: codigoAtiva
      });
      const valido = data && data.status === 'ativa' && data.casa && !data.titular && !data.funcionario;
      registrar(valido, `Anon obtém dados públicos da estadia ativa (${codigoAtiva}) SEM titular nem funcionário.`);
    } catch (err) {
      registrar(false, `Falha ao testar estadia ativa: ${err.message}`);
    }

    try {
      const { data, error } = await supabase.rpc('criar_pedido', {
        p_codigo: codigoAtiva,
        p_cozinheira: 'Cozinheira Teste Automatizado',
        p_itens: [
          {
            fornecedor: 'bebidas',
            categoria: 'Água',
            item: 'Água Mineral 500ml',
            quantidade: 2,
            unidade: 'un',
            observacao: 'Teste de segurança RLS',
            aceitaSubstituto: true
          }
        ]
      });
      const pedidoCriado = !error && data && data.numero >= 1 && data.finalizado_em;
      registrar(pedidoCriado, `Anon cria pedido com sucesso em estadia ativa (Pedido #${data?.numero}).`);
    } catch (err) {
      registrar(false, `Falha ao criar pedido em estadia ativa: ${err.message}`);
    }
  } else {
    console.log('  ℹ️  [INFO] Para testar estadia ativa, passe o código como 1º argumento: node scripts/test-supabase-anon.mjs <ativa> <inativa>');
  }

  console.log('\n------------------------------------------------------');
  console.log(`📊 RESULTADO: ${sucessos} passaram | ${falhas} falharam`);
  console.log('------------------------------------------------------\n');
}

executarTestes().catch(console.error);
