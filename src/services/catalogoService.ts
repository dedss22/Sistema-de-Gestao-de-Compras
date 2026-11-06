import catalogoBaseJson from '../data/catalogo.json';
import { ItemCatalogo, FornecedorId } from '../types';
import { PedidoBanco, registrarLogAuditoria, getSessaoAtual } from './db';

const STORAGE_NOVOS_ITENS = 'lista_compras_novos_itens_catalogo';
const STORAGE_STATUS_SUGESTOES = 'lista_compras_sugestoes_itens_status';

export interface SugestaoPedidoOrigem {
  pedido_id: string;
  pedido_numero: number;
  cozinheira: string;
  estadia_casa: string;
  estadia_id?: string;
  finalizado_em: string;
  quantidade: number;
  observacao?: string;
}

export interface SugestaoItemCustom {
  id: string;
  nome: string;
  fornecedor: FornecedorId | string;
  categoria: string;
  unidade: string;
  observacoes: string[];
  pedidos: SugestaoPedidoOrigem[];
  total_pedidos: number;
  total_quantidade: number;
  status: 'pendente' | 'adicionado' | 'descartado';
  primeira_vez_pedido: string;
  ultima_vez_pedido: string;
  adicionado_ao_catalogo_em?: string;
}

// Conjunto com os nomes oficiais originais em minúsculas para checagem rápida
const nomesCatalogoOriginal = new Set(
  (catalogoBaseJson as ItemCatalogo[]).map((i) => i.nome.trim().toLowerCase())
);

/**
 * Obtém a lista de itens adicionados ao catálogo dinamicamente pelo admin
 */
export function obterNovosItensCatalogo(): ItemCatalogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOVOS_ITENS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de itens adicionados dinamicamente
 */
function salvarNovosItensCatalogo(itens: ItemCatalogo[]): void {
  try {
    localStorage.setItem(STORAGE_NOVOS_ITENS, JSON.stringify(itens));
    window.dispatchEvent(new Event('catalogo_atualizado'));
  } catch (e) {
    console.error('Erro ao salvar novos itens do catálogo:', e);
  }
}

/**
 * Retorna o catálogo oficial completo (Base JSON + Itens criados pelo Admin)
 */
export function obterCatalogoCompleto(): ItemCatalogo[] {
  const base = catalogoBaseJson as ItemCatalogo[];
  const novos = obterNovosItensCatalogo();

  // Garante que não haja duplicatas
  const idsExistentes = new Set(base.map((b) => b.id));
  const novosFiltrados = novos.filter((n) => !idsExistentes.has(n.id));

  return [...base, ...novosFiltrados];
}

/**
 * Registra um ouvinte para quando o catálogo for atualizado em tempo real
 */
export function onCatalogoAtualizado(callback: () => void): () => void {
  const handler = () => {
    try {
      callback();
    } catch (e) {
      console.error('Erro no listener de catalogo_atualizado:', e);
    }
  };
  window.addEventListener('catalogo_atualizado', handler);
  return () => window.removeEventListener('catalogo_atualizado', handler);
}

/**
 * Obtém mapa de status das sugestões ('pendente' | 'adicionado' | 'descartado')
 */
