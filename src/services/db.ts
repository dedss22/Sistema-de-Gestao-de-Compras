export type {
  Estadia,
  AdiantamentoEstadia,
  EstadiaPublica,
  StatusPedido,
  PagamentoNota,
  AnexoPedido,
  ItemPedidoBanco,
  HistoricoEdicaoPedido,
  PedidoBanco,
  LogAuditoria,
  UsuarioEquipe,
  AuthUserMetadata,
  AuthUser,
  AuthSession,
  SessaoAtiva,
  UsuarioAtivo,
  AuthChangeCallback,
  AuthSubscription,
  LixeiraItem,
  ItemDiferencaDetalhada,
  ResultadoDiferencasItens,
  DadosRegistrarLogAuditoria,
  DadosCriarEstadia,
  DadosAdicionarAdiantamento,
  DadosCriarPedido,
  ResultadoCriarPedido,
  DadosRegistrarPagamentoNota
} from './db/types';

export {
  isSupabaseConfigured,
  supabase,
  sanitizarTermoPostgrest
} from './db/client';

export {
  purificarArmazenamentoLocal,
  parseMoedaBRL
} from './db/localStore';

export {
  USUARIOS_EQUIPE,
  loginEquipe,
  logoutEquipe,
  getSessaoAtual,
  getUsuarioAtual,
  onMudancaAuth
} from './db/authService';

export {
  registrarLogAuditoria,
  listarLogsAuditoria
} from './db/auditoriaService';

export {
  listarEstadias,
  criarEstadia,
  atualizarEstadia,
  alterarStatusEstadia,
  excluirEstadia,
  recuperarEstadia,
  adicionarAdiantamentoEstadia,
  removerAdiantamentoEstadia
} from './db/estadiasService';

export {
  obterEstadiaPorCodigo,
  criarPedido,
  listarPedidosPorEstadia,
  listarTodosPedidos,
  alterarStatusPedido,
  calcularDiferencasItensPedido,
  editarItensPedido
} from './db/pedidosService';

export {
  adicionarAnexosPedido,
  atualizarAnexoPedido,
  removerAnexoPedido,
  registrarPagamentoNotaPedido
} from './db/anexosPagamentosService';
