import { createClient } from '@supabase/supabase-js';
import {
  salvarMidiaIndexedDB,
  obterMidiaIndexedDB,
  removerMidiaIndexedDB,
  salvarPedidosIndexedDB,
  obterPedidosIndexedDB,
  hidratarAnexosComMidia,
  hidratarPedidoComMidia
} from './anexoStorage';

// Variáveis de ambiente configuradas no .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('exemplo-seu-projeto') &&
    !supabaseAnonKey.includes('exemplo-anon-key')
  );
};

// Cliente Supabase utilizando EXCLUSIVAMENTE a chave pública anon
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ==============================================================================
// MOTOR LOCAL (MOCK FALLBACK PARA RODAR TUDO NO LOCALHOST SEM SUPABASE CLOUD)
// ==============================================================================

const LOCAL_SESSION_KEY = 'lista_compras_supabase_session';
const LOCAL_ESTADIAS_KEY = 'lista_compras_supabase_estadias';
const LOCAL_PEDIDOS_KEY = 'lista_compras_supabase_pedidos';
const LOCAL_LOGS_KEY = 'lista_compras_supabase_logs';
const LOCAL_LIXEIRA_KEY = 'lista_compras_supabase_lixeira';

/**
 * Usuários oficiais da equipe com credenciais configuradas
 */
export const USUARIOS_EQUIPE = [
  {
    nome: 'Alexandre Pampolini',
    login: 'alexandre',
    email: 'alexandre@paralelo17.com.br',
    senha: 'paralelo17',
    cargo: 'Gerente Operacional'
  },
  {
    nome: 'André Balbino',
    login: 'andre',
    email: 'andre@paralelo17.com.br',
    senha: 'Qwe*775533',
    cargo: 'Concierge'
  },
  {
    nome: 'Lorena Oliveira',
    login: 'lorena',
    email: 'lorena@paralelo17.com.br',
    senha: 'paralelo1267',
    cargo: 'Supervisora de Estadias'
  }
];

// Listeners de autenticação local
const localAuthListeners = new Set();

function notificarMudancaAuthLocal(evento, sessao) {
  localAuthListeners.forEach((cb) => {
    try {
      cb(evento, sessao);
    } catch (e) {
      console.error('Erro em listener de auth local:', e);
    }
  });
}

function gerarCodigoLocal() {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let res = '';
  for (let i = 0; i < 10; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function obterEstadiasLocais() {
  try {
    const raw = localStorage.getItem(LOCAL_ESTADIAS_KEY);
    if (raw) return JSON.parse(raw);

    // Se estiver vazio, inicia com uma estadia modelo
    const seed = [
      {
        id: 'estadia-trancoso-01',
        codigo: 'trancoso01',
        casa: 'Villa Trancoso',
        entrada: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        saida: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        hospedes: 8,
        titular: 'Dr. Roberto Andrade',
        funcionario: 'André Balbino',
        criada_por_nome: 'Alexandre Pampolini',
        status: 'ativa',
        criada_em: new Date().toISOString(),
        atualizada_em: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_ESTADIAS_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return [];
  }
}

function salvarEstadiasLocais(estadias) {
  try {
    const estadiasLeves = (estadias || []).map((e) => ({
      ...e,
      adiantamentos: (e.adiantamentos || []).map((a) => {
        if (a && a.comprovante_url && (a.comprovante_url.startsWith('data:') || a.comprovante_url.startsWith('blob:'))) {
          salvarMidiaIndexedDB(a.id, a.comprovante_url).catch(() => {});
          return { ...a, comprovante_url: `indexeddb:${a.id}` };
        }
        return a;
      })
    }));
    localStorage.setItem(LOCAL_ESTADIAS_KEY, JSON.stringify(estadiasLeves));
  } catch (err) {
    console.warn('Falha de cota no localStorage ao salvar estadias:', err);
  }
}

// Cache em memória para acesso imediato e sem limites de armazenamento
let cachePedidosMemoria = null;

// Limpa e otimiza o localStorage caso esteja com dados pesados de testes anteriores
export async function purificarArmazenamentoLocal() {
  if (typeof window === 'undefined') return;
  try {
    // 1. Limpeza de logs de auditoria pesados (remove dados_backup antigos com fotos)
    const rawLogs = localStorage.getItem(LOCAL_LOGS_KEY);
    if (rawLogs && (rawLogs.length > 200000 || rawLogs.includes('data:image'))) {
      try {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs)) {
          const logsLimpos = logs.slice(0, 50).map((l) => ({
            ...l,
            dados_backup: null
          }));
          localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logsLimpos));
          console.log('🧹 Logs de auditoria otimizados no localStorage.');
        }
      } catch {
        localStorage.removeItem(LOCAL_LOGS_KEY);
      }
    }

    // 2. Limpeza da lixeira local para liberar espaço imediato
    const rawLixeira = localStorage.getItem(LOCAL_LIXEIRA_KEY);
    if (rawLixeira && rawLixeira.length > 100000) {
      try {
        const lixeira = JSON.parse(rawLixeira);
        if (Array.isArray(lixeira)) {
          const lixeiraLimpa = lixeira.slice(0, 10).map((item) => ({
            ...item,
            pedidos: (item.pedidos || []).map((p) => ({
              ...p,
              anexos: []
            }))
          }));
          localStorage.setItem(LOCAL_LIXEIRA_KEY, JSON.stringify(lixeiraLimpa));
        }
      } catch {
        localStorage.removeItem(LOCAL_LIXEIRA_KEY);
      }
    }

    // 3. Migração de todas as imagens de comprovantes para o IndexedDB
    const rawPedidos = localStorage.getItem(LOCAL_PEDIDOS_KEY);
    if (rawPedidos) {
      const pedidos = JSON.parse(rawPedidos);
      if (Array.isArray(pedidos)) {
        let migrouAlgum = false;

        for (const p of pedidos) {
          if (Array.isArray(p.anexos)) {
            for (const a of p.anexos) {
              if (a && a.id && a.url && (a.url.startsWith('data:image') || a.url.startsWith('data:application'))) {
                migrouAlgum = true;
                // Salva a imagem original íntegra no IndexedDB
                await salvarMidiaIndexedDB(a.id, a.url);
                // Substitui no localStorage pela referência leve
                a.url = `indexeddb:${a.id}`;
              }
            }
          }
        }

        if (migrouAlgum || rawPedidos.length > 150000) {
          localStorage.setItem(LOCAL_PEDIDOS_KEY, JSON.stringify(pedidos));
          await salvarPedidosIndexedDB(pedidos);
          console.log('✅ Comprovantes migrados para IndexedDB! localStorage agora ultraleve.');
        }
      }
    }
  } catch (e) {
    console.warn('Aviso ao purificar armazenamento local:', e);
  }
}

// Executa a purificação imediatamente na inicialização
purificarArmazenamentoLocal().catch(() => {});

function obterPedidosLocais() {
  if (cachePedidosMemoria && Array.isArray(cachePedidosMemoria) && cachePedidosMemoria.length > 0) {
    return cachePedidosMemoria;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PEDIDOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cachePedidosMemoria = parsed;
    return parsed;
  } catch {
    return [];
  }
}

function salvarPedidosLocais(pedidos) {
  if (!Array.isArray(pedidos)) return;

  // 1. Atualiza cache em memória imediatamente para resposta instantânea
  cachePedidosMemoria = pedidos;

  // 2. Salva todas as fotos no IndexedDB para jamais perder os comprovantes
  pedidos.forEach((p) => {
    (p.anexos || []).forEach((a) => {
      if (a && a.id && a.url && (a.url.startsWith('data:') || a.url.startsWith('blob:'))) {
        salvarMidiaIndexedDB(a.id, a.url).catch(() => {});
      }
      (a.pagamentos || []).forEach((pg) => {
        if (pg && pg.id && pg.comprovante_url && (pg.comprovante_url.startsWith('data:') || pg.comprovante_url.startsWith('blob:'))) {
          salvarMidiaIndexedDB(pg.id, pg.comprovante_url).catch(() => {});
        }
      });
    });
  });

  // 3. Salva snapshot de backup no IndexedDB (onde não há teto de 5MB)
  salvarPedidosIndexedDB(pedidos).catch(() => {});

  // 4. Cria versão ultra-leve para o localStorage (substitui URLs pesadas por indexeddb:id)
  const pedidosLeves = pedidos.map((p) => ({
    ...p,
    anexos: (p.anexos || []).map((a) => ({
      ...a,
      url: a && a.url && (a.url.startsWith('data:') || a.url.startsWith('blob:')) ? `indexeddb:${a.id}` : a.url,
      pagamentos: (a.pagamentos || []).map((pg) => ({
        ...pg,
        comprovante_url: pg && pg.comprovante_url && (pg.comprovante_url.startsWith('data:') || pg.comprovante_url.startsWith('blob:'))
          ? `indexeddb:${pg.id}`
          : pg.comprovante_url
      }))
    }))
  }));

  try {
    localStorage.setItem(LOCAL_PEDIDOS_KEY, JSON.stringify(pedidosLeves));
  } catch (err) {
    console.warn('Aviso de cota do localStorage excedida. Limpando logs e retentando salvar pedidos:', err);
    try {
      localStorage.removeItem(LOCAL_LOGS_KEY);
      localStorage.removeItem(LOCAL_LIXEIRA_KEY);
      localStorage.setItem(LOCAL_PEDIDOS_KEY, JSON.stringify(pedidosLeves));
      console.log('✅ Pedidos salvos com sucesso no localStorage após limpeza de logs.');
    } catch (e2) {
      console.error('Falha secundária ao gravar no localStorage, mas pedidos preservados no IndexedDB:', e2);
    }
  }
}