export function obterStatusSugestoes(): Record<string, 'pendente' | 'adicionado' | 'descartado'> {
  try {
    const raw = localStorage.getItem(STORAGE_STATUS_SUGESTOES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Atualiza o status de uma sugestão de item
 */
export function atualizarStatusSugestao(
  nomeItem: string,
  novoStatus: 'pendente' | 'adicionado' | 'descartado'
): void {
  try {
    const statusMap = obterStatusSugestoes();
    const chave = nomeItem.trim().toLowerCase();
    statusMap[chave] = novoStatus;
    localStorage.setItem(STORAGE_STATUS_SUGESTOES, JSON.stringify(statusMap));
    window.dispatchEvent(new Event('catalogo_atualizado'));
  } catch (e) {
    console.error('Erro ao salvar status da sugestão:', e);
  }
}

/**
 * Adiciona um novo produto definitivamente ao cardápio oficial
 */
export async function adicionarItemAoCatalogo(dados: {
  nome: string;
  fornecedor: FornecedorId;
  subcategoria: string;
  unidade: string;
  descricaoBreve?: string;
  quantidade_por_pessoa_dia?: number;
  emoji?: string;
}): Promise<ItemCatalogo> {
  const sessao = await getSessaoAtual();
  const autorNome = sessao?.user?.user_metadata?.nome || sessao?.user?.nome || 'Equipe';
  const autorLogin = sessao?.user?.user_metadata?.login || sessao?.user?.login || 'equipe';

  const nomeLimpo = dados.nome.trim();
  const slug = nomeLimpo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const novoItem: ItemCatalogo = {
    id: `item-${slug}-${Date.now().toString().slice(-4)}`,
    nome: nomeLimpo,
    fornecedor: dados.fornecedor,
    subcategoria: dados.subcategoria.trim(),
    unidade: dados.unidade.trim(),
    imagem: '/assets/hero.png',
    quantidade_por_pessoa_dia: Number(dados.quantidade_por_pessoa_dia) || 0,
    ativo: true,
    favorito: true,
    descricaoBreve: dados.descricaoBreve ? dados.descricaoBreve.trim() : 'Item adicionado ao cardápio oficial pela equipe.',
    emoji: dados.emoji || '✨'
  };

  const listaAtual = obterNovosItensCatalogo();
  listaAtual.push(novoItem);
  salvarNovosItensCatalogo(listaAtual);

  // Marca como aprovado / adicionado no mapa de sugestões
  atualizarStatusSugestao(nomeLimpo, 'adicionado');

  // Registra auditoria
  await registrarLogAuditoria({
    tipo_acao: 'CARDAPIO_NOVO_ITEM',
    titulo: 'Novo Item Adicionado ao Cardápio',
    descricao: `${autorNome} aprovou a sugestão e incluiu "${novoItem.nome}" no cardápio oficial em "${novoItem.subcategoria}" (${novoItem.fornecedor}).`,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return novoItem;
}

/**
 * Varre todos os pedidos da base de dados e extrai todos os itens adicionados
 * manualmente fora do cardápio oficial, agrupando ocorrências e frequências.
 */
export function extrairSugestoesItensCustomizados(pedidos: PedidoBanco[]): SugestaoItemCustom[] {
  const mapaSugestoes: Record<string, SugestaoItemCustom> = {};
  const statusMap = obterStatusSugestoes();
  const novosItensCatalogo = obterNovosItensCatalogo();
  const nomesNovosNoCatalogo = new Set(novosItensCatalogo.map((n) => n.nome.trim().toLowerCase()));

  pedidos.forEach((p) => {
    (p.itens || []).forEach((itemObj: any) => {
      const nomeItem = (itemObj.item || itemObj.nome || '').trim();
      if (!nomeItem) return;

      const chaveNome = nomeItem.toLowerCase();

      // Checa se é um item customizado:
      // 1. itemObj.is_custom === true OU
      // 2. id começa com 'custom-' OU
      // 3. O nome não existe no catalogo.json original
      const isCustomFlag = Boolean(
        itemObj.is_custom ||
        (itemObj.item_id && String(itemObj.item_id).startsWith('custom-'))
      );
      const isForaDoCatalogoOriginal = !nomesCatalogoOriginal.has(chaveNome);

      if (isCustomFlag || isForaDoCatalogoOriginal) {
        if (!mapaSugestoes[chaveNome]) {
          // Determina status inicial
          let statusInicial: 'pendente' | 'adicionado' | 'descartado' = 'pendente';
          if (nomesNovosNoCatalogo.has(chaveNome)) {
            statusInicial = 'adicionado';
          } else if (statusMap[chaveNome]) {
            statusInicial = statusMap[chaveNome];
          }

          mapaSugestoes[chaveNome] = {
            id: 'sugestao-' + chaveNome.replace(/[^a-z0-9]/g, '-'),
            nome: nomeItem,
            fornecedor: itemObj.fornecedor || 'mercado',
            categoria: itemObj.categoria || 'Geral',
            unidade: itemObj.unidade || 'un',
            observacoes: [],
            pedidos: [],
            total_pedidos: 0,
            total_quantidade: 0,
            status: statusInicial,
            primeira_vez_pedido: p.finalizado_em,
            ultima_vez_pedido: p.finalizado_em
          };
        }

        const sug = mapaSugestoes[chaveNome];
        const qtd = Number(itemObj.quantidade) || 1;
        sug.total_quantidade += qtd;
        sug.total_pedidos += 1;

        if (itemObj.observacao && itemObj.observacao.trim()) {
          const obs = itemObj.observacao.trim();
          if (!sug.observacoes.includes(obs)) {
            sug.observacoes.push(obs);
          }
        }

        sug.pedidos.push({
          pedido_id: p.id,
          pedido_numero: p.numero,
          cozinheira: p.cozinheira || 'Cozinheira',
          estadia_casa: p.estadia?.casa || 'Estadia',
          estadia_id: p.estadia_id,
          finalizado_em: p.finalizado_em,
          quantidade: qtd,
          observacao: itemObj.observacao
        });

        if (p.finalizado_em > sug.ultima_vez_pedido) {
          sug.ultima_vez_pedido = p.finalizado_em;
        }
        if (p.finalizado_em < sug.primeira_vez_pedido) {
          sug.primeira_vez_pedido = p.finalizado_em;
        }
      }
    });
  });

  // Ordena: primeiro pendentes com mais pedidos e datas recentes
  return Object.values(mapaSugestoes).sort((a, b) => {
    if (a.status === 'pendente' && b.status !== 'pendente') return -1;
    if (b.status === 'pendente' && a.status !== 'pendente') return 1;
    if (b.total_pedidos !== a.total_pedidos) return b.total_pedidos - a.total_pedidos;
    return b.ultima_vez_pedido.localeCompare(a.ultima_vez_pedido);
  });
}
