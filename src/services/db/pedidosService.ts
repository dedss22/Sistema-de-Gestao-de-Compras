import { hidratarAnexosComMidia, obterPedidosIndexedDB } from '../anexoStorage';
import { hidratarPedidosComStorage } from '../supabaseStorage';
import { isSupabaseConfigured, supabase } from './client';
import { obterAutorAtual } from './authService';
import { registrarLogAuditoria } from './auditoriaService';
import {
  obterEstadiasLocais,
  obterPedidosLocais,
  salvarPedidosLocais,
  setCachePedidosMemoria
} from './localStore';
import type {
  DadosCriarPedido,
  EstadiaPublica,
  ItemDiferencaDetalhada,
  ItemPedidoBanco,
  PedidoBanco,
  ResultadoCriarPedido,
  ResultadoDiferencasItens,
  StatusPedido
} from './types';

function validarItensPedido(itens: unknown): ItemPedidoBanco[] {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('O pedido deve conter itens.');
  }
  if (itens.length > 300) {
    throw new Error('O pedido excede o limite máximo permitido de 300 itens.');
  }

  for (const rawItem of itens) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Todos os itens do pedido devem ser válidos.');
    }
    const item = rawItem as Partial<ItemPedidoBanco>;
    const nomeItem = String(item.item || item.nome || '').trim();
    if (!nomeItem) {
      throw new Error('Todos os itens do pedido devem informar o nome do item.');
    }
    const qtd = Number(item.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      throw new Error(`Quantidade inválida para o item "${nomeItem}".`);
    }
  }

  return itens as ItemPedidoBanco[];
}

/**
 * Obtém informações públicas da estadia para a cozinheira pelo código do link (/e/:codigo)
 */
export async function obterEstadiaPorCodigo(codigo: string): Promise<EstadiaPublica | null> {
  if (!codigo || !codigo.trim()) return null;
  const codigoLimpo = codigo.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('obter_estadia', {
      p_codigo: codigoLimpo
    });

    if (error) throw error;
    if (!data) return null;

    const estadiaRpc = data as EstadiaPublica;
    let totalPedidos: number;

    if (typeof estadiaRpc.total_pedidos === 'number') {
      totalPedidos = estadiaRpc.total_pedidos;
    } else {
      totalPedidos = 0;
      if (estadiaRpc.status === 'ativa') {
        try {
          let estadiaIdReal = estadiaRpc.id;
          if (!estadiaIdReal) {
            const { data: estData } = await supabase
              .from('estadias')
              .select('id')
              .eq('codigo', codigoLimpo)
              .maybeSingle();
            estadiaIdReal = (estData as { id?: string } | null)?.id;
          }

          if (estadiaIdReal) {
            const { count } = await supabase
              .from('pedidos')
              .select('*', { count: 'exact', head: true })
              .eq('estadia_id', estadiaIdReal);
            totalPedidos = count || 0;
          }
        } catch (countErr) {
          console.warn('Erro ao contar pedidos da estadia:', countErr);
        }
      }
    }

    return {
      ...estadiaRpc,
      total_pedidos: totalPedidos
    };
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const estadia = estadias.find((e) => e.codigo?.toLowerCase() === codigoLimpo);

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
export async function criarPedido({ codigo, cozinheira, itens }: DadosCriarPedido): Promise<ResultadoCriarPedido> {
  if (!codigo || !codigo.trim()) throw new Error('Código da estadia não informado.');
  const cozinheiraLimpa = (cozinheira || '').trim();
  if (cozinheiraLimpa.length < 2) throw new Error('Nome da cozinheira é obrigatório (mínimo 2 caracteres).');
  if (cozinheiraLimpa.length > 120) throw new Error('Nome da cozinheira excede o limite de 120 caracteres.');

  const itensValidados = validarItensPedido(itens);
  const codigoLimpo = codigo.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('criar_pedido', {
      p_codigo: codigoLimpo,
      p_cozinheira: cozinheiraLimpa,
      p_itens: itensValidados
    });

    if (error) throw error;

    const resultado = data as ResultadoCriarPedido;
    await registrarLogAuditoria({
      tipo_acao: 'PEDIDO_CRIADO',
      titulo: `Pedido #${resultado?.numero || 1} Criado (Em Aprovação)`,
      descricao: `Cozinheira ${cozinheiraLimpa} enviou o Pedido #${resultado?.numero || 1} com ${itensValidados.length} itens. Aguardando aprovação da equipe.`,
      estadia_id: resultado?.estadia_id,
      estadia_casa: resultado?.estadia_casa || codigoLimpo,
      usuario_nome: cozinheiraLimpa,
      usuario_login: 'cozinheira'
    });

    const itensCustomSupa = itensValidados.filter((i) => i.is_custom);
    if (itensCustomSupa.length > 0) {
      const nomes = itensCustomSupa.map((i) => i.item).join(', ');
      await registrarLogAuditoria({
        tipo_acao: 'ITEM_FORA_CARDAPIO',
        titulo: 'Item(ns) Fora do Cardápio Solicitado(s)',
        descricao: `Cozinheira ${cozinheiraLimpa} adicionou ${itensCustomSupa.length} item(ns) fora do menu no Pedido #${resultado?.numero || 1}: ${nomes}.`,
        estadia_id: resultado?.estadia_id,
        estadia_casa: resultado?.estadia_casa || codigoLimpo,
        usuario_nome: cozinheiraLimpa,
        usuario_login: 'cozinheira'
      });
    }

    return resultado;
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

  const novoPedido: PedidoBanco = {
    id: 'pedido-' + Date.now(),
    estadia_id: estadia.id,
    numero: proximoNumero,
    cozinheira: cozinheiraLimpa,
    finalizado_em: finalizadoEm,
    status: 'em_aprovacao',
    anexos: [],
    itens: itensValidados,
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
    descricao: `Cozinheira ${cozinheiraLimpa} enviou o Pedido #${proximoNumero} da estadia "${estadia.casa}" com ${itensValidados.length} itens. Aguardando aprovação da equipe.`,
    estadia_id: estadia.id,
    estadia_casa: estadia.casa,
    usuario_nome: cozinheiraLimpa,
    usuario_login: 'cozinheira'
  });

  const itensCustomLocal = itensValidados.filter((i) => i.is_custom);
  if (itensCustomLocal.length > 0) {
    const nomes = itensCustomLocal.map((i) => i.item).join(', ');
    await registrarLogAuditoria({
      tipo_acao: 'ITEM_FORA_CARDAPIO',
      titulo: 'Item(ns) Fora do Cardápio Solicitado(s)',
      descricao: `Cozinheira ${cozinheiraLimpa} adicionou ${itensCustomLocal.length} item(ns) fora do menu no Pedido #${proximoNumero} da estadia "${estadia.casa}": ${nomes}.`,
      estadia_id: estadia.id,
      estadia_casa: estadia.casa,
      usuario_nome: cozinheiraLimpa,
      usuario_login: 'cozinheira'
    });
  }

  return {
    numero: proximoNumero,
    finalizado_em: finalizadoEm,
    status: 'em_aprovacao'
  };
}