function obterLogsAuditoriaLocais() {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) return JSON.parse(raw);

    const seed = [
      {
        id: 'log-seed-01',
        tipo_acao: 'SISTEMA',
        titulo: 'Sistema de Auditoria Ativo',
        descricao: 'Rastreamento de ações configurado para Alexandre Pampolini, André Balbino e Lorena Oliveira.',
        estadia_id: null,
        estadia_casa: null,
        usuario_nome: 'Sistema',
        usuario_login: 'sistema',
        criado_em: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return [];
  }
}

function salvarLogsAuditoriaLocais(logs) {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    console.error('Erro ao salvar logs de auditoria:', e);
  }
}

function obterLixeiraLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_LIXEIRA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarNaLixeiraLocal(item) {
  try {
    const lixeira = obterLixeiraLocal();
    lixeira.unshift(item);
    localStorage.setItem(LOCAL_LIXEIRA_KEY, JSON.stringify(lixeira.slice(0, 100)));
  } catch (e) {
    console.error('Erro ao salvar na lixeira:', e);
  }
}

function removerDaLixeiraLocal(id) {
  try {
    const lixeira = obterLixeiraLocal();
    const filtrada = lixeira.filter((item) => item.id !== id && item.estadia?.id !== id);
    localStorage.setItem(LOCAL_LIXEIRA_KEY, JSON.stringify(filtrada));
  } catch (e) {
    console.error('Erro ao remover da lixeira:', e);
  }
}

/**
 * Registra uma ação no Histórico de Auditoria
 */
export async function registrarLogAuditoria({
  tipo_acao,
  titulo,
  descricao,
  estadia_id = null,
  estadia_casa = null,
  usuario_nome = null,
  usuario_login = null,
  dados_backup = null
}) {
  let autorNome = usuario_nome;
  let autorLogin = usuario_login;

  if (!autorNome) {
    const sessao = await getSessaoAtual();
    autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
    autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';
  }

  const logItem = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    tipo_acao,
    titulo,
    descricao,
    estadia_id,
    estadia_casa,
    usuario_nome: autorNome,
    usuario_login: autorLogin,
    criado_em: new Date().toISOString(),
    dados_backup
  };

  const logs = obterLogsAuditoriaLocais();
  logs.unshift(logItem);
  salvarLogsAuditoriaLocais(logs);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('historico_atividades').insert([logItem]);
    } catch (err) {
      console.warn('Supabase log sync warning:', err);
    }
  }

  return logItem;
}

/**
 * Lista o histórico recente de auditoria com filtro opcional
 */
export async function listarLogsAuditoria({ limite = 100, busca = '', tipo = 'todos' } = {}) {
  let logs = obterLogsAuditoriaLocais();

  if (tipo && tipo !== 'todos') {
    logs = logs.filter((l) => l.tipo_acao === tipo);
  }

  if (busca && busca.trim()) {
    const termo = busca.trim().toLowerCase();
    logs = logs.filter((l) =>
      l.descricao?.toLowerCase().includes(termo) ||
      l.usuario_nome?.toLowerCase().includes(termo) ||
      l.estadia_casa?.toLowerCase().includes(termo) ||
      l.titulo?.toLowerCase().includes(termo)
    );
  }

  return logs.slice(0, limite);
}

// ==========================================
// 1. AUTENTICAÇÃO DA EQUIPE (SUPABASE AUTH & USUÁRIOS)
// ==========================================

/**
 * Realiza login por usuário/e-mail e senha
 */
export async function loginEquipe(identificador, password) {
  const idLimpo = (identificador || '').trim().toLowerCase();

  // 1. Verifica se corresponde a um dos 3 membros oficiais da equipe
  const usuarioEquipe = USUARIOS_EQUIPE.find(
    (u) => (u.login.toLowerCase() === idLimpo || u.email.toLowerCase() === idLimpo) && u.senha === password
  );

  if (usuarioEquipe) {
    const session = {
      access_token: 'local-token-' + usuarioEquipe.login + '-' + Date.now(),
      user: {
        id: 'user-' + usuarioEquipe.login,
        email: usuarioEquipe.email,
        login: usuarioEquipe.login,
        nome: usuarioEquipe.nome,
        cargo: usuarioEquipe.cargo,
        app_metadata: { provider: 'equipe_paralelo17' },
        user_metadata: {
          nome: usuarioEquipe.nome,
          login: usuarioEquipe.login,
          cargo: usuarioEquipe.cargo
        },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    };

    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    notificarMudancaAuthLocal('SIGNED_IN', session);

    // Registra evento de login na auditoria
    await registrarLogAuditoria({
      tipo_acao: 'LOGIN',
      titulo: 'Login Realizado',
      descricao: `${usuarioEquipe.nome} (${usuarioEquipe.cargo}) acessou o painel de controle.`,
      usuario_nome: usuarioEquipe.nome,
      usuario_login: usuarioEquipe.login
    });

    return { session, user: session.user };
  }

  // 2. Conta compatibilidade legado comercialparalelo17@gmail.com
  if (idLimpo === 'comercialparalelo17@gmail.com' && password === 'P@ralelo17') {
    const session = {
      access_token: 'local-token-comercial-' + Date.now(),
      user: {
        id: 'user-comercial-paralelo17',
        email: idLimpo,
        login: 'comercial',
        nome: 'Comercial Paralelo 17',
        cargo: 'Administrador',
        app_metadata: { provider: 'email' },
        user_metadata: {
          nome: 'Comercial Paralelo 17',
          login: 'comercial',
          cargo: 'Administrador'
        },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    notificarMudancaAuthLocal('SIGNED_IN', session);
    return { session, user: session.user };
  }

  // 3. Se o Supabase estiver configurado com credenciais reais
  if (isSupabaseConfigured() && idLimpo.includes('@')) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: idLimpo,
      password
    });
    if (error) throw error;
    return data;
  }

  throw new Error('Usuário ou senha incorretos. Verifique suas credenciais.');
}

/**
 * Encerra a sessão atual
 */
export async function logoutEquipe() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
  notificarMudancaAuthLocal('SIGNED_OUT', null);

  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignora erro
    }
  }
}

/**
 * Obtém a sessão ativa no momento (persistência garantida entre recarregamentos de página)
 */
export async function getSessaoAtual() {
  // 1. Sempre verifica a sessão salva no navegador primeiro
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler sessao local:', e);
  }

  // 2. Se não houver sessão local e Supabase estiver configurado, checa Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) return session;
    } catch (e) {
      console.warn('Erro ao checar sessao Supabase Auth:', e);
    }
  }

  return null;
}

/**
 * Obtém o usuário atual
 */
export async function getUsuarioAtual() {
  const sessao = await getSessaoAtual();
  return sessao?.user || null;
}

/**
 * Inscreve listener para mudanças de estado de autenticação
 */
export function onMudancaAuth(callback) {
  localAuthListeners.add(callback);

  let supabaseSub = null;
  if (isSupabaseConfigured()) {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Se já temos sessão de equipe ativa no localStorage, não permite sobrescrever com null inicial
        const localRaw = localStorage.getItem(LOCAL_SESSION_KEY);
        if (localRaw && !session) {
          try {
            const parsed = JSON.parse(localRaw);
            if (parsed && parsed.user) return;
          } catch (e) {}
        }
        callback(event, session);
      });
      supabaseSub = subscription;
    } catch (e) {
      console.warn('Erro ao assinar onAuthStateChange:', e);
    }
  }

  return {
    unsubscribe: () => {
      localAuthListeners.delete(callback);
      if (supabaseSub) supabaseSub.unsubscribe();
    }
  };
}

// ==========================================
// 2. GESTÃO DE ESTADIAS (EQUIPE - AUTHENTICATED)
// ==========================================

/**
 * Lista estadias com contagem de pedidos e filtros opcionais
 */
