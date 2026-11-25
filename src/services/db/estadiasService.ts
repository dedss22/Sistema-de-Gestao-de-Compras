import { isSupabaseConfigured, sanitizarTermoPostgrest, supabase } from './client';
import { obterAutorAtual } from './authService';
import { registrarLogAuditoria } from './auditoriaService';
import {
  gerarCodigoLocal,
  obterEstadiasLocais,
  obterLixeiraLocal,
  obterLogsAuditoriaLocais,
  obterPedidosLocais,
  parseMoedaBRL,
  removerDaLixeiraLocal,
  salvarEstadiasLocais,
  salvarNaLixeiraLocal,
  salvarPedidosLocais
} from './localStore';
import { salvarMidiaIndexedDB } from '../anexoStorage';
import {
  desidratarAdiantamentosParaBanco,
  hidratarEstadiasComStorage,
  prepararAdiantamentoParaStorage,
  removerMidiaAdiantamentoStorage
} from '../supabaseStorage';
import type {
  AdiantamentoEstadia,
  DadosAdicionarAdiantamento,
  DadosCriarEstadia,
  Estadia,
  LogAuditoria
} from './types';

function validarDataEstadia(dataStr: unknown, nomeCampo: string): number {
  if (typeof dataStr !== 'string' || !dataStr.trim()) {
    throw new Error(`Informe uma data válida para ${nomeCampo}.`);
  }
  const limpa = dataStr.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(limpa)) {
    const [ano, mes, dia] = limpa.split('-').map(Number);
    const utc = new Date(Date.UTC(ano, mes - 1, dia));
    if (
      utc.getUTCFullYear() !== ano ||
      utc.getUTCMonth() !== mes - 1 ||
      utc.getUTCDate() !== dia
    ) {
      throw new Error(`Data inválida para ${nomeCampo}.`);
    }
    return utc.getTime();
  }

  const ts = Date.parse(limpa);
  if (Number.isNaN(ts)) {
    throw new Error(`Data inválida para ${nomeCampo}.`);
  }
  return ts;
}

function validarPeriodoEstadia(entrada: unknown, saida: unknown): void {
  const tsEntrada = validarDataEstadia(entrada, 'entrada');
  const tsSaida = validarDataEstadia(saida, 'saída');
  if (tsSaida < tsEntrada) {
    throw new Error('A data de saída deve ser igual ou posterior à data de entrada.');
  }
}

/**
 * Lista estadias com contagem de pedidos e filtros opcionais
 */
