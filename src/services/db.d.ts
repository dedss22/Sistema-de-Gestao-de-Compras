export interface Estadia {
  id: string;
  codigo: string;
  casa: string;
  entrada: string;
  saida: string;
  hospedes: number;
  titular: string;
  funcionario: string;
  status: 'ativa' | 'finalizada' | 'arquivada';
  criada_por_nome?: string;
  criada_por_login?: string;
  finalizada_por_nome?: string;
  finalizada_por_login?: string;
  finalizada_em?: string;
  arquivada_por_nome?: string;
  arquivada_por_login?: string;
  arquivada_em?: string;
  reativada_por_nome?: string;
  reativada_em?: string;
  adiantamentos?: AdiantamentoEstadia[];
  criada_em: string;
  atualizada_em: string;
  total_pedidos?: number;
}

export interface AdiantamentoEstadia {
  id: string;
  valor: number;
  data: string;
  forma_pagamento: string;
  observacao?: string;
  comprovante_url?: string;
  comprovante_nome?: string;
  comprovante_tipo?: 'imagem' | 'pdf';
  comprovante_tamanho?: string;
  quem_pagou?: 'hospede' | 'outra_pessoa';
  quem_pagou_nome?: string;
  registrado_por_nome: string;
  registrado_por_login?: string;
  registrado_em: string;
}

export interface EstadiaPublica {
  status: 'ativa' | 'finalizada' | 'arquivada';
  casa?: string;
  entrada?: string;
  saida?: string;
  hospedes?: number;
  total_pedidos?: number;
}

export type StatusPedido = 'em_aprovacao' | 'enviar_fornecedores' | 'preparacao_entrega' | 'finalizado' | 'rejeitado';

export interface PagamentoNota {
  id: string;
  valor: number;
  data: string;
  quem_pagou: 'hospede' | 'outra_pessoa';
  quem_pagou_nome?: string;
  forma_pagamento?: string;
  observacao?: string;
  comprovante_url?: string;
  comprovante_nome?: string;
  comprovante_tipo?: 'imagem' | 'pdf';
  comprovante_tamanho?: string;
  registrado_em: string;
  registrado_por_nome?: string;
}

export interface AnexoPedido {
  id: string;
  nome: string;
  tipo: 'imagem' | 'pdf';
  tamanho: string;
  url: string;
  anexado_por_nome: string;
  anexado_por_login?: string;
  anexado_em: string;
  fornecedor?: string;
  valor_total?: number;
  quem_pagou?: 'hospede' | 'outra_pessoa';
  quem_pagou_outro?: string;
  data_comprovante?: string;
  valor_pago?: number;
  valor_restante?: number;
  status_pagamento?: 'pendente' | 'parcial' | 'pago';
  pagamentos?: PagamentoNota[];
}

export interface PedidoBanco {
  id: string;
  estadia_id: string;
  numero: number;
  cozinheira: string;
  finalizado_em: string;
  status: StatusPedido;
  aprovado_por_nome?: string;
  aprovado_por_login?: string;
  aprovado_em?: string;
  rejeitado_por_nome?: string;
  rejeitado_por_login?: string;
  rejeitado_em?: string;
  reaberto_por_nome?: string;
  reaberto_por_login?: string;
  reaberto_em?: string;
  enviado_fornecedor_por_nome?: string;
  enviado_fornecedor_por_login?: string;
  enviado_fornecedor_em?: string;
  concluido_por_nome?: string;
  concluido_por_login?: string;
  concluido_em?: string;
  editado_por_nome?: string;
  editado_por_login?: string;
  editado_em?: string;
  historico_edicoes?: Array<{
    data: string;
    autor_nome: string;
    autor_login?: string;
    motivo?: string;
    alteracoes: string[];
    resumo?: string;
  }>;
  anexos?: AnexoPedido[];
  itens: Array<{
    fornecedor: string;
    categoria: string;
    item: string;
    quantidade: number;
    unidade: string;
    observacao?: string;
    aceitaSubstituto: boolean;
  }>;
  estadia?: Partial<Estadia>;
}

export interface LogAuditoria {
  id: string;
  tipo_acao: string;
  titulo: string;
  descricao: string;
  estadia_id?: string | null;
  estadia_casa?: string | null;
  usuario_nome: string;
  usuario_login: string;
  criado_em: string;
  dados_backup?: any;
  alteracoes?: string[];
}

export interface UsuarioEquipe {
  nome: string;
  login: string;
  email: string;
  senha: string;
  cargo: string;
}