export async function listarEstadias({ status = 'todas', busca = '' } = {}) {
  // Mapear plural para singular para compatibilidade total com a interface
  let statusNormalizado = status;
  if (status === 'ativas') statusNormalizado = 'ativa';
  else if (status === 'finalizadas') statusNormalizado = 'finalizada';
  else if (status === 'arquivadas') statusNormalizado = 'arquivada';

  if (isSupabaseConfigured()) {
    let query = supabase
      .from('estadias')
      .select('*, pedidos:pedidos(count)')
      .order('criada_em', { ascending: false });

    if (statusNormalizado && statusNormalizado !== 'todas') {
      query = query.eq('status', statusNormalizado);
    }

    if (busca && busca.trim()) {
      const termo = busca.trim();
      query = query.or(`casa.ilike.%${termo}%,titular.ilike.%${termo}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(estadia => ({
      ...estadia,
      adiantamentos: estadia.adiantamentos || [],
      total_pedidos: estadia.pedidos?.[0]?.count ?? 0
    }));
  }

  // Modo Localhost
  const todas = obterEstadiasLocais();
  const pedidos = obterPedidosLocais();

  return todas
    .filter((e) => {
      if (statusNormalizado && statusNormalizado !== 'todas' && e.status !== statusNormalizado) return false;
      if (busca && busca.trim()) {
        const t = busca.trim().toLowerCase();
        const casaMatch = e.casa?.toLowerCase().includes(t);
        const titMatch = e.titular?.toLowerCase().includes(t);
        if (!casaMatch && !titMatch) return false;
      }
      return true;
    })
    .map((e) => ({
      ...e,
      adiantamentos: e.adiantamentos || [],
      total_pedidos: pedidos.filter((p) => p.estadia_id === e.id).length
    }))
    .sort((a, b) => new Date(b.criada_em).getTime() - new Date(a.criada_em).getTime());
}

/**
 * Cria uma nova estadia
 */
export async function criarEstadia({ casa, entrada, saida, hospedes, titular, funcionario }) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || funcionario || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('estadias')
      .insert([
        {
          casa: casa.trim(),
          entrada,
          saida,
          hospedes: Number(hospedes),
          titular: titular.trim(),
          funcionario: funcionario.trim(),
          status: 'ativa',
          criada_por_nome: autorNome,
          criada_por_login: autorLogin
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await registrarLogAuditoria({
      tipo_acao: 'CRIAR_ESTADIA',
      titulo: 'Estadia Criada',
      descricao: `${autorNome} cadastrou a estadia "${casa.trim()}" (${hospedes} hóspedes, titular: ${titular.trim()}).`,
      estadia_id: data?.id,
      estadia_casa: casa.trim(),
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return data;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const nova = {
    id: 'estadia-' + Date.now(),
    codigo: gerarCodigoLocal(),
    casa: casa.trim(),
    entrada,
    saida,
    hospedes: Number(hospedes),
    titular: titular.trim(),
    funcionario: funcionario.trim(),
    status: 'ativa',
    criada_por_nome: autorNome,
    criada_por_login: autorLogin,
    criada_em: new Date().toISOString(),
    atualizada_em: new Date().toISOString()
  };

  estadias.unshift(nova);
  salvarEstadiasLocais(estadias);

  await registrarLogAuditoria({
    tipo_acao: 'CRIAR_ESTADIA',
    titulo: 'Estadia Criada',
    descricao: `${autorNome} cadastrou a estadia "${casa.trim()}" (${hospedes} hóspedes, titular: ${titular.trim()}).`,
    estadia_id: nova.id,
    estadia_casa: casa.trim(),
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return nova;
}

/**
 * Atualiza dados de uma estadia existente
 */
export async function atualizarEstadia(id, dados) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  if (isSupabaseConfigured()) {
    const updateData = {
      ...dados,
      atualizada_por_nome: autorNome,
      atualizada_por_login: autorLogin,
      atualizada_em: new Date().toISOString()
    };
    if (updateData.hospedes) updateData.hospedes = Number(updateData.hospedes);
    if (updateData.casa) updateData.casa = updateData.casa.trim();
    if (updateData.titular) updateData.titular = updateData.titular.trim();
    if (updateData.funcionario) updateData.funcionario = updateData.funcionario.trim();

    const { data, error } = await supabase
      .from('estadias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await registrarLogAuditoria({
      tipo_acao: 'EDITAR_ESTADIA',
      titulo: 'Estadia Atualizada',
      descricao: `${autorNome} alterou os dados da estadia "${data?.casa || 'Estadia'}".`,
      estadia_id: id,
      estadia_casa: data?.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return data;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const idx = estadias.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Estadia não encontrada.');

  const casaNome = dados.casa?.trim() || estadias[idx].casa;

  estadias[idx] = {
    ...estadias[idx],
    ...dados,
    hospedes: dados.hospedes ? Number(dados.hospedes) : estadias[idx].hospedes,
    atualizada_por_nome: autorNome,
    atualizada_por_login: autorLogin,
    atualizada_em: new Date().toISOString()
  };

  salvarEstadiasLocais(estadias);

  await registrarLogAuditoria({
    tipo_acao: 'EDITAR_ESTADIA',
    titulo: 'Estadia Atualizada',
    descricao: `${autorNome} alterou os dados da estadia "${casaNome}".`,
    estadia_id: id,
    estadia_casa: casaNome,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return estadias[idx];
}

/**
 * Altera status da estadia ('ativa', 'finalizada', 'arquivada')
 */
export async function alterarStatusEstadia(id, novoStatus) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const idx = estadias.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Estadia não encontrada.');

  const casaNome = estadias[idx].casa;
  estadias[idx].status = novoStatus;
  estadias[idx].atualizada_em = new Date().toISOString();

  let tituloLog = 'Status Alterado';
  let descLog = `${autorNome} alterou a estadia "${casaNome}" para ${novoStatus}.`;
  let tipoAcao = 'STATUS_ESTADIA';

  if (novoStatus === 'finalizada') {
    tipoAcao = 'FINALIZAR_ESTADIA';
    tituloLog = 'Estadia Finalizada';
    descLog = `${autorNome} finalizou a estadia "${casaNome}". O link da cozinheira foi encerrado para novos pedidos.`;
    estadias[idx].finalizada_por_nome = autorNome;
    estadias[idx].finalizada_por_login = autorLogin;
    estadias[idx].finalizada_em = new Date().toISOString();
  } else if (novoStatus === 'arquivada') {
    tipoAcao = 'ARQUIVAR_ESTADIA';
    tituloLog = 'Estadia Arquivada';
    descLog = `${autorNome} arquivou a estadia "${casaNome}".`;
    estadias[idx].arquivada_por_nome = autorNome;
    estadias[idx].arquivada_por_login = autorLogin;
    estadias[idx].arquivada_em = new Date().toISOString();
  } else if (novoStatus === 'ativa') {
    tipoAcao = 'REATIVAR_ESTADIA';
    tituloLog = 'Estadia Reativada';
    descLog = `${autorNome} reativou a estadia "${casaNome}". O link da cozinheira voltou a aceitar pedidos.`;
    estadias[idx].reativada_por_nome = autorNome;
    estadias[idx].reativada_por_login = autorLogin;
    estadias[idx].reativada_em = new Date().toISOString();
  }

  salvarEstadiasLocais(estadias);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('estadias')
        .update({
          status: novoStatus,
          atualizada_em: new Date().toISOString()
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update status warning:', e);
    }
  }

  await registrarLogAuditoria({
    tipo_acao: tipoAcao,
    titulo: tituloLog,
    descricao: descLog,
    estadia_id: id,
    estadia_casa: casaNome,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return estadias[idx];
}

/**
 * Exclui permanentemente uma estadia (salvando backup na lixeira para poder recuperar)
 */
export async function excluirEstadia(id) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  const todas = obterEstadiasLocais();
  const estadiaParaExcluir = todas.find((e) => e.id === id);
  const casaNome = estadiaParaExcluir?.casa || 'Estadia';
  const pedidosDestaEstadia = obterPedidosLocais().filter((p) => p.estadia_id === id);

  // Salvar backup na lixeira local para recuperação garantida
  salvarNaLixeiraLocal({
    id: id,
    estadia: estadiaParaExcluir,
    pedidos: pedidosDestaEstadia,
    excluido_em: new Date().toISOString(),
    excluido_por_nome: autorNome
  });

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('estadias')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Modo Localhost
  const estadias = todas.filter((e) => e.id !== id);
  salvarEstadiasLocais(estadias);

  // Exclusão dos pedidos no estado ativo
  const pedidos = obterPedidosLocais().filter((p) => p.estadia_id !== id);
  salvarPedidosLocais(pedidos);

  await registrarLogAuditoria({
    tipo_acao: 'EXCLUIR_ESTADIA',
    titulo: 'Estadia Excluída',
    descricao: `${autorNome} excluiu a estadia "${casaNome}" e todos os pedidos vinculados.`,
    estadia_id: id,
    estadia_casa: casaNome,
    usuario_nome: autorNome,
    usuario_login: autorLogin,
    dados_backup: {
      estadia: estadiaParaExcluir,
      pedidos: pedidosDestaEstadia
    }
  });

  return true;
}

/**
 * Recupera uma estadia excluída (e seus pedidos vinculados), trazendo-a de volta para 'ativas'
 */
export async function recuperarEstadia(estadiaId, logRef = null) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  // 1. Tentar buscar da lixeira
  const lixeira = obterLixeiraLocal();
  const itemLixeira = lixeira.find((item) => item.id === estadiaId || item.estadia?.id === estadiaId);

  // 2. Se não achar na lixeira, buscar nos logs locais
  const logs = obterLogsAuditoriaLocais();
  const logExclusao = logRef || logs.find((l) => l.tipo_acao === 'EXCLUIR_ESTADIA' && (l.estadia_id === estadiaId || (l.id && l.id === logRef?.id)));

  let estadiaParaRestaurar = itemLixeira?.estadia || logExclusao?.dados_backup?.estadia;
  let pedidosParaRestaurar = itemLixeira?.pedidos || logExclusao?.dados_backup?.pedidos || [];

  // 3. Fallback inteligente: se não houver backup completo (ex: excluída antes desta versão),
  // reconstrói a partir do log de criação daquela casa
  if (!estadiaParaRestaurar) {
    const casaNomeLog = logExclusao?.estadia_casa || logRef?.estadia_casa || 'Estadia';
    const logCriacao = logs.find(
      (l) => l.tipo_acao === 'CRIAR_ESTADIA' && (l.estadia_id === estadiaId || l.estadia_casa === casaNomeLog)
    );

    let titularEncontrado = 'Titular';
    let hospedesEncontrado = 8;
    let responsavelEncontrado = autorNome;

    if (logCriacao?.descricao) {
      const matchTitular = logCriacao.descricao.match(/titular:\s*([^)]+)/i);
      if (matchTitular) titularEncontrado = matchTitular[1].trim();
      const matchHosp = logCriacao.descricao.match(/(\d+)\s*hóspedes/i);
      if (matchHosp) hospedesEncontrado = parseInt(matchHosp[1], 10);
      const matchResp = logCriacao.descricao.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\s]+)\s+cadastrou/i);
      if (matchResp) responsavelEncontrado = matchResp[1].trim();
    }

    const hoje = new Date();
    const saidaPadrao = new Date(hoje);
    saidaPadrao.setDate(hoje.getDate() + 5);

    estadiaParaRestaurar = {
      id: estadiaId || ('estadia-' + Date.now()),
      codigo: gerarCodigoLocal(),
      casa: casaNomeLog,
      titular: titularEncontrado,
      funcionario: responsavelEncontrado,
      hospedes: hospedesEncontrado,
      entrada: hoje.toISOString().split('T')[0],
      saida: saidaPadrao.toISOString().split('T')[0],
      status: 'ativa',
      criada_por_nome: autorNome,
      criada_em: new Date().toISOString()
    };
  }

  const estadiaFinal = {
    ...estadiaParaRestaurar,
    status: 'ativa',
    reativada_por_nome: autorNome,
    reativada_em: new Date().toISOString(),
    atualizada_em: new Date().toISOString()
  };

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('estadias')
        .upsert([estadiaFinal]);

      if (Array.isArray(pedidosParaRestaurar) && pedidosParaRestaurar.length > 0) {
        await supabase.from('pedidos').upsert(pedidosParaRestaurar);
      }
    } catch (e) {
      console.warn('Erro ao restaurar no Supabase, salvando localmente:', e);
    }
  }

  // Inserir de volta em estadias locais
  const estadias = obterEstadiasLocais();
  const semEssa = estadias.filter((e) => e.id !== estadiaFinal.id);
  semEssa.unshift(estadiaFinal);
  salvarEstadiasLocais(semEssa);

  if (Array.isArray(pedidosParaRestaurar) && pedidosParaRestaurar.length > 0) {
    const pedidosAtuais = obterPedidosLocais();
    const idsRestaurar = new Set(pedidosParaRestaurar.map((p) => p.id));
    const outrosPedidos = pedidosAtuais.filter((p) => !idsRestaurar.has(p.id));
    salvarPedidosLocais([...pedidosParaRestaurar, ...outrosPedidos]);
  }

  // Remover da lixeira
  removerDaLixeiraLocal(estadiaFinal.id);

  // Registrar log de auditoria
  await registrarLogAuditoria({
    tipo_acao: 'RECUPERAR_ESTADIA',
    titulo: 'Estadia Recuperada da Exclusão',
    descricao: `${autorNome} recuperou a estadia "${estadiaFinal.casa}". Ela voltou para a lista de estadias ativas.`,
    estadia_id: estadiaFinal.id,
    estadia_casa: estadiaFinal.casa,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return estadiaFinal;
}

/**
 * Adiciona um saldo / adiantamento financeiro do cliente na estadia
 */
export async function adicionarAdiantamentoEstadia(estadiaId, { valor, data, forma_pagamento, observacao, comprovante_url, comprovante_nome, comprovante_tipo, comprovante_tamanho, quem_pagou, quem_pagou_nome }) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  const valorNum = Number(valor);
  if (isNaN(valorNum) || valorNum === 0) {
    throw new Error('Informe um valor de saldo válido e diferente de zero.');
  }

  const isDebito = valorNum < 0;
  const valorAbs = Math.abs(valorNum);
  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAbs);

  const novoAdiantamento = {
    id: 'adt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    valor: valorNum,
    data: data || new Date().toISOString().slice(0, 10),
    forma_pagamento: (forma_pagamento || 'PIX').trim(),
    observacao: observacao ? observacao.trim() : '',
    comprovante_url: comprovante_url || '',
    comprovante_nome: comprovante_nome || (isDebito ? 'Saldo do Cliente Utilizado' : ''),
    comprovante_tipo: comprovante_tipo || (comprovante_url && comprovante_url.startsWith('data:application/pdf') ? 'pdf' : 'imagem'),
    comprovante_tamanho: comprovante_tamanho || (isDebito ? 'Saldo em Conta' : ''),
    quem_pagou: quem_pagou || 'hospede',
    quem_pagou_nome: quem_pagou_nome ? quem_pagou_nome.trim() : '',
    registrado_por_nome: autorNome,
    registrado_por_login: autorLogin,
    registrado_em: new Date().toISOString()
  };

  if (novoAdiantamento.comprovante_url && (novoAdiantamento.comprovante_url.startsWith('data:') || novoAdiantamento.comprovante_url.startsWith('blob:'))) {
    await salvarMidiaIndexedDB(novoAdiantamento.id, novoAdiantamento.comprovante_url);
  }

  const pagadorTexto = novoAdiantamento.quem_pagou === 'hospede'
    ? `Hóspede${novoAdiantamento.quem_pagou_nome ? ` (${novoAdiantamento.quem_pagou_nome})` : ''}`
    : `Outra pessoa (${novoAdiantamento.quem_pagou_nome || 'Não especificado'})`;

  if (isSupabaseConfigured()) {
    const { data: estAtual, error: fetchErr } = await supabase
      .from('estadias')
      .select('*')
      .eq('id', estadiaId)
      .single();

    if (fetchErr) throw fetchErr;

    const listaAdiantamentos = Array.isArray(estAtual.adiantamentos) ? [...estAtual.adiantamentos] : [];
    listaAdiantamentos.push(novoAdiantamento);

    const { data: estAtualizada, error: updateErr } = await supabase
      .from('estadias')
      .update({
        adiantamentos: listaAdiantamentos,
        atualizada_em: new Date().toISOString()
      })
      .eq('id', estadiaId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await registrarLogAuditoria({
      tipo_acao: isDebito ? 'FINANCEIRO_DEBITO_SALDO' : 'FINANCEIRO_PAGAMENTO_RECEBIDO',
      titulo: isDebito ? 'Saldo do Cliente Utilizado em Compra' : 'Pagamento Recebido',
      descricao: isDebito
        ? `${autorNome} debitou ${valorFormatado} do saldo do cliente para a estadia "${estAtual.casa}". ${observacao ? `Obs: ${observacao}` : ''}`
        : `${autorNome} recebeu pagamento de ${valorFormatado} (${novoAdiantamento.forma_pagamento}) de ${pagadorTexto} para a estadia "${estAtual.casa}".`,
      estadia_id: estadiaId,
      estadia_casa: estAtual.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return estAtualizada;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const idx = estadias.findIndex((e) => e.id === estadiaId);
  if (idx === -1) throw new Error('Estadia não encontrada.');

  const estadia = estadias[idx];
  const lista = Array.isArray(estadia.adiantamentos) ? [...estadia.adiantamentos] : [];
  lista.push(novoAdiantamento);

  estadias[idx] = {
    ...estadia,
    adiantamentos: lista,
    atualizada_em: new Date().toISOString()
  };

  salvarEstadiasLocais(estadias);

  await registrarLogAuditoria({
    tipo_acao: isDebito ? 'FINANCEIRO_DEBITO_SALDO' : 'FINANCEIRO_PAGAMENTO_RECEBIDO',
    titulo: isDebito ? 'Saldo do Cliente Utilizado em Compra' : 'Pagamento Recebido',
    descricao: isDebito
      ? `${autorNome} debitou ${valorFormatado} do saldo do cliente para a estadia "${estadia.casa}". ${observacao ? `Obs: ${observacao}` : ''}`
      : `${autorNome} recebeu pagamento de ${valorFormatado} (${novoAdiantamento.forma_pagamento}) de ${pagadorTexto} para a estadia "${estadia.casa}".`,
    estadia_id: estadiaId,
    estadia_casa: estadia.casa,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return estadias[idx];
}

/**
 * Remove um saldo / adiantamento da estadia
 */
export async function removerAdiantamentoEstadia(estadiaId, adiantamentoId) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  if (isSupabaseConfigured()) {
    const { data: estAtual, error: fetchErr } = await supabase
      .from('estadias')
      .select('*')
      .eq('id', estadiaId)
      .single();

    if (fetchErr) throw fetchErr;

    const itemRemovido = (estAtual.adiantamentos || []).find((a) => a.id === adiantamentoId);
    const listaAdiantamentos = (estAtual.adiantamentos || []).filter((a) => a.id !== adiantamentoId);

    const { data: estAtualizada, error: updateErr } = await supabase
      .from('estadias')
      .update({
        adiantamentos: listaAdiantamentos,
        atualizada_em: new Date().toISOString()
      })
      .eq('id', estadiaId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const valorRemovidoStr = itemRemovido ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemRemovido.valor) : '';

    await registrarLogAuditoria({
      tipo_acao: 'FINANCEIRO_EXCLUIR_ADIANTAMENTO',
      titulo: 'Pagamento / Saldo Removido',
      descricao: `${autorNome} removeu o registro de pagamento de ${valorRemovidoStr} da estadia "${estAtual.casa}".`,
      estadia_id: estadiaId,
      estadia_casa: estAtual.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return estAtualizada;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const idx = estadias.findIndex((e) => e.id === estadiaId);
  if (idx === -1) throw new Error('Estadia não encontrada.');

  const estadia = estadias[idx];
  const itemRemovido = (estadia.adiantamentos || []).find((a) => a.id === adiantamentoId);
  const lista = (estadia.adiantamentos || []).filter((a) => a.id !== adiantamentoId);

  estadias[idx] = {
    ...estadia,
    adiantamentos: lista,
    atualizada_em: new Date().toISOString()
  };

  salvarEstadiasLocais(estadias);

  const valorRemovidoStr = itemRemovido ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemRemovido.valor) : '';

  await registrarLogAuditoria({
    tipo_acao: 'FINANCEIRO_EXCLUIR_ADIANTAMENTO',
    titulo: 'Pagamento / Saldo Removido',
    descricao: `${autorNome} removeu o registro de pagamento de ${valorRemovidoStr} da estadia "${estadia.casa}".`,
    estadia_id: estadiaId,
    estadia_casa: estadia.casa,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return estadias[idx];
}

// ==========================================
// 3. FUNÇÕES DA COZINHEIRA (RPC - ANON / SECURITY DEFINER)
// ==========================================

/**
 * Obtém informações públicas da estadia para a cozinheira pelo código do link (/e/:codigo)
 */
export async function obterEstadiaPorCodigo(codigo) {
  if (!codigo || !codigo.trim()) return null;
  const codigoLimpo = codigo.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('obter_estadia', {
      p_codigo: codigoLimpo
    });

    if (error) throw error;
    if (!data) return null;

    let totalPedidos = typeof data.total_pedidos === 'number' ? data.total_pedidos : 0;
    try {
      // Se a RPC não retornou total_pedidos diretamente, consulta pelo ID da estadia
      if (totalPedidos === 0) {
        const { data: estData } = await supabase
          .from('estadias')
          .select('id')
          .eq('codigo', codigoLimpo)
          .maybeSingle();

        const estadiaIdReal = estData?.id || data.id;
        if (estadiaIdReal) {
          const { count } = await supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true })
            .eq('estadia_id', estadiaIdReal);
          totalPedidos = count || 0;
        }
      }
    } catch (countErr) {
      console.warn('Erro ao contar pedidos da estadia:', countErr);
    }

    return {
      ...data,
      total_pedidos: totalPedidos
    };
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const estadia = estadias.find(
    (e) => e.codigo?.toLowerCase() === codigoLimpo
  );

  if (!estadia) return null;

  if (estadia.status !== 'ativa') {
    return { status: estadia.status };
  }

  const pedidos = obterPedidosLocais();
  const totalPedidos = pedidos.filter((p) => p.estadia_id === estadia.id).length;

  return {
    status: estadia.status,
    casa: estadia.casa,
    entrada: estadia.entrada,
    saida: estadia.saida,
    hospedes: estadia.hospedes,
    total_pedidos: totalPedidos
  };
}

/**
 * Cria um novo pedido para a estadia pelo código do link
 */
export async function criarPedido({ codigo, cozinheira, itens }) {
  if (!codigo || !codigo.trim()) throw new Error('Código da estadia não informado.');
  if (!cozinheira || !cozinheira.trim()) throw new Error('Nome da cozinheira é obrigatório.');
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('O pedido deve conter itens.');

  const codigoLimpo = codigo.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('criar_pedido', {
      p_codigo: codigoLimpo,
      p_cozinheira: cozinheira.trim(),
      p_itens: itens
    });

    if (error) throw error;

    await registrarLogAuditoria({
      tipo_acao: 'PEDIDO_CRIADO',
      titulo: `Pedido #${data?.numero || 1} Criado (Em Aprovação)`,
      descricao: `Cozinheira ${cozinheira.trim()} enviou o Pedido #${data?.numero || 1} com ${itens.length} itens. Aguardando aprovação da equipe.`,
      estadia_id: data?.estadia_id,
      estadia_casa: data?.estadia_casa || codigoLimpo,
      usuario_nome: cozinheira.trim(),
      usuario_login: 'cozinheira'
    });

    const itensCustomSupa = (itens || []).filter((i) => i.is_custom);
    if (itensCustomSupa.length > 0) {
      const nomes = itensCustomSupa.map((i) => i.item).join(', ');
      await registrarLogAuditoria({
        tipo_acao: 'ITEM_FORA_CARDAPIO',
        titulo: 'Item(ns) Fora do Cardápio Solicitado(s)',
        descricao: `Cozinheira ${cozinheira.trim()} adicionou ${itensCustomSupa.length} item(ns) fora do menu no Pedido #${data?.numero || 1}: ${nomes}.`,
        estadia_id: data?.estadia_id,
        estadia_casa: data?.estadia_casa || codigoLimpo,
        usuario_nome: cozinheira.trim(),
        usuario_login: 'cozinheira'
      });
    }

    return data;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const estadia = estadias.find((e) => e.codigo?.toLowerCase() === codigoLimpo);

  if (!estadia) throw new Error('Estadia não encontrada para o código informado.');
  if (estadia.status !== 'ativa') {
    throw new Error(`Esta estadia não está ativa para novos pedidos (status atual: ${estadia.status}).`);
  }

  const pedidos = obterPedidosLocais();
  const pedidosDestaEstadia = pedidos.filter((p) => p.estadia_id === estadia.id);
  const proximoNumero = pedidosDestaEstadia.length + 1;
  const finalizadoEm = new Date().toISOString();

  const novoPedido = {
    id: 'pedido-' + Date.now(),
    estadia_id: estadia.id,
    numero: proximoNumero,
    cozinheira: cozinheira.trim(),
    finalizado_em: finalizadoEm,
    status: 'em_aprovacao',
    anexos: [],
    itens,
    estadia: {
      casa: estadia.casa,
      titular: estadia.titular,
      funcionario: estadia.funcionario,
      entrada: estadia.entrada,
      saida: estadia.saida,
      hospedes: estadia.hospedes,
      status: estadia.status
    }
  };

  pedidos.unshift(novoPedido);
  salvarPedidosLocais(pedidos);

  await registrarLogAuditoria({
    tipo_acao: 'PEDIDO_CRIADO',
    titulo: `Pedido #${proximoNumero} Criado (Em Aprovação)`,
    descricao: `Cozinheira ${cozinheira.trim()} enviou o Pedido #${proximoNumero} da estadia "${estadia.casa}" com ${itens.length} itens. Aguardando aprovação da equipe.`,
    estadia_id: estadia.id,
    estadia_casa: estadia.casa,
    usuario_nome: cozinheira.trim(),
    usuario_login: 'cozinheira'
  });

  const itensCustomLocal = (itens || []).filter((i) => i.is_custom);
  if (itensCustomLocal.length > 0) {
    const nomes = itensCustomLocal.map((i) => i.item).join(', ');
    await registrarLogAuditoria({
      tipo_acao: 'ITEM_FORA_CARDAPIO',
      titulo: 'Item(ns) Fora do Cardápio Solicitado(s)',
      descricao: `Cozinheira ${cozinheira.trim()} adicionou ${itensCustomLocal.length} item(ns) fora do menu no Pedido #${proximoNumero} da estadia "${estadia.casa}": ${nomes}.`,
      estadia_id: estadia.id,
      estadia_casa: estadia.casa,
      usuario_nome: cozinheira.trim(),
      usuario_login: 'cozinheira'
    });
  }

  return {
    numero: proximoNumero,
    finalizado_em: finalizadoEm,
    status: 'em_aprovacao'
  };
}

// ==========================================
// 4. GESTÃO E CONSULTA DE PEDIDOS (EQUIPE)
// ==========================================

/**
 * Altera o status do pedido na esteira de compras com rastreabilidade completa
 * Status: 'em_aprovacao' | 'enviar_fornecedores' | 'preparacao_entrega' | 'finalizado' | 'rejeitado'
 */
export async function alterarStatusPedido(pedidoId, novoStatus) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';
  const agora = new Date().toISOString();

  // 1. Atualizar no LocalStorage
  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  const casaNome = ped.estadia?.casa || 'Estadia';
  ped.status = novoStatus;

  let tipoAcaoAuditoria = 'STATUS_PEDIDO';
  let tituloAuditoria = `Pedido #${ped.numero} Atualizado`;
  let descAuditoria = `${autorNome} atualizou o status do Pedido #${ped.numero} para ${novoStatus}.`;

  if (novoStatus === 'enviar_fornecedores') {
    ped.aprovado_por_nome = autorNome;
    ped.aprovado_por_login = autorLogin;
    ped.aprovado_em = agora;
    tipoAcaoAuditoria = 'PEDIDO_APROVADO';
    tituloAuditoria = `Pedido #${ped.numero} Aprovado`;
    descAuditoria = `${autorNome} aprovou o Pedido #${ped.numero} (${casaNome}). Avançou para "Enviar ao(s) Fornecedor(es)".`;
  } else if (novoStatus === 'rejeitado') {
    ped.rejeitado_por_nome = autorNome;
    ped.rejeitado_por_login = autorLogin;
    ped.rejeitado_em = agora;
    tipoAcaoAuditoria = 'PEDIDO_REJEITADO';
    tituloAuditoria = `Pedido #${ped.numero} Rejeitado`;
    descAuditoria = `${autorNome} rejeitou o Pedido #${ped.numero} (${casaNome}). O pedido pode ser reaberto se necessário.`;
  } else if (novoStatus === 'em_aprovacao') {
    ped.reaberto_por_nome = autorNome;
    ped.reaberto_por_login = autorLogin;
    ped.reaberto_em = agora;
    tipoAcaoAuditoria = 'PEDIDO_REABERTO';
    tituloAuditoria = `Pedido #${ped.numero} Reaberto`;
    descAuditoria = `${autorNome} retornou o Pedido #${ped.numero} (${casaNome}) para análise e aprovação.`;
  } else if (novoStatus === 'preparacao_entrega') {
    ped.enviado_fornecedor_por_nome = autorNome;
    ped.enviado_fornecedor_por_login = autorLogin;
    ped.enviado_fornecedor_em = agora;
    tipoAcaoAuditoria = 'PEDIDO_ENVIADO_FORNECEDOR';
    tituloAuditoria = `Pedido #${ped.numero} Enviado aos Fornecedores`;
    descAuditoria = `${autorNome} confirmou envio do Pedido #${ped.numero} (${casaNome}) para os fornecedores. Fase atual: Preparação e Entrega.`;
  } else if (novoStatus === 'finalizado') {
    ped.concluido_por_nome = autorNome;
    ped.concluido_por_login = autorLogin;
    ped.concluido_em = agora;
    tipoAcaoAuditoria = 'PEDIDO_CONCLUIDO';
    tituloAuditoria = `Pedido #${ped.numero} Concluído`;
    descAuditoria = `${autorNome} finalizou o ciclo do Pedido #${ped.numero} (${casaNome}) com relatório final.`;
  }

  salvarPedidosLocais(pedidos);

  // 2. Sincronizar com Supabase se configurado
  if (isSupabaseConfigured()) {
    try {
      const updates = {
        status: novoStatus,
        aprovado_por_nome: ped.aprovado_por_nome,
        aprovado_por_login: ped.aprovado_por_login,
        aprovado_em: ped.aprovado_em,
        rejeitado_por_nome: ped.rejeitado_por_nome,
        rejeitado_por_login: ped.rejeitado_por_login,
        rejeitado_em: ped.rejeitado_em,
        reaberto_por_nome: ped.reaberto_por_nome,
        reaberto_por_login: ped.reaberto_por_login,
        reaberto_em: ped.reaberto_em,
        enviado_fornecedor_por_nome: ped.enviado_fornecedor_por_nome,
        enviado_fornecedor_por_login: ped.enviado_fornecedor_por_login,
        enviado_fornecedor_em: ped.enviado_fornecedor_em,
        concluido_por_nome: ped.concluido_por_nome,
        concluido_por_login: ped.concluido_por_login,
        concluido_em: ped.concluido_em
      };
      await supabase.from('pedidos').update(updates).eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase status update warning:', err);
    }
  }

  // 3. Gravar na Auditoria
  await registrarLogAuditoria({
    tipo_acao: tipoAcaoAuditoria,
    titulo: tituloAuditoria,
    descricao: descAuditoria,
    estadia_id: ped.estadia_id,
    estadia_casa: casaNome,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return ped;
}

/**
 * Calcula detalhadamente todas as diferenças entre duas listas de itens de um pedido
 * Detecta: itens adicionados, removidos, alterações de quantidade, unidade, observação, substituto e fornecedor
 */
export function calcularDiferencasItensPedido(itensAnteriores = [], novosItens = []) {
  const alteracoes = [];
  const alteracoesDetalhadas = [];

  const norm = (str) => String(str || '').trim().toLowerCase();

  const anteriores = Array.isArray(itensAnteriores) ? itensAnteriores : [];
  const novos = Array.isArray(novosItens) ? novosItens : [];

  const anterioresUsados = new Set();
  const novosUsados = new Set();

  function compararItem(ant, novo) {
    const nome = (novo.item || novo.nome || ant.item || ant.nome || 'Item').trim();
    const mudancas = [];

    // Nome renomeado (caso tenha casado por id)
    const nomeAnt = (ant.item || ant.nome || '').trim();
    const nomeNovo = (novo.item || novo.nome || '').trim();
    if (nomeAnt && nomeNovo && norm(nomeAnt) !== norm(nomeNovo)) {
      mudancas.push(`Renomeado de "${nomeAnt}" para "${nomeNovo}"`);
    }

    // Quantidade
    const qtdAnt = Number(ant.quantidade);
    const qtdNovo = Number(novo.quantidade);
    const unAnt = ant.unidade || 'un';
    const unNovo = novo.unidade || 'un';

    if (!isNaN(qtdAnt) && !isNaN(qtdNovo) && qtdAnt !== qtdNovo) {
      mudancas.push(`Quantidade alterada de ${qtdAnt} ${unAnt} para ${qtdNovo} ${unNovo}`);
    } else if (unAnt !== unNovo) {
      mudancas.push(`Unidade alterada de "${unAnt}" para "${unNovo}"`);
    }

    // Aceita substituto
    const subAnt = ant.aceitaSubstituto !== false;
    const subNovo = novo.aceitaSubstituto !== false;
    if (subAnt !== subNovo) {
      mudancas.push(`Substituto: ${subNovo ? 'Agora aceita substituto' : 'Não aceita mais substituto'}`);
    }

    // Observação
    const obsAnt = (ant.observacao || '').trim();
    const obsNovo = (novo.observacao || '').trim();
    if (obsAnt !== obsNovo) {
      if (!obsAnt && obsNovo) {
        mudancas.push(`Observação adicionada: "${obsNovo}"`);
      } else if (obsAnt && !obsNovo) {
        mudancas.push(`Observação removida (era "${obsAnt}")`);
      } else {
        mudancas.push(`Observação alterada: de "${obsAnt}" para "${obsNovo}"`);
      }
    }

    // Fornecedor
    const fornAnt = (ant.fornecedor || '').trim();
    const fornNovo = (novo.fornecedor || '').trim();
    if (fornAnt && fornNovo && fornAnt !== fornNovo) {
      mudancas.push(`Fornecedor alterado de "${fornAnt}" para "${fornNovo}"`);
    }

    if (mudancas.length > 0) {
      const txt = `✏️ "${nome}": ${mudancas.join(' • ')}`;
      alteracoes.push(txt);
      alteracoesDetalhadas.push({ tipo: 'alterado', item: nome, mudancas, texto: txt, antes: ant, depois: novo });
    }
  }

  // 1ª Passagem: Buscar por ID idêntico
  for (let i = 0; i < novos.length; i++) {
    const novo = novos[i];
    if (!novo || !novo.id) continue;
    const idxAnt = anteriores.findIndex((ant, aIdx) => !anterioresUsados.has(aIdx) && ant && ant.id === novo.id);
    if (idxAnt !== -1) {
      anterioresUsados.add(idxAnt);
      novosUsados.add(i);
      compararItem(anteriores[idxAnt], novo);
    }
  }

  // 2ª Passagem: Buscar por Nome do Item idêntico
  for (let i = 0; i < novos.length; i++) {
    if (novosUsados.has(i)) continue;
    const novo = novos[i];
    const nomeNovo = norm(novo.item || novo.nome);
    if (!nomeNovo) continue;

    const idxAnt = anteriores.findIndex((ant, aIdx) => {
      if (anterioresUsados.has(aIdx) || !ant) return false;
      const nomeAnt = norm(ant.item || ant.nome);
      return nomeAnt === nomeNovo;
    });

    if (idxAnt !== -1) {
      anterioresUsados.add(idxAnt);
      novosUsados.add(i);
      compararItem(anteriores[idxAnt], novo);
    }
  }

  // 3ª Itens restantes em "anteriores" foram REMOVIDOS
  for (let aIdx = 0; aIdx < anteriores.length; aIdx++) {
    if (!anterioresUsados.has(aIdx)) {
      const ant = anteriores[aIdx];
      const nome = (ant.item || ant.nome || 'Item').trim();
      const qtd = ant.quantidade || 1;
      const un = ant.unidade || 'un';
      const txt = `➖ Removido item: "${nome}" (${qtd} ${un})`;
      alteracoes.push(txt);
      alteracoesDetalhadas.push({ tipo: 'removido', item: nome, texto: txt, antes: ant, depois: null });
    }
  }

  // 4ª Itens restantes em "novos" foram ADICIONADOS
  for (let nIdx = 0; nIdx < novos.length; nIdx++) {
    if (!novosUsados.has(nIdx)) {
      const novo = novos[nIdx];
      const nome = (novo.item || novo.nome || 'Item').trim();
      const qtd = novo.quantidade || 1;
      const un = novo.unidade || 'un';
      const txt = `➕ Adicionado item: "${nome}" (${qtd} ${un})`;
      alteracoes.push(txt);
      alteracoesDetalhadas.push({ tipo: 'adicionado', item: nome, texto: txt, antes: null, depois: novo });
    }
  }

  return { alteracoes, alteracoesDetalhadas };
}

/**
 * Edita os itens do pedido (alteração de quantidade, remoção ou adição de novos itens pela equipe)
 */
export async function editarItensPedido(pedidoId, novosItens, motivo = '') {
  if (!Array.isArray(novosItens)) throw new Error('A lista de itens deve ser um array válido.');

  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';
  const agora = new Date().toISOString();

  // 1. Obter pedido atual para comparar itens anteriores
  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  const casaNome = ped.estadia?.casa || 'Estadia';
  const itensAnteriores = Array.isArray(ped.itens) ? JSON.parse(JSON.stringify(ped.itens)) : [];
  const totalAnterior = itensAnteriores.length;

  // Calcula exatamente as alterações feitas
  const { alteracoes, alteracoesDetalhadas } = calcularDiferencasItensPedido(itensAnteriores, novosItens);

  // Formata o resumo em texto claro
  let detalhamentoTexto = '';
  if (alteracoes.length > 0) {
    detalhamentoTexto = '\n' + alteracoes.map((alt) => `• ${alt}`).join('\n');
  } else {
    detalhamentoTexto = '\n• Nenhuma alteração detectada nos itens.';
  }

  const descricaoAuditoria = `${autorNome} editou os itens do Pedido #${ped.numero} (${casaNome}). Total de itens ajustado de ${totalAnterior} para ${novosItens.length}.${motivo ? ` Motivo: ${motivo}.` : ''}\nO que foi editado (${alteracoes.length}):${detalhamentoTexto}`;

  ped.itens = novosItens;
  ped.atualizado_em = agora;
  ped.editado_por_nome = autorNome;
  ped.editado_por_login = autorLogin;
  ped.editado_em = agora;

  // Salva no histórico de edições do próprio pedido
  const historico = Array.isArray(ped.historico_edicoes) ? [...ped.historico_edicoes] : [];
  historico.unshift({
    data: agora,
    autor_nome: autorNome,
    autor_login: autorLogin,
    motivo: motivo || '',
    alteracoes: alteracoes,
    resumo: `Total de itens: de ${totalAnterior} para ${novosItens.length}`
  });
  ped.historico_edicoes = historico;

  salvarPedidosLocais(pedidos);

  // 2. Atualizar no Supabase se configurado
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('pedidos')
        .update({
          itens: novosItens,
          editado_por_nome: autorNome,
          editado_por_login: autorLogin,
          editado_em: agora
        })
        .eq('id', pedidoId);
    } catch (err) {
      console.warn('Erro ao atualizar itens no Supabase:', err);
    }
  }

  // 3. Registrar na Auditoria com o detalhamento completo
  await registrarLogAuditoria({
    tipo_acao: 'PEDIDO_EDITADO',
    titulo: `Pedido #${ped.numero} Editado`,
    descricao: descricaoAuditoria,
    estadia_id: ped.estadia_id,
    estadia_casa: casaNome,
    usuario_nome: autorNome,
    usuario_login: autorLogin,
    dados_backup: {
      alteracoes: alteracoes,
      alteracoesDetalhadas: alteracoesDetalhadas,
      totalAnterior,
      totalNovo: novosItens.length,
      motivo
    }
  });

  return ped;
}