export async function listarEstadias({
  status = 'todas',
  busca = ''
}: { status?: string; busca?: string } = {}): Promise<Estadia[]> {
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
      const termoSeguro = sanitizarTermoPostgrest(busca);
      if (termoSeguro) {
        query = query.or(`casa.ilike.%${termoSeguro}%,titular.ilike.%${termoSeguro}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    type EstadiaComCount = Estadia & { pedidos?: Array<{ count?: number }> };
    const estadiasMapeadas = ((data as EstadiaComCount[]) || []).map((estadia) => ({
      ...estadia,
      adiantamentos: estadia.adiantamentos || [],
      total_pedidos: estadia.pedidos?.[0]?.count ?? 0
    }));

    return hidratarEstadiasComStorage(supabase, estadiasMapeadas);
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
export async function criarEstadia({
  casa,
  entrada,
  saida,
  hospedes,
  titular,
  funcionario
}: DadosCriarEstadia): Promise<Estadia> {
  const casaLimpa = (casa || '').trim();
  const titularLimpo = (titular || '').trim();
  const funcionarioLimpo = (funcionario || '').trim();
  const hospedesNum = Number(hospedes);

  if (!casaLimpa) throw new Error('Informe o nome da casa.');
  if (!titularLimpo) throw new Error('Informe o nome do titular.');
  if (!funcionarioLimpo) throw new Error('Informe o responsável da equipe.');
  if (!Number.isFinite(hospedesNum) || hospedesNum < 1) {
    throw new Error('O número de hóspedes deve ser no mínimo 1.');
  }
  validarPeriodoEstadia(entrada, saida);

  const { autorNome, autorLogin } = await obterAutorAtual(funcionarioLimpo || 'Equipe');

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('estadias')
      .insert([
        {
          casa: casaLimpa,
          entrada,
          saida,
          hospedes: hospedesNum,
          titular: titularLimpo,
          funcionario: funcionarioLimpo,
          status: 'ativa',
          criada_por_nome: autorNome,
          criada_por_login: autorLogin
        }
      ])
      .select()
      .single();

    if (error) throw error;

    const estadiaCriada = data as Estadia;
    await registrarLogAuditoria({
      tipo_acao: 'CRIAR_ESTADIA',
      titulo: 'Estadia Criada',
      descricao: `${autorNome} cadastrou a estadia "${casaLimpa}" (${hospedesNum} hóspedes, titular: ${titularLimpo}).`,
      estadia_id: estadiaCriada?.id,
      estadia_casa: casaLimpa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return estadiaCriada;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const nova: Estadia = {
    id: 'estadia-' + Date.now(),
    codigo: gerarCodigoLocal(),
    casa: casaLimpa,
    entrada,
    saida,
    hospedes: hospedesNum,
    titular: titularLimpo,
    funcionario: funcionarioLimpo,
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
    descricao: `${autorNome} cadastrou a estadia "${casaLimpa}" (${hospedesNum} hóspedes, titular: ${titularLimpo}).`,
    estadia_id: nova.id,
    estadia_casa: casaLimpa,
    usuario_nome: autorNome,
    usuario_login: autorLogin
  });

  return nova;
}

/**
 * Atualiza dados de uma estadia existente
 */
export async function atualizarEstadia(id: string, dados: Partial<Estadia>): Promise<Estadia> {
  if (dados.hospedes !== undefined) {
    const hospedesNum = Number(dados.hospedes);
    if (!Number.isFinite(hospedesNum) || hospedesNum < 1) {
      throw new Error('O número de hóspedes deve ser no mínimo 1.');
    }
  }
  if (dados.entrada !== undefined) {
    validarDataEstadia(dados.entrada, 'entrada');
  }
  if (dados.saida !== undefined) {
    validarDataEstadia(dados.saida, 'saída');
  }
  if (dados.entrada !== undefined && dados.saida !== undefined) {
    validarPeriodoEstadia(dados.entrada, dados.saida);
  }

  const { autorNome, autorLogin } = await obterAutorAtual();

  if (isSupabaseConfigured()) {
    if ((dados.entrada !== undefined) !== (dados.saida !== undefined)) {
      const { data: atual, error: fetchErr } = await supabase
        .from('estadias')
        .select('entrada, saida')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      const entradaFinal = dados.entrada ?? (atual as Pick<Estadia, 'entrada' | 'saida'>).entrada;
      const saidaFinal = dados.saida ?? (atual as Pick<Estadia, 'entrada' | 'saida'>).saida;
      validarPeriodoEstadia(entradaFinal, saidaFinal);
    }

    const updateData: Partial<Estadia> = {
      ...dados,
      atualizada_por_nome: autorNome,
      atualizada_por_login: autorLogin,
      atualizada_em: new Date().toISOString()
    };
    if (updateData.hospedes !== undefined) updateData.hospedes = Number(updateData.hospedes);
    if (updateData.casa !== undefined) updateData.casa = updateData.casa.trim();
    if (updateData.titular !== undefined) updateData.titular = updateData.titular.trim();
    if (updateData.funcionario !== undefined) updateData.funcionario = updateData.funcionario.trim();

    const { data, error } = await supabase
      .from('estadias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const estadiaAtualizada = data as Estadia;
    await registrarLogAuditoria({
      tipo_acao: 'EDITAR_ESTADIA',
      titulo: 'Estadia Atualizada',
      descricao: `${autorNome} alterou os dados da estadia "${estadiaAtualizada?.casa || 'Estadia'}".`,
      estadia_id: id,
      estadia_casa: estadiaAtualizada?.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    return estadiaAtualizada;
  }

  // Modo Localhost
  const estadias = obterEstadiasLocais();
  const idx = estadias.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Estadia não encontrada.');

  const entradaFinal = dados.entrada ?? estadias[idx].entrada;
  const saidaFinal = dados.saida ?? estadias[idx].saida;
  validarPeriodoEstadia(entradaFinal, saidaFinal);

  const casaNome = dados.casa?.trim() || estadias[idx].casa;

  estadias[idx] = {
    ...estadias[idx],
    ...dados,
    casa: casaNome,
    titular: dados.titular !== undefined ? dados.titular.trim() : estadias[idx].titular,
    funcionario: dados.funcionario !== undefined ? dados.funcionario.trim() : estadias[idx].funcionario,
    hospedes: dados.hospedes !== undefined ? Number(dados.hospedes) : estadias[idx].hospedes,
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
export async function alterarStatusEstadia(
  id: string,
  novoStatus: 'ativa' | 'finalizada' | 'arquivada'
): Promise<Estadia> {
  const { autorNome, autorLogin } = await obterAutorAtual();

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
export async function excluirEstadia(id: string): Promise<boolean> {
  const { autorNome, autorLogin } = await obterAutorAtual();

  const todas = obterEstadiasLocais();
  const estadiaParaExcluir = todas.find((e) => e.id === id);
  const casaNome = estadiaParaExcluir?.casa || 'Estadia';
  const pedidosDestaEstadia = obterPedidosLocais().filter((p) => p.estadia_id === id);

  // Salvar backup na lixeira local para recuperação garantida
  salvarNaLixeiraLocal({
    id,
    estadia: estadiaParaExcluir,
    pedidos: pedidosDestaEstadia,
    excluido_em: new Date().toISOString(),
    excluido_por_nome: autorNome
  });

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('estadias').delete().eq('id', id);
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
export async function recuperarEstadia(
  estadiaId: string,
  logRef: Partial<LogAuditoria> | null = null
): Promise<Estadia> {
  const { autorNome, autorLogin } = await obterAutorAtual();

  // 1. Tentar buscar da lixeira
  const lixeira = obterLixeiraLocal();
  const itemLixeira = lixeira.find((item) => item.id === estadiaId || item.estadia?.id === estadiaId);

  // 2. Se não achar na lixeira, buscar nos logs locais
  const logs = obterLogsAuditoriaLocais();
  const logExclusao =
    logRef ||
    logs.find((l) => l.tipo_acao === 'EXCLUIR_ESTADIA' && l.estadia_id === estadiaId);

  const backup = logExclusao?.dados_backup as
    | { estadia?: Estadia; pedidos?: ReturnType<typeof obterPedidosLocais> }
    | null
    | undefined;

  let estadiaParaRestaurar = itemLixeira?.estadia || backup?.estadia;
  const pedidosParaRestaurar = itemLixeira?.pedidos || backup?.pedidos || [];

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
      id: estadiaId || 'estadia-' + Date.now(),
      codigo: gerarCodigoLocal(),
      casa: casaNomeLog,
      titular: titularEncontrado,
      funcionario: responsavelEncontrado,
      hospedes: hospedesEncontrado,
      entrada: hoje.toISOString().split('T')[0],
      saida: saidaPadrao.toISOString().split('T')[0],
      status: 'ativa',
      criada_por_nome: autorNome,
      criada_em: new Date().toISOString(),
      atualizada_em: new Date().toISOString()
    };
  }

  const estadiaFinal: Estadia = {
    ...estadiaParaRestaurar,
    status: 'ativa',
    reativada_por_nome: autorNome,
    reativada_em: new Date().toISOString(),
    atualizada_em: new Date().toISOString()
  };

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('estadias').upsert([estadiaFinal]);

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
export async function adicionarAdiantamentoEstadia(
  estadiaId: string,
  {
    valor,
    data,
    forma_pagamento,
    observacao,
    comprovante_url,
    comprovante_nome,
    comprovante_tipo,
    comprovante_tamanho,
    quem_pagou,
    quem_pagou_nome
  }: DadosAdicionarAdiantamento
): Promise<Estadia> {
  const { autorNome, autorLogin } = await obterAutorAtual();

  const valorNum = parseMoedaBRL(valor);
  if (Number.isNaN(valorNum) || valorNum === 0) {
    throw new Error('Informe um valor de saldo válido e diferente de zero.');
  }

  const isDebito = valorNum < 0;
  const valorAbs = Math.abs(valorNum);
  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAbs);

  const novoAdiantamento: AdiantamentoEstadia = {
    id: 'adt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    valor: valorNum,
    data: data || new Date().toISOString().slice(0, 10),
    forma_pagamento: (forma_pagamento || 'PIX').trim(),
    observacao: observacao ? observacao.trim() : '',
    comprovante_url: comprovante_url || '',
    comprovante_nome: comprovante_nome || (isDebito ? 'Saldo do Cliente Utilizado' : ''),
    comprovante_tipo:
      comprovante_tipo || (comprovante_url && comprovante_url.startsWith('data:application/pdf') ? 'pdf' : 'imagem'),
    comprovante_tamanho: comprovante_tamanho || (isDebito ? 'Saldo em Conta' : ''),
    quem_pagou: quem_pagou || 'hospede',
    quem_pagou_nome: quem_pagou_nome ? quem_pagou_nome.trim() : '',
    registrado_por_nome: autorNome,
    registrado_por_login: autorLogin,
    registrado_em: new Date().toISOString()
  };

  if (
    novoAdiantamento.comprovante_url &&
    (novoAdiantamento.comprovante_url.startsWith('data:') || novoAdiantamento.comprovante_url.startsWith('blob:'))
  ) {
    await salvarMidiaIndexedDB(novoAdiantamento.id, novoAdiantamento.comprovante_url);
  }

  const pagadorTexto =
    novoAdiantamento.quem_pagou === 'hospede'
      ? `Hóspede${novoAdiantamento.quem_pagou_nome ? ` (${novoAdiantamento.quem_pagou_nome})` : ''}`
      : `Outra pessoa (${novoAdiantamento.quem_pagou_nome || 'Não especificado'})`;

  if (isSupabaseConfigured()) {
    const { paraMemoria: adiantamentoMemoria } = await prepararAdiantamentoParaStorage(
      supabase,
      estadiaId,
      novoAdiantamento
    );

    const { data: estAtual, error: fetchErr } = await supabase
      .from('estadias')
      .select('*')
      .eq('id', estadiaId)
      .single();

    if (fetchErr) throw fetchErr;

    const estAtualTyped = estAtual as Estadia;
    const listaAdiantamentos = Array.isArray(estAtualTyped.adiantamentos) ? [...estAtualTyped.adiantamentos] : [];
    listaAdiantamentos.push(adiantamentoMemoria);

    const { data: estAtualizada, error: updateErr } = await supabase
      .from('estadias')
      .update({
        adiantamentos: desidratarAdiantamentosParaBanco(listaAdiantamentos),
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
        ? `${autorNome} debitou ${valorFormatado} do saldo do cliente para a estadia "${estAtualTyped.casa}". ${observacao ? `Obs: ${observacao}` : ''}`
        : `${autorNome} recebeu pagamento de ${valorFormatado} (${novoAdiantamento.forma_pagamento}) de ${pagadorTexto} para a estadia "${estAtualTyped.casa}".`,
      estadia_id: estadiaId,
      estadia_casa: estAtualTyped.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    const [estadiaHidratada] = await hidratarEstadiasComStorage(supabase, [estAtualizada as Estadia]);
    return estadiaHidratada || (estAtualizada as Estadia);
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
export async function removerAdiantamentoEstadia(estadiaId: string, adiantamentoId: string): Promise<Estadia> {
  const { autorNome, autorLogin } = await obterAutorAtual();

  if (isSupabaseConfigured()) {
    const { data: estAtual, error: fetchErr } = await supabase
      .from('estadias')
      .select('*')
      .eq('id', estadiaId)
      .single();

    if (fetchErr) throw fetchErr;

    const estAtualTyped = estAtual as Estadia;
    const itemRemovido = (estAtualTyped.adiantamentos || []).find((a) => a.id === adiantamentoId);
    const listaAdiantamentos = (estAtualTyped.adiantamentos || []).filter((a) => a.id !== adiantamentoId);

    if (itemRemovido) {
      await removerMidiaAdiantamentoStorage(supabase, itemRemovido);
    }

    const { data: estAtualizada, error: updateErr } = await supabase
      .from('estadias')
      .update({
        adiantamentos: desidratarAdiantamentosParaBanco(listaAdiantamentos),
        atualizada_em: new Date().toISOString()
      })
      .eq('id', estadiaId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const valorRemovidoStr = itemRemovido
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemRemovido.valor)
      : '';

    await registrarLogAuditoria({
      tipo_acao: 'FINANCEIRO_EXCLUIR_ADIANTAMENTO',
      titulo: 'Pagamento / Saldo Removido',
      descricao: `${autorNome} removeu o registro de pagamento de ${valorRemovidoStr} da estadia "${estAtualTyped.casa}".`,
      estadia_id: estadiaId,
      estadia_casa: estAtualTyped.casa,
      usuario_nome: autorNome,
      usuario_login: autorLogin
    });

    const [estadiaHidratada] = await hidratarEstadiasComStorage(supabase, [estAtualizada as Estadia]);
    return estadiaHidratada || (estAtualizada as Estadia);
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

  const valorRemovidoStr = itemRemovido
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemRemovido.valor)
    : '';

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