/**
 * Obtém um pedido por ID tanto no cache local quanto no Supabase
 */
export async function obterPedidoPorIdGeral(
  pedidoId: string
): Promise<{ pedidos: PedidoBanco[]; idx: number; ped: PedidoBanco | null }> {
  const pedidos = obterPedidosLocais();
  const idx = pedidos.findIndex((p) => p.id === pedidoId);
  if (idx !== -1) {
    if (isSupabaseConfigured()) {
      const [hidratado] = await hidratarPedidosComStorage(supabase, [pedidos[idx]]);
      if (hidratado) pedidos[idx] = hidratado;
    }
    return { pedidos, idx, ped: pedidos[idx] };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(
          `
          *,
          estadia:estadias(id, casa, titular, funcionario, entrada, saida, hospedes, status)
        `
        )
        .eq('id', pedidoId)
        .maybeSingle();

      if (!error && data) {
        const pedRaw = data as PedidoBanco;
        const pedSupaBase: PedidoBanco = {
          ...pedRaw,
          status: pedRaw.status || 'em_aprovacao',
          anexos: pedRaw.anexos || []
        };
        const [pedSupa] = await hidratarPedidosComStorage(supabase, [pedSupaBase]);
        pedidos.unshift(pedSupa);
        salvarPedidosLocais(pedidos);
        return { pedidos, idx: 0, ped: pedSupa };
      }
    } catch (e) {
      console.warn('Erro ao buscar pedido por ID no Supabase:', e);
    }
  }

  return { pedidos, idx: -1, ped: null };
}

/**
 * Altera o status do pedido na esteira de compras com rastreabilidade completa
 * Status: 'em_aprovacao' | 'enviar_fornecedores' | 'preparacao_entrega' | 'finalizado' | 'rejeitado'
 */