/**
 * Adiciona anexos (fotos de comprovantes, notas, produtos, PDFs) a um pedido
 */
export async function adicionarAnexosPedido(pedidoId, novosAnexos) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';
  const agora = new Date().toISOString();

  const anexosFormatados = (novosAnexos || []).map((anexo) => {
    let valorNum = 0;
    if (typeof anexo.valor_total === 'number') {
      valorNum = isNaN(anexo.valor_total) ? 0 : anexo.valor_total;
    } else if (anexo.valor_total) {
      const limpo = String(anexo.valor_total).replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
      valorNum = parseFloat(limpo) || 0;
    }

    return {
      id: anexo.id || 'anexo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      nome: anexo.nome || 'Documento',
      tipo: anexo.tipo || 'imagem',
      tamanho: anexo.tamanho || '0 KB',
      url: anexo.url,
      fornecedor: anexo.fornecedor ? anexo.fornecedor.trim() : 'Geral',
      valor_total: valorNum,
      quem_pagou: anexo.quem_pagou === 'outra_pessoa' ? 'outra_pessoa' : 'hospede',
      quem_pagou_outro: anexo.quem_pagou_outro ? anexo.quem_pagou_outro.trim() : '',
      data_comprovante: anexo.data_comprovante || agora.split('T')[0],
      anexado_por_nome: autorNome,
      anexado_por_login: autorLogin,
      anexado_em: agora
    };
  });

  // Salva no IndexedDB imediatamente com AWAIT para garantir que a mídia está 100% gravada
  for (const a of anexosFormatados) {
    if (a.id && a.url && (a.url.startsWith('data:') || a.url.startsWith('blob:'))) {
      await salvarMidiaIndexedDB(a.id, a.url);
    }
  }

  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  ped.anexos = [...(ped.anexos || []), ...anexosFormatados];

  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pedidos').update({ anexos: ped.anexos }).eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  await registrarLogAuditoria({
    tipo_acao: 'PEDIDO_ANEXO',
    titulo: `Anexos no Pedido #${ped.numero}`,
    descricao: `${autorNome} anexou ${anexosFormatados.length} arquivo(s) ao Pedido #${ped.numero} (${ped.estadia?.casa || 'Estadia'}).`,
    estadia_id: ped.estadia_id,
    estadia_casa: ped.estadia?.casa || 'Estadia',
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return ped;
}