export declare const USUARIOS_EQUIPE: UsuarioEquipe[];

export declare const isSupabaseConfigured: () => boolean;
export declare const supabase: any;

export declare function loginEquipe(identificador: string, password: string): Promise<any>;
export declare function logoutEquipe(): Promise<void>;
export declare function getSessaoAtual(): Promise<any>;
export declare function getUsuarioAtual(): Promise<any>;
export declare function onMudancaAuth(callback: (event: string, session: any) => void): any;

export declare function registrarLogAuditoria(dados: {
  tipo_acao: string;
  titulo: string;
  descricao: string;
  estadia_id?: string | null;
  estadia_casa?: string | null;
  usuario_nome?: string | null;
  usuario_login?: string | null;
}): Promise<LogAuditoria>;

export declare function listarLogsAuditoria(filtros?: {
  limite?: number;
  busca?: string;
  tipo?: string;
}): Promise<LogAuditoria[]>;

export declare function listarEstadias(filtros?: { status?: string; busca?: string }): Promise<Estadia[]>;
export declare function criarEstadia(dados: {
  casa: string;
  entrada: string;
  saida: string;
  hospedes: number;
  titular: string;
  funcionario: string;
}): Promise<Estadia>;
export declare function atualizarEstadia(id: string, dados: Partial<Estadia>): Promise<Estadia>;
export declare function alterarStatusEstadia(id: string, novoStatus: 'ativa' | 'finalizada' | 'arquivada'): Promise<Estadia>;
export declare function excluirEstadia(id: string): Promise<boolean>;
export declare function recuperarEstadia(estadiaId: string, logRef?: any): Promise<Estadia>;
export declare function adicionarAdiantamentoEstadia(
  estadiaId: string,
  dados: {
    valor: number | string;
    data: string;
    forma_pagamento?: string;
    observacao?: string;
    comprovante_url?: string;
    comprovante_nome?: string;
    comprovante_tipo?: 'imagem' | 'pdf';
    comprovante_tamanho?: string;
    quem_pagou?: 'hospede' | 'outra_pessoa';
    quem_pagou_nome?: string;
  }
): Promise<Estadia>;
export declare function removerAdiantamentoEstadia(estadiaId: string, adiantamentoId: string): Promise<Estadia>;

export declare function obterEstadiaPorCodigo(codigo: string): Promise<EstadiaPublica | null>;
export declare function criarPedido(dados: {
  codigo: string;
  cozinheira: string;
  itens: Array<{
    fornecedor: string;
    categoria: string;
    item: string;
    quantidade: number;
    unidade: string;
    observacao?: string;
    aceitaSubstituto: boolean;
  }>;
}): Promise<{ numero: number; finalizado_em: string }>;

export declare function listarPedidosPorEstadia(estadiaId: string): Promise<PedidoBanco[]>;
export declare function listarTodosPedidos(): Promise<PedidoBanco[]>;
export declare function alterarStatusPedido(pedidoId: string, novoStatus: StatusPedido): Promise<PedidoBanco>;
export declare function calcularDiferencasItensPedido(itensAnteriores?: any[], novosItens?: any[]): { alteracoes: string[]; alteracoesDetalhadas: any[] };
export declare function editarItensPedido(pedidoId: string, novosItens: any[], motivo?: string): Promise<PedidoBanco>;
export declare function adicionarAnexosPedido(pedidoId: string, novosAnexos: Array<Partial<AnexoPedido> & { url: string }>): Promise<PedidoBanco>;
export declare function atualizarAnexoPedido(pedidoId: string, anexoId: string, dadosAtualizados: Partial<AnexoPedido>): Promise<PedidoBanco>;
export declare function removerAnexoPedido(pedidoId: string, anexoId: string): Promise<PedidoBanco>;
export declare function registrarPagamentoNotaPedido(
  pedidoId: string,
  anexoId: string,
  dados: {
    valor: number | string;
    data?: string;
    quem_pagou: 'hospede' | 'outra_pessoa';
    quem_pagou_nome?: string;
    quem_pagou_outro?: string;
    forma_pagamento?: string;
    observacao?: string;
    comprovante_url?: string;
    comprovante_nome?: string;
    comprovante_tipo?: 'imagem' | 'pdf';
    comprovante_tamanho?: string;
  }
): Promise<{ pedidoAtualizado: PedidoBanco; anexoAtualizado: AnexoPedido }>;