export async function alterarStatusPedido(pedidoId: string, novoStatus: StatusPedido): Promise<PedidoBanco> {
  const { autorNome, autorLogin } = await obterAutorAtual();
  const agora = new Date().toISOString();

  // 1. Obter pedido (busca tanto no cache local quanto no Supabase)
  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');

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
export function calcularDiferencasItensPedido(
  itensAnteriores: ItemPedidoBanco[] = [],
  novosItens: ItemPedidoBanco[] = []
): ResultadoDiferencasItens {
  const alteracoes: string[] = [];
  const alteracoesDetalhadas: ItemDiferencaDetalhada[] = [];

  const norm = (str: unknown): string => String(str || '').trim().toLowerCase();

  const anteriores = Array.isArray(itensAnteriores) ? itensAnteriores : [];
  const novos = Array.isArray(novosItens) ? novosItens : [];

  const anterioresUsados = new Set<number>();
  const novosUsados = new Set<number>();

  function compararItem(ant: ItemPedidoBanco, novo: ItemPedidoBanco): void {
    const nome = (novo.item || novo.nome || ant.item || ant.nome || 'Item').trim();
    const mudancas: string[] = [];

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

    if (!Number.isNaN(qtdAnt) && !Number.isNaN(qtdNovo) && qtdAnt !== qtdNovo) {
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
export async function editarItensPedido(
  pedidoId: string,
  novosItens: ItemPedidoBanco[],
  motivo = ''
): Promise<PedidoBanco> {
  if (!Array.isArray(novosItens)) throw new Error('A lista de itens deve ser um array válido.');

  const { autorNome, autorLogin } = await obterAutorAtual();
  const agora = new Date().toISOString();

  // 1. Obter pedido atual para comparar itens anteriores (busca local ou no Supabase)
  const { pedidos, ped } = await obterPedidoPorIdGeral(pedidoId);
  if (!ped) throw new Error('Pedido não encontrado.');
  const casaNome = ped.estadia?.casa || 'Estadia';
  const itensAnteriores: ItemPedidoBanco[] = Array.isArray(ped.itens)
    ? (JSON.parse(JSON.stringify(ped.itens)) as ItemPedidoBanco[])
    : [];
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
    alteracoes,
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
      alteracoes,
      alteracoesDetalhadas,
      totalAnterior,
      totalNovo: novosItens.length,
      motivo
    }
  });

  return ped;
}

/**
 * Lista pedidos de uma estadia específica
 */
export async function listarPedidosPorEstadia(estadiaId: string): Promise<PedidoBanco[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, estadia:estadias(id, casa, titular, funcionario, entrada, saida, hospedes, status)')
      .eq('estadia_id', estadiaId)
      .order('numero', { ascending: false });

    if (error) throw error;
    const pedidosMapeados: PedidoBanco[] = ((data as PedidoBanco[]) || []).map((p) => ({
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || []
    }));
    const pedidos = await hidratarPedidosComStorage(supabase, pedidosMapeados);

    const locais = obterPedidosLocais();
    pedidos.forEach((p) => {
      const idx = locais.findIndex((l) => l.id === p.id);
      if (idx !== -1) locais[idx] = p;
      else locais.unshift(p);
    });
    salvarPedidosLocais(locais);

    return pedidos;
  }

  // Modo Localhost
  let pedidos = obterPedidosLocais();
  if (!pedidos || pedidos.length === 0) {
    const backupIDB = await obterPedidosIndexedDB();
    if (backupIDB && backupIDB.length > 0) {
      pedidos = backupIDB;
      setCachePedidosMemoria(pedidos);
    }
  }

  const pedidosHidratados = await hidratarAnexosComMidia(pedidos);
  setCachePedidosMemoria(pedidosHidratados);

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
export async function listarTodosPedidos(): Promise<PedidoBanco[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('pedidos')
      .select(
        `
        *,
        estadia:estadias(id, casa, titular, funcionario, entrada, saida, hospedes, status)
      `
      )
      .order('finalizado_em', { ascending: false });

    if (error) throw error;
    const pedidosMapeados: PedidoBanco[] = ((data as PedidoBanco[]) || []).map((p) => ({
      ...p,
      status: p.status || 'em_aprovacao',
      anexos: p.anexos || []
    }));
    const pedidos = await hidratarPedidosComStorage(supabase, pedidosMapeados);

    salvarPedidosLocais(pedidos);
    return pedidos;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  let pedidos = obterPedidosLocais();
  if (!pedidos || pedidos.length === 0) {
    const backupIDB = await obterPedidosIndexedDB();
    if (backupIDB && backupIDB.length > 0) {
      pedidos = backupIDB;
      setCachePedidosMemoria(pedidos);
    }
  }

  const pedidosHidratados = await hidratarAnexosComMidia(pedidos);
  setCachePedidosMemoria(pedidosHidratados);

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