/**
 * Atualiza dados cadastrais de um comprovante / anexo (Fornecedor, Valor total, Quem pagou, Data)
 */
export async function atualizarAnexoPedido(pedidoId, anexoId, dadosAtualizados) {
  if (dadosAtualizados.url && (dadosAtualizados.url.startsWith('data:') || dadosAtualizados.url.startsWith('blob:'))) {
    await salvarMidiaIndexedDB(anexoId, dadosAtualizados.url);
  }

  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  ped.anexos = (ped.anexos || []).map((a) => {
    if (a.id !== anexoId) return a;

    let valorNum = a.valor_total || 0;
    if (dadosAtualizados.valor_total !== undefined) {
      if (typeof dadosAtualizados.valor_total === 'number') {
        valorNum = isNaN(dadosAtualizados.valor_total) ? 0 : dadosAtualizados.valor_total;
      } else {
        const limpo = String(dadosAtualizados.valor_total).replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        valorNum = parseFloat(limpo) || 0;
      }
    }

    return {
      ...a,
      url: dadosAtualizados.url || a.url,
      fornecedor: dadosAtualizados.fornecedor !== undefined ? dadosAtualizados.fornecedor.trim() : (a.fornecedor || 'Geral'),
      valor_total: valorNum,
      quem_pagou: dadosAtualizados.quem_pagou !== undefined ? dadosAtualizados.quem_pagou : (a.quem_pagou || 'hospede'),
      quem_pagou_outro: dadosAtualizados.quem_pagou_outro !== undefined ? dadosAtualizados.quem_pagou_outro.trim() : (a.quem_pagou_outro || ''),
      data_comprovante: dadosAtualizados.data_comprovante || a.data_comprovante
    };
  });

  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pedidos').update({ anexos: ped.anexos }).eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  return ped;
}

