import {
  salvarMidiaIndexedDB,
  salvarPedidosIndexedDB
} from '../anexoStorage';
import type {
  Estadia,
  LixeiraItem,
  LogAuditoria,
  PedidoBanco
} from './types';

// ==============================================================================
// MOTOR LOCAL (MOCK FALLBACK PARA RODAR TUDO NO LOCALHOST SEM SUPABASE CLOUD)
// ==============================================================================

export const LOCAL_SESSION_KEY = 'lista_compras_supabase_session';
export const LOCAL_ESTADIAS_KEY = 'lista_compras_supabase_estadias';
export const LOCAL_PEDIDOS_KEY = 'lista_compras_supabase_pedidos';
export const LOCAL_LOGS_KEY = 'lista_compras_supabase_logs';
export const LOCAL_LIXEIRA_KEY = 'lista_compras_supabase_lixeira';

// Cache em memória para acesso imediato e sem limites de armazenamento
let cachePedidosMemoria: PedidoBanco[] | null = null;

export function getCachePedidosMemoria(): PedidoBanco[] | null {
  return cachePedidosMemoria;
}

export function setCachePedidosMemoria(pedidos: PedidoBanco[] | null): void {
  cachePedidosMemoria = pedidos;
}

/**
 * Converte valores monetários em formato brasileiro (ex: "R$ 1.234.567,89", "R$ 1.500", "1500,50")
 * ou numéricos para `number` seguro. Retorna `0` para entradas vazias ou inválidas.
 */
export function parseMoedaBRL(val: unknown): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }
  if (val === null || val === undefined) {
    return 0;
  }

  const bruto = String(val)
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^\d.,-]/g, '');

  if (!bruto || bruto === '-') {
    return 0;
  }

  const negativo = bruto.startsWith('-');
  const semSinal = bruto.replace(/-/g, '');
  if (!semSinal) {
    return 0;
  }

  let normalizado: string;
  if (semSinal.includes(',')) {
    // Formato BRL com vírgula decimal: pontos são separadores de milhar
    normalizado = semSinal.replace(/\./g, '').replace(',', '.');
  } else {
    const qtdPontos = (semSinal.match(/\./g) || []).length;
    if (qtdPontos > 1 || /^[1-9]\d{0,2}\.\d{3}$/.test(semSinal)) {
      // Múltiplos pontos de milhar (ex: "1.234.567") ou milhar único (ex: "1.500")
      normalizado = semSinal.replace(/\./g, '');
    } else {
      normalizado = semSinal;
    }
  }

  const parsed = parseFloat((negativo ? '-' : '') + normalizado);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function gerarCodigoLocal(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let res = '';
  for (let i = 0; i < 10; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function obterEstadiasLocais(): Estadia[] {
  try {
    const raw = localStorage.getItem(LOCAL_ESTADIAS_KEY);
    if (raw) return JSON.parse(raw) as Estadia[];

    // Se estiver vazio, inicia com uma estadia modelo
    const seed: Estadia[] = [
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

export function salvarEstadiasLocais(estadias: Estadia[]): void {
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

/**
 * Limpa e otimiza o localStorage caso esteja com dados pesados de testes anteriores
 */
export async function purificarArmazenamentoLocal(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // 1. Limpeza de logs de auditoria pesados (remove dados_backup antigos com fotos)
    const rawLogs = localStorage.getItem(LOCAL_LOGS_KEY);
    if (rawLogs && (rawLogs.length > 200000 || rawLogs.includes('data:image'))) {
      try {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs)) {
          const logsLimpos = logs.slice(0, 50).map((l: LogAuditoria) => ({
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
          const lixeiraLimpa = lixeira.slice(0, 10).map((item: LixeiraItem) => ({
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
      const pedidos = JSON.parse(rawPedidos) as PedidoBanco[];
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

// Executa a purificação imediatamente na inicialização em ambiente de navegador
if (typeof window !== 'undefined') {
  purificarArmazenamentoLocal().catch(() => {});
}

export function obterPedidosLocais(): PedidoBanco[] {
  if (cachePedidosMemoria && Array.isArray(cachePedidosMemoria) && cachePedidosMemoria.length > 0) {
    return cachePedidosMemoria;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PEDIDOS_KEY);
    const parsed: PedidoBanco[] = raw ? JSON.parse(raw) : [];
    cachePedidosMemoria = parsed;
    return parsed;
  } catch {
    return [];
  }
}

export function salvarPedidosLocais(pedidos: PedidoBanco[]): void {
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
        comprovante_url:
          pg && pg.comprovante_url && (pg.comprovante_url.startsWith('data:') || pg.comprovante_url.startsWith('blob:'))
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

export function obterLogsAuditoriaLocais(): LogAuditoria[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) return JSON.parse(raw) as LogAuditoria[];

    const seed: LogAuditoria[] = [
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

export function salvarLogsAuditoriaLocais(logs: LogAuditoria[]): void {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    console.error('Erro ao salvar logs de auditoria:', e);
  }
}

export function obterLixeiraLocal(): LixeiraItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_LIXEIRA_KEY);
    return raw ? (JSON.parse(raw) as LixeiraItem[]) : [];
  } catch {
    return [];
  }
}

export function salvarNaLixeiraLocal(item: LixeiraItem): void {
  try {
    const lixeira = obterLixeiraLocal();
    lixeira.unshift(item);
    localStorage.setItem(LOCAL_LIXEIRA_KEY, JSON.stringify(lixeira.slice(0, 100)));
  } catch (e) {
    console.error('Erro ao salvar na lixeira:', e);
  }
}

export function removerDaLixeiraLocal(id: string): void {
  try {
    const lixeira = obterLixeiraLocal();
    const filtrada = lixeira.filter((item) => item.id !== id && item.estadia?.id !== id);
    localStorage.setItem(LOCAL_LIXEIRA_KEY, JSON.stringify(filtrada));
  } catch (e) {
    console.error('Erro ao remover da lixeira:', e);
  }
}
