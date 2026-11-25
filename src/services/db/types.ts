import type { AuthChangeEvent } from '@supabase/supabase-js';

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
  comprovante_storage_path?: string;
  registrado_por_nome: string;
  registrado_por_login?: string;
  registrado_em: string;
}

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
  atualizada_por_nome?: string;
  atualizada_por_login?: string;
  finalizada_por_nome?: string;
  finalizada_por_login?: string;
  finalizada_em?: string;
  arquivada_por_nome?: string;
  arquivada_por_login?: string;
  arquivada_em?: string;
  reativada_por_nome?: string;
  reativada_por_login?: string;
  reativada_em?: string;
  adiantamentos?: AdiantamentoEstadia[];
  criada_em: string;
  atualizada_em: string;
  total_pedidos?: number;
}

export interface EstadiaPublica {
  id?: string;
  status: 'ativa' | 'finalizada' | 'arquivada';
  casa?: string;
  entrada?: string;
  saida?: string;
  hospedes?: number;
  total_pedidos?: number;
}

export type StatusPedido =
  | 'em_aprovacao'
  | 'enviar_fornecedores'
  | 'preparacao_entrega'
  | 'finalizado'
  | 'rejeitado';

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
  comprovante_storage_path?: string;
  registrado_em: string;
  registrado_por_nome?: string;
  registrado_por_login?: string;
}

export interface AnexoPedido {
  id: string;
  nome: string;
  tipo: 'imagem' | 'pdf';
  tamanho: string;
  url: string;
  storage_path?: string;
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

export interface ItemPedidoBanco {
  id?: string;
  item_id?: string;
  fornecedor: string;
  categoria?: string;
  item: string;
  nome?: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
  aceitaSubstituto: boolean;
  is_custom?: boolean;
}

export interface HistoricoEdicaoPedido {
  data: string;
  autor_nome: string;
  autor_login?: string;
  motivo?: string;
  alteracoes: string[];
  resumo?: string;
}

export interface PedidoBanco {
  id: string;
  estadia_id: string;
  numero: number;
  cozinheira: string;
  finalizado_em: string;
  atualizado_em?: string;
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
  historico_edicoes?: HistoricoEdicaoPedido[];
  anexos?: AnexoPedido[];
  itens: ItemPedidoBanco[];
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
  dados_backup?: Record<string, unknown> | null;
  alteracoes?: string[];
}

export interface UsuarioEquipe {
  nome: string;
  login: string;
  email: string;
  senha: string;
  cargo: string;
}

export interface AuthUserMetadata {
  nome?: string;
  login?: string;
  cargo?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email?: string;
  login?: string;
  nome?: string;
  cargo?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: AuthUserMetadata;
  aud?: string;
  created_at?: string;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

export type SessaoAtiva = AuthSession;
export type UsuarioAtivo = AuthUser;
export type AuthChangeCallback = (event: AuthChangeEvent | string, session: SessaoAtiva | null) => void;

export interface AuthSubscription {
  unsubscribe: () => void;
}

export interface LixeiraItem {
  id: string;
  estadia?: Estadia;
  pedidos?: PedidoBanco[];
  excluido_em: string;
  excluido_por_nome?: string;
}

export interface ItemDiferencaDetalhada {
  tipo: 'alterado' | 'removido' | 'adicionado';
  item: string;
  mudancas?: string[];
  texto: string;
  antes: ItemPedidoBanco | null;
  depois: ItemPedidoBanco | null;
}

export interface ResultadoDiferencasItens {
  alteracoes: string[];
  alteracoesDetalhadas: ItemDiferencaDetalhada[];
}

export interface DadosRegistrarLogAuditoria {
  tipo_acao: string;
  titulo: string;
  descricao: string;
  estadia_id?: string | null;
  estadia_casa?: string | null;
  usuario_nome?: string | null;
  usuario_login?: string | null;
  dados_backup?: Record<string, unknown> | null;
}

export interface DadosCriarEstadia {
  casa: string;
  entrada: string;
  saida: string;
  hospedes: number;
  titular: string;
  funcionario: string;
}

export interface DadosAdicionarAdiantamento {
  valor: number | string;
  data?: string;
  forma_pagamento?: string;
  observacao?: string;
  comprovante_url?: string;
  comprovante_nome?: string;
  comprovante_tipo?: 'imagem' | 'pdf';
  comprovante_tamanho?: string;
  quem_pagou?: 'hospede' | 'outra_pessoa';
  quem_pagou_nome?: string;
}

export interface DadosCriarPedido {
  codigo: string;
  cozinheira: string;
  itens: ItemPedidoBanco[];
}

export interface ResultadoCriarPedido {
  numero: number;
  finalizado_em: string;
  status?: StatusPedido;
  estadia_id?: string;
  estadia_casa?: string;
}

export interface DadosRegistrarPagamentoNota {
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