/**
 * Remove um anexo de um pedido
 */
export async function removerAnexoPedido(pedidoId, anexoId) {
  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  ped.anexos = (ped.anexos || []).filter((a) => a.id !== anexoId);
  
  await removerMidiaIndexedDB(anexoId);
  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pedidos').update({ anexos: ped.anexos }).eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  return ped;
}

/**
 * Registra o recebimento de pagamento de uma nota de compra
 * Suporta quitação total ou parcial pelo hóspede, ou atualização de pagamento por terceiro
 */
export async function registrarPagamentoNotaPedido(pedidoId, anexoId, dados) {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';
  const agora = new Date().toISOString();

  let valorNum = 0;
  if (typeof dados.valor === 'number') {
    valorNum = isNaN(dados.valor) ? 0 : dados.valor;
  } else if (dados.valor) {
    const limpo = String(dados.valor).replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
    valorNum = parseFloat(limpo) || 0;
  }

  if (valorNum <= 0) {
    throw new Error('Informe um valor de pagamento válido e positivo.');
  }

  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx === -1) throw new Error('Pedido não encontrado.');

  const ped = pedidos[idx];
  const anexoIdx = (ped.anexos || []).findIndex((a) => a.id === anexoId);
  if (anexoIdx === -1) throw new Error('Nota fiscal / anexo não encontrado.');

  const anexo = ped.anexos[anexoIdx];
  const valorTotalNota = Number(anexo.valor_total) || 0;
  const pagamentoId = 'pgt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  // Salva comprovante no IndexedDB se houver
  if (dados.comprovante_url && (dados.comprovante_url.startsWith('data:') || dados.comprovante_url.startsWith('blob:'))) {
    await salvarMidiaIndexedDB(pagamentoId, dados.comprovante_url);
  }

  const pagadorNome = dados.quem_pagou === 'hospede'
    ? (dados.quem_pagou_nome || 'Hóspede')
    : (dados.quem_pagou_outro ? dados.quem_pagou_outro.trim() : 'Outro terceiro');

  const novoPagamento = {
    id: pagamentoId,
    valor: valorNum,
    data: dados.data || agora.split('T')[0],
    forma_pagamento: (dados.forma_pagamento || 'PIX').trim(),
    quem_pagou: dados.quem_pagou,
    quem_pagou_nome: pagadorNome,
    observacao: dados.observacao ? dados.observacao.trim() : '',
    comprovante_url: dados.comprovante_url || '',
    comprovante_nome: dados.comprovante_nome || 'Comprovante Pagamento',
    comprovante_tipo: dados.comprovante_tipo || 'imagem',
    comprovante_tamanho: dados.comprovante_tamanho || '0 KB',
    registrado_em: agora,
    registrado_por_nome: autorNome,
    registrado_por_login: autorLogin
  };

  const listaPagamentos = Array.isArray(anexo.pagamentos) ? [...anexo.pagamentos] : [];
  listaPagamentos.push(novoPagamento);
  anexo.pagamentos = listaPagamentos;

  if (dados.quem_pagou === 'hospede') {
    // Acumula o valor já pago pelo cliente
    const totalPagoAteAgora = (Number(anexo.valor_pago) || 0) + valorNum;
    anexo.valor_pago = totalPagoAteAgora;
    const restante = Math.max(0, valorTotalNota - totalPagoAteAgora);

    if (restante <= 0.01) {
      // 100% quitada pelo hóspede
      anexo.quem_pagou = 'hospede';
      anexo.quem_pagou_outro = '';
      anexo.status_pagamento = 'pago';
      anexo.valor_restante = 0;
    } else {
      // Pagamento parcial: ainda resta um saldo devedor
      anexo.status_pagamento = 'parcial';
      anexo.valor_restante = restante;
      anexo.quem_pagou = 'outra_pessoa'; // Mantém pendência para reembolso do valor restante
    }
  } else {
    // Quem pagou foi outro terceiro: atualiza o nome de quem pagou e mantém pendente
    anexo.quem_pagou = 'outra_pessoa';
    anexo.quem_pagou_outro = pagadorNome;
  }

  ped.anexos[anexoIdx] = anexo;
  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('pedidos').update({ anexos: ped.anexos }).eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const superavit = Math.max(0, (Number(anexo.valor_pago) || 0) - valorTotalNota);
  await registrarLogAuditoria({
    tipo_acao: 'PAGAMENTO_NOTA_RECEBIDO',
    titulo: `Pagamento Recebido na Nota (${anexo.fornecedor || 'Fornecedor'})`,
    descricao: `${autorNome} registrou recebimento de ${formatarMoeda(valorNum)} na Nota #${anexoIdx + 1} (${anexo.fornecedor || 'Nota'}) do Pedido #${ped.numero}. Pagador: ${pagadorNome}.${superavit > 0 ? ` Quitação da nota + Superávit de ${formatarMoeda(superavit)} a favor do cliente.` : (anexo.valor_restante || 0) > 0 ? ` Restante a pagar: ${formatarMoeda(anexo.valor_restante)}.` : ' Nota 100% quitada.'}`,
    estadia_id: ped.estadia_id,
    estadia_casa: ped.estadia?.casa || 'Estadia',
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return { pedidoAtualizado: ped, anexoAtualizado: anexo };
}

/**
 * Lista pedidos de uma estadia específica
 */
export async function listarPedidosPorEstadia(estadiaId) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estadia_id', estadiaId)
      .order('numero', { ascending: false });

    if (error) throw error;
    return (data || []).map((p) => ({
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || []
    }));
  }

  // Modo Localhost
  let pedidos = obterPedidosLocais();
  if (!pedidos || pedidos.length === 0) {
    const backupIDB = await obterPedidosIndexedDB();
    if (backupIDB && backupIDB.length > 0) {
      pedidos = backupIDB;
      cachePedidosMemoria = pedidos;
    }
  }

  const pedidosHidratados = await hidratarAnexosComMidia(pedidos);
  cachePedidosMemoria = pedidosHidratados;

  return pedidosHidratados
    .filter((p) => p.estadia_id === estadiaId)
    .map((p) => ({
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || []
    }));
}

/**
 * Lista todos os pedidos recentes do sistema com dados da estadia vinculada
 */
export async function listarTodosPedidos() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        estadia:estadias(id, casa, titular, funcionario, entrada, saida, hospedes, status)
      `)
      .order('finalizado_em', { ascending: false });

    if (error) throw error;
    return (data || []).map((p) => ({
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || []
    }));
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  let pedidos = obterPedidosLocais();
  if (!pedidos || pedidos.length === 0) {
    const backupIDB = await obterPedidosIndexedDB();
    if (backupIDB && backupIDB.length > 0) {
      pedidos = backupIDB;
      cachePedidosMemoria = pedidos;
    }
  }

  const pedidosHidratados = await hidratarAnexosComMidia(pedidos);
  cachePedidosMemoria = pedidosHidratados;

  return pedidosHidratados.map((p) => {
    const est = estadias.find((e) => e.id === p.estadia_id) || p.estadia || {};
    return {
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || [],
      itens: p.itens || [],
      estadia: est
    };
  });
}
