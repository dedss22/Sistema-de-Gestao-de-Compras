import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';
import { LOCAL_SESSION_KEY } from './localStore';
import { registrarLogAuditoria } from './auditoriaService';
import type {
  AuthChangeCallback,
  AuthSession,
  AuthSubscription,
  SessaoAtiva,
  UsuarioAtivo,
  UsuarioEquipe
} from './types';

/**
 * Usuários oficiais da equipe com credenciais configuradas
 */
export const USUARIOS_EQUIPE: UsuarioEquipe[] = [
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
const localAuthListeners = new Set<AuthChangeCallback>();

function notificarMudancaAuthLocal(evento: string, sessao: SessaoAtiva | null): void {
  localAuthListeners.forEach((cb) => {
    try {
      cb(evento, sessao);
    } catch (e) {
      console.error('Erro em listener de auth local:', e);
    }
  });
}

/**
 * Extrai nome e login do autor autenticado a partir da sessão atual.
 */
export async function obterAutorAtual(fallbackNome = 'Equipe'): Promise<{ autorNome: string; autorLogin: string }> {
  const sessao = await getSessaoAtual();
  const user = sessao?.user as (AuthSession['user'] & { user_metadata?: Record<string, unknown> }) | undefined;
  const metaNome = typeof user?.user_metadata?.nome === 'string' ? user.user_metadata.nome : undefined;
  const metaLogin = typeof user?.user_metadata?.login === 'string' ? user.user_metadata.login : undefined;

  return {
    autorNome: metaNome || user?.nome || fallbackNome,
    autorLogin: metaLogin || user?.login || 'equipe'
  };
}

/**
 * Realiza login por usuário/e-mail e senha
 */
export async function loginEquipe(
  identificador: string,
  password: string
): Promise<{ session: SessaoAtiva | null; user: UsuarioAtivo | null }> {
  const idLimpo = (identificador || '').trim().toLowerCase();

  // 1. Verifica se corresponde a um dos 3 membros oficiais da equipe
  const usuarioEquipe = USUARIOS_EQUIPE.find(
    (u) => (u.login.toLowerCase() === idLimpo || u.email.toLowerCase() === idLimpo) && u.senha === password
  );

  if (usuarioEquipe) {
    const session: AuthSession = {
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
    const session: AuthSession = {
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
    return {
      session: data.session as SessaoAtiva | null,
      user: (data.user as UsuarioAtivo | null) ?? null
    };
  }

  throw new Error('Usuário ou senha incorretos. Verifique suas credenciais.');
}

/**
 * Encerra a sessão atual
 */
export async function logoutEquipe(): Promise<void> {
  localStorage.removeItem(LOCAL_SESSION_KEY);
  notificarMudancaAuthLocal('SIGNED_OUT', null);

  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erro ao encerrar sessão remota
    }
  }
}

/**
 * Obtém a sessão ativa no momento (persistência garantida entre recarregamentos de página)
 */
export async function getSessaoAtual(): Promise<SessaoAtiva | null> {
  // 1. Sempre verifica a sessão salva no navegador primeiro
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthSession;
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
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();
      if (!error && session) return session as SessaoAtiva;
    } catch (e) {
      console.warn('Erro ao checar sessao Supabase Auth:', e);
    }
  }

  return null;
}

/**
 * Obtém o usuário atual
 */
export async function getUsuarioAtual(): Promise<UsuarioAtivo | null> {
  const sessao = await getSessaoAtual();
  return sessao?.user || null;
}

/**
 * Inscreve listener para mudanças de estado de autenticação
 */
export function onMudancaAuth(callback: AuthChangeCallback): AuthSubscription {
  localAuthListeners.add(callback);

  let supabaseSub: { unsubscribe: () => void } | null = null;
  if (isSupabaseConfigured()) {
    try {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        // Se já temos sessão de equipe ativa no localStorage, não permite sobrescrever com null inicial
        const localRaw = localStorage.getItem(LOCAL_SESSION_KEY);
        if (localRaw && !session) {
          try {
            const parsed = JSON.parse(localRaw) as AuthSession;
            if (parsed && parsed.user) return;
          } catch {
            // Ignora JSON inválido no localStorage
          }
        }
        callback(event, session as SessaoAtiva | null);
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
