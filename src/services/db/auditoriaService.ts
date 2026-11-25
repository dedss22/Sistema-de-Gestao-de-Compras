import { isSupabaseConfigured, supabase } from './client';
import { getSessaoAtual } from './authService';
import { obterLogsAuditoriaLocais, salvarLogsAuditoriaLocais } from './localStore';
import type { AuthSession, DadosRegistrarLogAuditoria, LogAuditoria } from './types';

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
}: DadosRegistrarLogAuditoria): Promise<LogAuditoria> {
  let autorNome = usuario_nome;
  let autorLogin = usuario_login;

  if (!autorNome) {
    const sessao = await getSessaoAtual();
    const user = sessao?.user as (AuthSession['user'] & { user_metadata?: Record<string, unknown> }) | undefined;
    const metaNome = typeof user?.user_metadata?.nome === 'string' ? user.user_metadata.nome : undefined;
    const metaLogin = typeof user?.user_metadata?.login === 'string' ? user.user_metadata.login : undefined;

    autorNome = metaNome || user?.nome || 'Equipe';
    autorLogin = metaLogin || user?.login || 'equipe';
  }

  const logItem: LogAuditoria = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    tipo_acao,
    titulo,
    descricao,
    estadia_id,
    estadia_casa,
    usuario_nome: autorNome,
    usuario_login: autorLogin || 'equipe',
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
export async function listarLogsAuditoria({
  limite = 100,
  busca = '',
  tipo = 'todos'
}: {
  limite?: number;
  busca?: string;
  tipo?: string;
} = {}): Promise<LogAuditoria[]> {
  let logs = obterLogsAuditoriaLocais();

  if (tipo && tipo !== 'todos') {
    logs = logs.filter((l) => l.tipo_acao === tipo);
  }

  if (busca && busca.trim()) {
    const termo = busca.trim().toLowerCase();
    logs = logs.filter(
      (l) =>
        l.descricao?.toLowerCase().includes(termo) ||
        l.usuario_nome?.toLowerCase().includes(termo) ||
        l.estadia_casa?.toLowerCase().includes(termo) ||
        l.titulo?.toLowerCase().includes(termo)
    );
  }

  return logs.slice(0, limite);
}
