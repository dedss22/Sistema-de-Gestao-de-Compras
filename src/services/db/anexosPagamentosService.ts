import { removerMidiaIndexedDB, salvarMidiaIndexedDB } from '../anexoStorage';
import {
  type AnexoStorageLike,
  desidratarAnexosParaBanco,
  prepararAnexoParaStorage,
  prepararPagamentoParaStorage,
  removerMidiasAnexoStorage
} from '../supabaseStorage';
import { isSupabaseConfigured, supabase } from './client';
import { obterAutorAtual } from './authService';
import { registrarLogAuditoria } from './auditoriaService';
import { parseMoedaBRL, salvarPedidosLocais } from './localStore';
import { obterPedidoPorIdGeral } from './pedidosService';
import type {
  AnexoPedido,
  DadosRegistrarPagamentoNota,
  PagamentoNota,
  PedidoBanco
} from './types';

/**
 * Adiciona anexos (fotos de comprovantes, notas, produtos, PDFs) a um pedido
 */
export async function adicionarAnexosPedido(
  pedidoId: string,
  novosAnexos: Array<Partial<AnexoPedido> & { url: string }>
): Promise<PedidoBanco> {
  const { autorNome, autorLogin } = await obterAutorAtual();
  const agora = new Date().toISOString();

  const anexosFormatados: AnexoPedido[] = (novosAnexos || []).map((anexo) => {
    const valorNum = anexo.valor_total !== undefined ? parseMoedaBRL(anexo.valor_total) : 0;

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

  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');

  const anexosProntos = isSupabaseConfigured()
    ? await Promise.all(
        anexosFormatados.map(async (anexo) => {
          const { paraMemoria } = await prepararAnexoParaStorage(supabase, pedidoId, anexo);
          return paraMemoria;
        })
      )
    : anexosFormatados;

  ped.anexos = [...(ped.anexos || []), ...anexosProntos];

  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('pedidos')
        .update({ anexos: desidratarAnexosParaBanco(ped.anexos || []) })
        .eq('id', pedidoId);
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
export async function atualizarAnexoPedido(
  pedidoId: string,
  anexoId: string,
  dadosAtualizados: Partial<AnexoPedido>
): Promise<PedidoBanco> {
  if (
    dadosAtualizados.url &&
    (dadosAtualizados.url.startsWith('data:') || dadosAtualizados.url.startsWith('blob:'))
  ) {
    await salvarMidiaIndexedDB(anexoId, dadosAtualizados.url);
  }

  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');

  let anexoUrlAtualizada = dadosAtualizados.url;
  let anexoStoragePathAtualizado: string | undefined;
  if (
    isSupabaseConfigured() &&
    dadosAtualizados.url &&
    (dadosAtualizados.url.startsWith('data:') || dadosAtualizados.url.startsWith('blob:'))
  ) {
    const { paraMemoria } = await prepararAnexoParaStorage<AnexoStorageLike>(supabase, pedidoId, {
      id: anexoId,
      url: dadosAtualizados.url,
      nome: dadosAtualizados.nome
    });
    anexoUrlAtualizada = paraMemoria.url;
    anexoStoragePathAtualizado = paraMemoria.storage_path;
  }

  ped.anexos = (ped.anexos || []).map((a) => {
    if (a.id !== anexoId) return a;

    const valorNum =
      dadosAtualizados.valor_total !== undefined
        ? parseMoedaBRL(dadosAtualizados.valor_total)
        : a.valor_total || 0;

    return {
      ...a,
      url: anexoUrlAtualizada || a.url,
      ...(anexoStoragePathAtualizado ? { storage_path: anexoStoragePathAtualizado } : {}),
      fornecedor:
        dadosAtualizados.fornecedor !== undefined ? dadosAtualizados.fornecedor.trim() : a.fornecedor || 'Geral',
      valor_total: valorNum,
      quem_pagou: dadosAtualizados.quem_pagou !== undefined ? dadosAtualizados.quem_pagou : a.quem_pagou || 'hospede',
      quem_pagou_outro:
        dadosAtualizados.quem_pagou_outro !== undefined
          ? dadosAtualizados.quem_pagou_outro.trim()
          : a.quem_pagou_outro || '',
      data_comprovante: dadosAtualizados.data_comprovante || a.data_comprovante
    };
  });

  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('pedidos')
        .update({ anexos: desidratarAnexosParaBanco(ped.anexos || []) })
        .eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  return ped;
}

/**
 * Remove um anexo de um pedido
 */
export async function removerAnexoPedido(pedidoId: string, anexoId: string): Promise<PedidoBanco> {
  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');

  const anexoRemovido = (ped.anexos || []).find((a) => a.id === anexoId);
  ped.anexos = (ped.anexos || []).filter((a) => a.id !== anexoId);

  await removerMidiaIndexedDB(anexoId);
  if (isSupabaseConfigured() && anexoRemovido) {
    await removerMidiasAnexoStorage(supabase, anexoRemovido);
  }
  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('pedidos')
        .update({ anexos: desidratarAnexosParaBanco(ped.anexos || []) })
        .eq('id', pedidoId);
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
export async function registrarPagamentoNotaPedido(
  pedidoId: string,
  anexoId: string,
  dados: DadosRegistrarPagamentoNota
): Promise<{ pedidoAtualizado: PedidoBanco; anexoAtualizado: AnexoPedido }> {
  const { autorNome, autorLogin } = await obterAutorAtual();
  const agora = new Date().toISOString();

  const valorNum = parseMoedaBRL(dados.valor);

  if (valorNum <= 0) {
    throw new Error('Informe um valor de pagamento válido e positivo.');
  }

  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');

  const anexoIdx = (ped.anexos || []).findIndex((a) => a.id === anexoId);
  if (anexoIdx === -1) throw new Error('Nota fiscal / anexo não encontrado.');

  const anexo = ped.anexos![anexoIdx];
  const valorTotalNota = Number(anexo.valor_total) || 0;
  const pagamentoId = 'pgt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  // Salva comprovante no IndexedDB se houver
  if (
    dados.comprovante_url &&
    (dados.comprovante_url.startsWith('data:') || dados.comprovante_url.startsWith('blob:'))
  ) {
    await salvarMidiaIndexedDB(pagamentoId, dados.comprovante_url);
  }

  const pagadorNome =
    dados.quem_pagou === 'hospede'
      ? dados.quem_pagou_nome || 'Hóspede'
      : dados.quem_pagou_outro
        ? dados.quem_pagou_outro.trim()
        : 'Outro terceiro';

  const novoPagamentoBase: PagamentoNota = {
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

  const novoPagamento = isSupabaseConfigured()
    ? (await prepararPagamentoParaStorage(supabase, pedidoId, novoPagamentoBase)).paraMemoria
    : novoPagamentoBase;

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

  ped.anexos![anexoIdx] = anexo;
  salvarPedidosLocais(pedidos);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('pedidos')
        .update({ anexos: desidratarAnexosParaBanco(ped.anexos || []) })
        .eq('id', pedidoId);
    } catch (err) {
      console.warn('Supabase attachments update warning:', err);
    }
  }

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const superavit = Math.max(0, (Number(anexo.valor_pago) || 0) - valorTotalNota);

  await registrarLogAuditoria({
    tipo_acao: 'PAGAMENTO_NOTA_RECEBIDO',
    titulo: `Pagamento Recebido na Nota (${anexo.fornecedor || 'Fornecedor'})`,
    descricao: `${autorNome} registrou recebimento de ${formatarMoeda(valorNum)} na Nota #${anexoIdx + 1} (${anexo.fornecedor || 'Nota'}) do Pedido #${ped.numero}. Pagador: ${pagadorNome}.${superavit > 0 ? ` Quitação da nota + Superávit de ${formatarMoeda(superavit)} a favor do cliente.` : (anexo.valor_restante || 0) > 0 ? ` Restante a pagar: ${formatarMoeda(anexo.valor_restante || 0)}.` : ' Nota 100% quitada.'}`,
    estadia_id: ped.estadia_id,
    estadia_casa: ped.estadia?.casa || 'Estadia',
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return { pedidoAtualizado: ped, anexoAtualizado: anexo };
}
