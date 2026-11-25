import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  loginEquipe,
  logoutEquipe,
  getSessaoAtual,
  onMudancaAuth,
  listarEstadias,
  criarEstadia,
  atualizarEstadia,
  alterarStatusEstadia,
  excluirEstadia,
  recuperarEstadia,
  listarTodosPedidos,
  listarPedidosPorEstadia,
  listarLogsAuditoria,
  alterarStatusPedido,
  USUARIOS_EQUIPE,
  Estadia,
  PedidoBanco,
  LogAuditoria,
  StatusPedido
} from '../services/db';
import {
  formatarDataBr,
  formatarDataHoraBahia,
  baixarPlanilhaPedido
} from '../services/gerarPlanilha';
import { copiarTextoParaClipboard } from '../services/clipboard';
import { DetalhesPedidoModal } from './DetalhesPedidoModal';
import { GerenciamentoPagamentosModal } from './GerenciamentoPagamentosModal';
import { FORNECEDORES } from '../data/fornecedores';
import { FornecedorId } from '../types';
import {
  extrairSugestoesItensCustomizados,
  adicionarItemAoCatalogo,
  atualizarStatusSugestao,
  SugestaoItemCustom,
  onCatalogoAtualizado
} from '../services/catalogoService';
import {
  Lock,
  LogOut,
  Plus,
  Search,
  Copy,
  Check,
  Share2,
  Calendar,
  Users,
  User,
  Home,
  AlertTriangle,
  Trash2,
  Archive,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Edit3,
  X,
  ShieldAlert,
  ChefHat,
  ShoppingBag,
  FileSpreadsheet,
  ChevronRight,
  Filter,
  History,
  Activity,
  Send,
  RotateCcw,
  XCircle,
  Paperclip,
  Eye,
  CreditCard,
  Lightbulb
} from 'lucide-react';

const EMOJI_FORNECEDORES: Record<string, string> = {
  peixaria: '🐟',
  acougue: '🥩',
  'frios-laticinios': '🧀',
  hortifruti: '🥦',
  bebidas: '🍷',
  mercado: '🛒'
};

const SUBCATEGORIAS_POR_FORNECEDOR: Record<string, string[]> = {
  peixaria: ['Crustáceos', 'Peixes Nobres', 'Peixes do Dia', 'Frutos do Mar', 'Outros'],
  acougue: ['Cortes Nobres', 'Churrasco Especial', 'Feijoada & Tradicionais', 'Aves', 'Suínos Nobres', 'Outros'],
  'frios-laticinios': ['Frios Nobres & Fatiados', 'Manteiga & Laticínios', 'Queijos Especiais', 'Outros'],
  hortifruti: ['Frutas Tropicais', 'Cítricos e Temperos', 'Legumes e Raízes', 'Legumes e Conservas', 'Folhas e Ervas', 'Outros'],
  bebidas: ['Águas e Gelo', 'Sucos e Naturais', 'Refrigerantes', 'Energéticos e Bar', 'Cervejas', 'Vinhos e Espumantes', 'Destilados e Bar', 'Outros'],
  mercado: ['Churrasco e Brasa', 'Ovos e Despensa', 'Sobremesas e Doces', 'Mercearia e Grãos', 'Café e Padaria', 'Petiscos e Massas', 'Petiscos e Congelados', 'Molhos, Temperos e Mantimentos', 'Petiscos e Conservas', 'Descartáveis e Utensílios', 'Limpeza e Descartáveis', 'Outros']
};

interface AdminDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectOrderToView?: (order: any) => void;
  onAbrirCardapio?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen = true,
  onAbrirCardapio
}) => {
  // Autenticação da equipe com persistência imediata (sem flicker ao recarregar com F5)
  const [session, setSession] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('lista_compras_supabase_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user) return parsed;
      }
    } catch {}
    return null;
  });
  const [loadingAuth, setLoadingAuth] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('lista_compras_supabase_session');
      if (raw) return false;
    } catch {}
    return true;
  });
  const [lembrarSenha, setLembrarSenha] = useState<boolean>(() => {
    return localStorage.getItem('admin_lembrar_senha') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState<string>(() => {
    return localStorage.getItem('admin_lembrar_login') || '';
  });
  const [loginPassword, setLoginPassword] = useState<string>(() => {
    const lembrar = localStorage.getItem('admin_lembrar_senha') === 'true';
    return lembrar ? (localStorage.getItem('admin_senha_salva') || '') : '';
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Navegação Principal: 'estadias' | 'pedidos' | 'historico' | 'sugestoes'
  const [abaPrincipal, setAbaPrincipal] = useState<'estadias' | 'pedidos' | 'historico' | 'sugestoes'>('estadias');

  // Sugestões de novos itens (fora do cardápio oficial)
  const [filtroStatusSugestao, setFiltroStatusSugestao] = useState<'todas' | 'pendente' | 'adicionado' | 'descartado'>('pendente');
  const [filtroFornecedorSugestao, setFiltroFornecedorSugestao] = useState<string>('todos');
  const [buscaSugestoes, setBuscaSugestoes] = useState<string>('');
  const [catalogoVersao, setCatalogoVersao] = useState<number>(0);

  // Modal para adicionar novo item ao cardápio oficial
  const [modalNovoItem, setModalNovoItem] = useState<{
    aberto: boolean;
    sugestao?: SugestaoItemCustom;
  }>({ aberto: false });
  const [formNovoNome, setFormNovoNome] = useState('');
  const [formNovoFornecedor, setFormNovoFornecedor] = useState<FornecedorId>('mercado');
  const [formNovoSubcategoria, setFormNovoSubcategoria] = useState('');
  const [formNovoSubcategoriaCustom, setFormNovoSubcategoriaCustom] = useState('');
  const [formNovoUnidade, setFormNovoUnidade] = useState('kg');
  const [formNovoDescricao, setFormNovoDescricao] = useState('');
  const [formNovoQtdPessoaDia, setFormNovoQtdPessoaDia] = useState<number>(0);
  const [formNovoSalvando, setFormNovoSalvando] = useState(false);
  const [formNovoErro, setFormNovoErro] = useState<string | null>(null);

  // Logs de Auditoria / Histórico de Ações
  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filtroTipoLog, setFiltroTipoLog] = useState<string>('todos');
  const [buscaLogs, setBuscaLogs] = useState<string>('');

  // Listagem de estadias
  const [todasEstadias, setTodasEstadias] = useState<Estadia[]>([]);
  const [loadingEstadias, setLoadingEstadias] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ativas' | 'finalizadas' | 'arquivadas' | 'todas'>('ativas');
  const [searchTerm, setSearchTerm] = useState('');

  // Listagem de todos os pedidos (Visão Geral)
  const [pedidosGlobais, setPedidosGlobais] = useState<PedidoBanco[]>([]);
  const [loadingPedidosGlobais, setLoadingPedidosGlobais] = useState(false);
  const [filtroEstadiaId, setFiltroEstadiaId] = useState<string>('todas');
  const [filtroStatusPedido, setFiltroStatusPedido] = useState<string>('ativos');
  const [buscaPedidos, setBuscaPedidos] = useState('');

  // Pedidos de uma estadia específica (Modal de lista de pedidos)
  const [estadiaModalPedidos, setEstadiaModalPedidos] = useState<Estadia | null>(null);
  const [pedidosDaEstadia, setPedidosDaEstadia] = useState<PedidoBanco[]>([]);
  const [loadingPedidosDaEstadia, setLoadingPedidosDaEstadia] = useState(false);

  // Modal de Detalhes de um Pedido
  const [pedidoDetalhe, setPedidoDetalhe] = useState<{
    pedido: PedidoBanco;
    estadia?: Partial<Estadia> | null;
  } | null>(null);

  // Modal de Gerenciamento de Pagamentos & Financeiro da Estadia
  const [estadiaModalFinanceiro, setEstadiaModalFinanceiro] = useState<Estadia | null>(null);
  const [versaoFinanceiro, setVersaoFinanceiro] = useState(0);

  // Modais de Criação e Edição
  const [modalForm, setModalForm] = useState<{
    aberto: boolean;
    modo: 'criar' | 'editar';
    estadiaId?: string;
  }>({ aberto: false, modo: 'criar' });

  const [formCasa, setFormCasa] = useState('');
  const [formEntrada, setFormEntrada] = useState('');
  const [formSaida, setFormSaida] = useState('');
  const [formHospedes, setFormHospedes] = useState<number>(8);
  const [formTitular, setFormTitular] = useState('');
  const [formFuncionario, setFormFuncionario] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSalvando, setFormSalvando] = useState(false);

  // Modal de Exclusão Dupla
  const [estadiaExcluir, setEstadiaExcluir] = useState<Estadia | null>(null);
  const [nomeConfirmacaoExclusao, setNomeConfirmacaoExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  // Modal de Confirmação de Finalização
  const [estadiaFinalizar, setEstadiaFinalizar] = useState<Estadia | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  // Feedback de ações
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Monitorar sessão Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const sess = await getSessaoAtual();
        if (mounted) {
          setSession(sess);
          setLoadingAuth(false);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
        if (mounted) setLoadingAuth(false);
      }
    }

    initAuth();

    const subscription = onMudancaAuth((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  // 2. Carregar estadias
  const carregarDadosEstadias = useCallback(async () => {
    if (!session) return;
    setLoadingEstadias(true);
    try {
      const dados = await listarEstadias({ status: 'todas' });
      setTodasEstadias(dados);
    } catch (err: any) {
      console.error('Erro ao carregar estadias:', err);
      showToast('Erro ao carregar estadias.');
    } finally {
      setLoadingEstadias(false);
    }
  }, [session]);

  // 3. Carregar todos os pedidos
  const carregarPedidosGlobais = useCallback(async () => {
    if (!session) return;
    setLoadingPedidosGlobais(true);
    try {
      const dados = await listarTodosPedidos();
      setPedidosGlobais(dados);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      showToast('Erro ao carregar lista de pedidos.');
    } finally {
      setLoadingPedidosGlobais(false);
    }
  }, [session]);

  // 4. Carregar histórico de auditoria
  const carregarLogsAuditoria = useCallback(async () => {
    if (!session) return;
    setLoadingLogs(true);
    try {
      const dados = await listarLogsAuditoria({
        limite: 200,
        tipo: filtroTipoLog,
        busca: buscaLogs
      });
      setLogsAuditoria(dados);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      showToast('Erro ao carregar histórico de ações.');
    } finally {
      setLoadingLogs(false);
    }
  }, [session, filtroTipoLog, buscaLogs]);

  // Feedback e animação explícita no clique do botão de recarregar
  const [recarregandoManual, setRecarregandoManual] = useState(false);

  const handleRecarregarManual = async () => {
    if (recarregandoManual) return;
    setRecarregandoManual(true);
    try {
      const promessas: Promise<any>[] = [carregarDadosEstadias()];
      if (abaPrincipal === 'pedidos' || abaPrincipal === 'sugestoes') {
        promessas.push(carregarPedidosGlobais());
      } else if (abaPrincipal === 'historico') {
        promessas.push(carregarLogsAuditoria());
      } else {
        promessas.push(carregarPedidosGlobais());
        promessas.push(carregarLogsAuditoria());
      }

      // Garante uma rotação contínua e perceptível de pelo menos 750ms para um feedback visual elegante
      await Promise.all([
        Promise.all(promessas),
        new Promise((resolve) => setTimeout(resolve, 750))
      ]);
      showToast('Dados atualizados com sucesso!');
    } catch (err) {
      console.error('Erro ao recarregar dados:', err);
    } finally {
      setRecarregandoManual(false);
    }
  };

  useEffect(() => {
    if (!session || !isOpen) return;
    const timer = setTimeout(() => {
      if (abaPrincipal === 'estadias') {
        carregarDadosEstadias();
      } else if (abaPrincipal === 'pedidos' || abaPrincipal === 'sugestoes') {
        carregarPedidosGlobais();
      } else if (abaPrincipal === 'historico') {
        carregarLogsAuditoria();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [session, isOpen, abaPrincipal, carregarDadosEstadias, carregarPedidosGlobais, carregarLogsAuditoria]);

  // Contadores por status para as abas de estadias (sempre calculados sobre o total real)
  const contadores = useMemo(() => {
    return {
      ativas: todasEstadias.filter((e) => e.status === 'ativa').length,
      finalizadas: todasEstadias.filter((e) => e.status === 'finalizada').length,
      arquivadas: todasEstadias.filter((e) => e.status === 'arquivada').length,
      todas: todasEstadias.length
    };
  }, [todasEstadias]);

  // Filtragem das estadias exibidas na tela por status e por busca
  const estadias = useMemo(() => {
    return todasEstadias.filter((e) => {
      if (statusFilter === 'ativas' && e.status !== 'ativa') return false;
      if (statusFilter === 'finalizadas' && e.status !== 'finalizada') return false;
      if (statusFilter === 'arquivadas' && e.status !== 'arquivada') return false;
      if (searchTerm.trim()) {
        const t = searchTerm.trim().toLowerCase();
        const casaMatch = e.casa?.toLowerCase().includes(t);
        const titMatch = e.titular?.toLowerCase().includes(t);
        if (!casaMatch && !titMatch) return false;
      }
      return true;
    });
  }, [todasEstadias, statusFilter, searchTerm]);

  // Contadores de pedidos por fase / status
  const contadoresPedidos = useMemo(() => {
    const em_aprovacao = pedidosGlobais.filter((p) => (p.status || 'em_aprovacao') === 'em_aprovacao').length;
    const enviar_fornecedores = pedidosGlobais.filter((p) => p.status === 'enviar_fornecedores').length;
    const preparacao_entrega = pedidosGlobais.filter((p) => p.status === 'preparacao_entrega').length;
    const ativos = em_aprovacao + enviar_fornecedores + preparacao_entrega;

    return {
      todos: pedidosGlobais.length,
      ativos,
      em_aprovacao,
      enviar_fornecedores,
      preparacao_entrega,
      finalizado: pedidosGlobais.filter((p) => p.status === 'finalizado').length,
      rejeitado: pedidosGlobais.filter((p) => p.status === 'rejeitado').length
    };
  }, [pedidosGlobais]);

  // Filtragem dos pedidos globais
  const pedidosFiltrados = useMemo(() => {
    return pedidosGlobais.filter((ped) => {
      const statusPed = ped.status || 'em_aprovacao';

      if (filtroStatusPedido === 'ativos') {
        const isAtivo =
          statusPed === 'em_aprovacao' ||
          statusPed === 'enviar_fornecedores' ||
          statusPed === 'preparacao_entrega';
        if (!isAtivo) return false;
      } else if (filtroStatusPedido !== 'todos' && statusPed !== filtroStatusPedido) {
        return false;
      }

      if (filtroEstadiaId !== 'todas' && ped.estadia_id !== filtroEstadiaId) {
        return false;
      }
      if (buscaPedidos.trim()) {
        const termo = buscaPedidos.trim().toLowerCase();
        const casa = ped.estadia?.casa?.toLowerCase() || '';
        const coz = ped.cozinheira?.toLowerCase() || '';
        return casa.includes(termo) || coz.includes(termo);
      }
      return true;
    });
  }, [pedidosGlobais, filtroStatusPedido, filtroEstadiaId, buscaPedidos]);

  // Ouvinte em tempo real para sincronização do catálogo
  useEffect(() => {
    const unsub = onCatalogoAtualizado(() => {
      setCatalogoVersao((v) => v + 1);
    });
    return unsub;
  }, []);

  // Extrai todas as sugestões de produtos fora do menu a partir de pedidos
  const todasSugestoes = useMemo(() => {
    void catalogoVersao;
    return extrairSugestoesItensCustomizados(pedidosGlobais);
  }, [pedidosGlobais, catalogoVersao]);

  // Contagem de sugestões pendentes
  const sugestoesPendentesCount = useMemo(() => {
    return todasSugestoes.filter((s) => s.status === 'pendente').length;
  }, [todasSugestoes]);

  // Filtragem das sugestões
  const sugestoesFiltradas = useMemo(() => {
    return todasSugestoes.filter((sug) => {
      if (filtroStatusSugestao !== 'todas' && sug.status !== filtroStatusSugestao) {
        return false;
      }
      if (filtroFornecedorSugestao !== 'todos' && sug.fornecedor !== filtroFornecedorSugestao) {
        return false;
      }
      if (buscaSugestoes.trim()) {
        const q = buscaSugestoes.toLowerCase();
        const matchNome = sug.nome.toLowerCase().includes(q);
        const matchObs = sug.observacoes.some((obs) => obs.toLowerCase().includes(q));
        const matchCoz = sug.pedidos.some(
          (p) => p.cozinheira.toLowerCase().includes(q) || p.estadia_casa.toLowerCase().includes(q)
        );
        if (!matchNome && !matchObs && !matchCoz) return false;
      }
      return true;
    });
  }, [todasSugestoes, filtroStatusSugestao, filtroFornecedorSugestao, buscaSugestoes]);

  // Abrir modal para adicionar item sugerido ao catálogo oficial
  const handleAbrirAdicionarAoCardapio = (sug: SugestaoItemCustom) => {
    const fornId = (sug.fornecedor as FornecedorId) || 'mercado';
    const subcats = SUBCATEGORIAS_POR_FORNECEDOR[fornId] || ['Outros'];
    setFormNovoNome(sug.nome);
    setFormNovoFornecedor(fornId);
    setFormNovoSubcategoria(subcats[0]);
    setFormNovoSubcategoriaCustom('');
    setFormNovoUnidade(sug.unidade || 'kg');
    setFormNovoDescricao(sug.observacoes.length > 0 ? sug.observacoes[0] : '');
    setFormNovoQtdPessoaDia(0);
    setFormNovoErro(null);
    setModalNovoItem({ aberto: true, sugestao: sug });
  };

  // Salvar novo item adicionado ao catálogo oficial
  const handleSalvarNovoItemCardapio = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormNovoErro(null);

    const subcategoriaFinal =
      formNovoSubcategoria === 'Outros' && formNovoSubcategoriaCustom.trim()
        ? formNovoSubcategoriaCustom.trim()
        : formNovoSubcategoria.trim();

    if (!formNovoNome.trim()) {
      setFormNovoErro('Informe o nome do produto.');
      return;
    }
    if (!subcategoriaFinal) {
      setFormNovoErro('Selecione ou informe uma subcategoria para o item.');
      return;
    }

    setFormNovoSalvando(true);
    try {
      await adicionarItemAoCatalogo({
        nome: formNovoNome.trim(),
        fornecedor: formNovoFornecedor,
        subcategoria: subcategoriaFinal,
        unidade: formNovoUnidade.trim() || 'kg',
        descricaoBreve: formNovoDescricao.trim(),
        quantidade_por_pessoa_dia: Number(formNovoQtdPessoaDia) || 0
      });

      showToast(`Produto "${formNovoNome}" adicionado com sucesso ao cardápio oficial!`);
      setModalNovoItem({ aberto: false });
      setCatalogoVersao((v) => v + 1);
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao adicionar produto ao cardápio:', err);
      setFormNovoErro(err.message || 'Erro ao adicionar item.');
    } finally {
      setFormNovoSalvando(false);
    }
  };

  // Alterar status de uma sugestão
  const handleAlterarStatusSugestao = (
    nome: string,
    status: 'pendente' | 'adicionado' | 'descartado'
  ) => {
    atualizarStatusSugestao(nome, status);
    setCatalogoVersao((v) => v + 1);
    if (status === 'descartado') {
      showToast(`Sugestão "${nome}" descartada.`);
    } else if (status === 'pendente') {
      showToast(`Sugestão "${nome}" reativada como pendente.`);
    }
  };

  // Ação rápida de alteração de status do pedido direto na lista
  const handleAlterarStatusPedidoRapido = async (pedidoId: string, novoStatus: StatusPedido) => {
    try {
      const atualizado = await alterarStatusPedido(pedidoId, novoStatus);
      showToast(`Pedido #${atualizado.numero} atualizado com sucesso!`);
      setPedidosGlobais((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, ...atualizado, estadia: p.estadia } : p))
      );
      setPedidosDaEstadia((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, ...atualizado, estadia: p.estadia } : p))
      );
      if (pedidoDetalhe && pedidoDetalhe.pedido.id === pedidoId) {
        setPedidoDetalhe({
          pedido: { ...pedidoDetalhe.pedido, ...atualizado },
          estadia: pedidoDetalhe.estadia
        });
      }
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      showToast(err.message || 'Erro ao alterar status do pedido.');
    }
  };

  // Login da equipe
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const data = await loginEquipe(loginEmail, loginPassword);
      setSession(data.session);

      // Salvar ou remover senha conforme preferência do usuário
      if (lembrarSenha) {
        localStorage.setItem('admin_lembrar_senha', 'true');
        localStorage.setItem('admin_lembrar_login', loginEmail);
        localStorage.setItem('admin_senha_salva', loginPassword);
      } else {
        localStorage.removeItem('admin_lembrar_senha');
        localStorage.removeItem('admin_lembrar_login');
        localStorage.removeItem('admin_senha_salva');
      }

      showToast('Login realizado com sucesso!');
    } catch (err: any) {
      console.error('Erro no login:', err);
      setLoginError(
        err.message?.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos. Verifique suas credenciais.'
          : 'Erro ao autenticar. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout da equipe
  const handleLogout = async () => {
    try {
      await logoutEquipe();
      setSession(null);
      setTodasEstadias([]);
      setPedidosGlobais([]);
      showToast('Sessão encerrada com sucesso.');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  // Abrir modal de criação
  const handleAbrirCriar = () => {
    const hoje = new Date();
    const chegada = new Date(hoje);
    chegada.setDate(hoje.getDate() + 7);
    const saida = new Date(chegada);
    saida.setDate(chegada.getDate() + 5);

    // Pré-seleciona o membro logado da equipe (ou André Balbino como padrão)
    const usuarioLogadoNome = session?.user?.nome;
    const funcionarioPadrao =
      USUARIOS_EQUIPE.find((u) => u.nome === usuarioLogadoNome)?.nome ||
      'André Balbino';

    setFormCasa('');
    setFormEntrada(chegada.toISOString().split('T')[0]);
    setFormSaida(saida.toISOString().split('T')[0]);
    setFormHospedes(8);
    setFormTitular('');
    setFormFuncionario(funcionarioPadrao);
    setFormError(null);
    setModalForm({ aberto: true, modo: 'criar' });
  };

  // Abrir modal de edição
  const handleAbrirEditar = (estadia: Estadia) => {
    setFormCasa(estadia.casa);
    setFormEntrada(estadia.entrada);
    setFormSaida(estadia.saida);
    setFormHospedes(estadia.hospedes);
    setFormTitular(estadia.titular);
    setFormFuncionario(estadia.funcionario);
    setFormError(null);
    setModalForm({ aberto: true, modo: 'editar', estadiaId: estadia.id });
  };

  // Salvar formulário (criar ou editar)
  const handleSalvarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCasa.trim()) {
      setFormError('Informe o nome da casa.');
      return;
    }
    if (!formEntrada || !formSaida) {
      setFormError('Selecione as datas de entrada e saída.');
      return;
    }
    if (new Date(formSaida) < new Date(formEntrada)) {
      setFormError('A data de saída deve ser igual ou posterior à data de entrada.');
      return;
    }
    if (!formHospedes || formHospedes < 1) {
      setFormError('O número de hóspedes deve ser no mínimo 1.');
      return;
    }
    if (!formTitular.trim()) {
      setFormError('Informe o nome do titular da hospedagem.');
      return;
    }
    if (!formFuncionario.trim()) {
      setFormError('Informe o funcionário responsável da equipe.');
      return;
    }

    setFormSalvando(true);
    try {
      if (modalForm.modo === 'criar') {
        await criarEstadia({
          casa: formCasa,
          entrada: formEntrada,
          saida: formSaida,
          hospedes: formHospedes,
          titular: formTitular,
          funcionario: formFuncionario
        });
        showToast('Estadia cadastrada com sucesso!');
        setStatusFilter('ativas');
        setSearchTerm('');
      } else if (modalForm.estadiaId) {
        await atualizarEstadia(modalForm.estadiaId, {
          casa: formCasa,
          entrada: formEntrada,
          saida: formSaida,
          hospedes: formHospedes,
          titular: formTitular,
          funcionario: formFuncionario
        });
        showToast('Estadia atualizada com sucesso!');
      }

      setModalForm({ aberto: false, modo: 'criar' });
      await carregarDadosEstadias();
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao salvar estadia:', err);
      setFormError(err.message || 'Erro ao salvar estadia.');
    } finally {
      setFormSalvando(false);
    }
  };

  // Abrir pedidos de uma estadia específica
  const handleAbrirPedidosEstadia = async (estadia: Estadia) => {
    setEstadiaModalPedidos(estadia);
    setLoadingPedidosDaEstadia(true);
    try {
      const pedidos = await listarPedidosPorEstadia(estadia.id);
      setPedidosDaEstadia(pedidos);
    } catch (err) {
      console.error('Erro ao carregar pedidos da estadia:', err);
      showToast('Erro ao carregar pedidos desta estadia.');
    } finally {
      setLoadingPedidosDaEstadia(false);
    }
  };

  // Finalizar estadia
  const handleConfirmarFinalizar = async () => {
    if (!estadiaFinalizar) return;
    setFinalizando(true);
    try {
      await alterarStatusEstadia(estadiaFinalizar.id, 'finalizada');
      showToast(`Estadia "${estadiaFinalizar.casa}" finalizada!`);
      setEstadiaFinalizar(null);
      await carregarDadosEstadias();
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao finalizar estadia:', err);
      showToast('Erro ao finalizar estadia.');
    } finally {
      setFinalizando(false);
    }
  };

  // Arquivar estadia
  const handleArquivar = async (estadia: Estadia) => {
    try {
      await alterarStatusEstadia(estadia.id, 'arquivada');
      showToast(`Estadia "${estadia.casa}" arquivada.`);
      await carregarDadosEstadias();
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao arquivar:', err);
      showToast('Erro ao arquivar estadia.');
    }
  };

  // Reativar estadia
  const handleReativar = async (estadia: Estadia) => {
    try {
      await alterarStatusEstadia(estadia.id, 'ativa');
      showToast(`Estadia "${estadia.casa}" reativada com sucesso!`);
      await carregarDadosEstadias();
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao reativar:', err);
      showToast('Erro ao reativar estadia.');
    }
  };

  // Excluir definitivamente com dupla confirmação
  const handleConfirmarExcluir = async () => {
    if (!estadiaExcluir) return;
    if (nomeConfirmacaoExclusao.trim().toLowerCase() !== estadiaExcluir.casa.trim().toLowerCase()) {
      showToast('O nome digitado não confere com o nome da casa.');
      return;
    }

    setExcluindo(true);
    try {
      await excluirEstadia(estadiaExcluir.id);
      showToast(`Estadia "${estadiaExcluir.casa}" excluída definitivamente.`);
      setEstadiaExcluir(null);
      setNomeConfirmacaoExclusao('');
      await carregarDadosEstadias();
      carregarLogsAuditoria();
    } catch (err: any) {
      console.error('Erro ao excluir estadia:', err);
      showToast('Erro ao excluir estadia.');
    } finally {
      setExcluindo(false);
    }
  };

  // Copiar link do cardápio (/e/:codigo)
  const handleCopiarLink = async (codigo: string) => {
    const url = `${window.location.origin}/e/${codigo}`;
    const copiou = await copiarTextoParaClipboard(url);
    if (copiou) {
      setCopiedId(codigo);
      showToast('Link do cardápio copiado!');
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      window.prompt('Copie o link abaixo (Ctrl + C):', url);
    }
  };

  // Copiar mensagem para WhatsApp da cozinheira e abrir o WhatsApp
  const handleCopiarMensagemWhatsApp = async (estadia: Estadia) => {
    const url = `${window.location.origin}/e/${estadia.codigo}`;
    const texto = `Olá! Segue o link do cardápio digital para a estadia na casa *${estadia.casa}*:\n\n${url}\n\nPor favor, acesse o link para montar e enviar os pedidos de compras da casa.`;

    const copiou = await copiarTextoParaClipboard(texto);
    if (copiou) {
      showToast('Mensagem copiada para o seu WhatsApp!');
    }

    // Abre o WhatsApp Web / aplicativo com a mensagem pronta
    const linkWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(linkWhatsApp, '_blank');
  };

  // Recuperar estadia excluída
  const [recuperandoId, setRecuperandoId] = useState<string | null>(null);

  const handleRecuperarEstadia = async (log: LogAuditoria) => {
    const nomeCasa = log.estadia_casa || 'Estadia';
    if (!window.confirm(`Deseja recuperar a estadia "${nomeCasa}" de volta para a lista de estadias ativas?`)) {
      return;
    }

    setRecuperandoId(log.id);
    try {
      const estadiaRestaurada = await recuperarEstadia(log.estadia_id || '', log);
      showToast(`Estadia "${estadiaRestaurada.casa}" recuperada com sucesso! Ela voltou para a aba Estadias.`);
      await carregarDadosEstadias();
      await carregarLogsAuditoria();
      // Leva o usuário para a aba de estadias para ver a casa recuperada
      setAbaPrincipal('estadias');
    } catch (err: any) {
      console.error('Erro ao recuperar estadia:', err);
      showToast('Erro ao recuperar estadia.');
    } finally {
      setRecuperandoId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#faf7f2] flex flex-col font-sans text-stone-900 selection:bg-amber-200 selection:text-stone-950">
      {/* Toast flutuante */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-80 bg-stone-950/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-stone-800 animate-in fade-in slide-in-from-top-2 max-w-[92vw]"
        >
          <Sparkles className="text-amber-400 shrink-0" size={15} aria-hidden="true" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Cabeçalho Superior Full-Width */}
      <header className="bg-stone-950/95 backdrop-blur-md text-white border-b border-stone-800/90 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner shrink-0">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base leading-tight text-white tracking-tight truncate">
                  Painel da Equipe
                </h1>
                <span className="hidden sm:inline-flex text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-md shrink-0">
                  Backoffice
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 truncate">
                Gestão de Estadias e Pedidos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onAbrirCardapio && (
              <button
                type="button"
                onClick={onAbrirCardapio}
                aria-label="Ver Cardápio Digital"
                className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 sm:px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs tap-bounce"
                title="Abrir Cardápio Digital / Fazer Pedido"
              >
                <ChefHat size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Ver Cardápio Digital</span>
              </button>
            )}

            {session && (
              <>
                <div className="flex items-center gap-2.5 text-xs text-stone-200 bg-stone-900 min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-stone-800 shadow-inner">
                  <div
                    className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-black flex items-center justify-center text-xs border border-amber-500/30 shrink-0"
                    aria-hidden="true"
                  >
                    {(session.user?.nome || session.user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="font-extrabold text-white leading-tight">
                      {session.user?.nome || session.user?.email || 'Equipe'}
                    </span>
                    {session.user?.cargo && (
                      <span className="text-[11px] text-amber-300 font-medium leading-tight">
                        {session.user.cargo}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Encerrar sessão"
                  className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 sm:px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-stone-800 cursor-pointer shadow-xs"
                  title="Encerrar sessão"
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CASO 1: CARREGANDO SESSÃO                                */}
      {/* ========================================================= */}
      {loadingAuth ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-600 gap-3">
          <RefreshCw className="animate-spin text-amber-600" size={32} aria-hidden="true" />
          <p className="text-sm font-semibold">Verificando sessão segura...</p>
        </div>
      ) : !session ? (
        /* ========================================================= */
        /* CASO 2: LOGIN DA EQUIPE (PÁGINA INTEIRA CENTRALIZADA)     */
        /* ========================================================= */
        <div className="flex-1 p-4 sm:p-8 lg:p-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white p-5 sm:p-8 rounded-3xl border border-stone-200/90 shadow-xl shadow-stone-900/5 space-y-6 animate-modal-in">
            <div className="text-center space-y-2">
              <div className="w-13 h-13 bg-amber-100/80 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-inner">
                <Lock size={22} aria-hidden="true" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Acesso da Equipe
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Selecione seu perfil abaixo ou informe suas credenciais individuais.
              </p>
            </div>

            {/* Perfis Rápidos da Equipe */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-stone-600 uppercase tracking-wider px-1">
                <span>Perfis Cadastrados</span>
                <span className="text-[11px] text-amber-800 font-semibold normal-case">
                  Toque para selecionar
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {USUARIOS_EQUIPE.map((user) => {
                  const isSelected =
                    loginEmail.toLowerCase() === user.login.toLowerCase() ||
                    loginEmail.toLowerCase() === user.email.toLowerCase();

                  return (
                    <button
                      key={user.login}
                      type="button"
                      onClick={() => {
                        setLoginEmail(user.login);
                        const loginSalvo = localStorage.getItem('admin_lembrar_login');
                        const senhaSalva = localStorage.getItem('admin_senha_salva');
                        const deveLembrar = localStorage.getItem('admin_lembrar_senha') === 'true';
                        if (deveLembrar && loginSalvo === user.login && senhaSalva) {
                          setLoginPassword(senhaSalva);
                        } else {
                          setLoginPassword('');
                        }
                        setLoginError(null);
                      }}
                      className={`min-h-[56px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-2 ring-amber-400/40'
                          : 'bg-stone-50/80 hover:bg-stone-100 hover:border-stone-300 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                              : 'bg-white text-stone-800 border-stone-300'
                          }`}
                        >
                          {user.nome
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-stone-900 leading-tight truncate">
                            {user.nome}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-600 flex-wrap">
                            <span className="font-semibold text-amber-800">{user.cargo}</span>
                            <span aria-hidden="true">•</span>
                            <span className="font-mono text-stone-600">@{user.login}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold shrink-0">
                        {isSelected ? (
                          <span className="bg-amber-500 text-stone-950 text-[11px] px-2.5 py-1 rounded-full font-extrabold shadow-xs">
                            Selecionado
                          </span>
                        ) : (
                          <span className="text-stone-600 font-semibold text-xs bg-white px-2.5 py-1 rounded-full border border-stone-200">
                            Usar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {loginError && (
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium flex items-start gap-2"
              >
                <ShieldAlert className="shrink-0 text-red-600 mt-0.5" size={16} aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-xs font-bold text-stone-800 mb-1.5"
                >
                  Usuário ou E-mail
                </label>
                <input
                  id="admin-login-email"
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Seu login (ex: alexandre, andre, lorena)"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-stone-900 placeholder:text-stone-500 bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-bold text-stone-800 mb-1.5"
                >
                  Senha
                </label>
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-stone-900 placeholder:text-stone-500 bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="min-h-[44px] flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={lembrarSenha}
                    onChange={(e) => setLembrarSenha(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
                  />
                  <span>Salvar senha neste dispositivo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full min-h-[46px] py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-300 disabled:text-stone-600 text-stone-950 font-black rounded-xl text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer tap-bounce"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} aria-hidden="true" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar no Painel</span>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* CASO 3: PAINEL DA EQUIPE (USUÁRIO AUTENTICADO)            */
        /* ========================================================= */
        <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 flex flex-col gap-5 sm:gap-6">
          {/* Seletor Principal: Estadias vs Todos os Pedidos vs Histórico de Ações */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Abas Superiores */}
                <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setAbaPrincipal('estadias')}
                    className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      abaPrincipal === 'estadias'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Home size={15} aria-hidden="true" />
                    <span>Estadias</span>
                    <span className="text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-bold tabular-nums">
                      {contadores.ativas}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAbaPrincipal('pedidos');
                      setFiltroStatusPedido('ativos');
                      carregarPedidosGlobais();
                    }}
                    className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      abaPrincipal === 'pedidos'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag size={15} aria-hidden="true" />
                    <span>Todos os Pedidos</span>
                    <span className="text-[11px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full font-bold tabular-nums">
                      {contadoresPedidos.ativos}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAbaPrincipal('historico');
                      carregarLogsAuditoria();
                    }}
                    className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      abaPrincipal === 'historico'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <History size={15} aria-hidden="true" />
                    <span>Histórico de Ações</span>
                    <span className="text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-bold tabular-nums">
                      {logsAuditoria.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAbaPrincipal('sugestoes');
                      carregarPedidosGlobais();
                    }}
                    className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      abaPrincipal === 'sugestoes'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Lightbulb size={15} className={sugestoesPendentesCount > 0 ? 'text-amber-600' : 'text-stone-500'} aria-hidden="true" />
                    <span>Itens Fora do Menu</span>
                    {sugestoesPendentesCount > 0 ? (
                      <span className="text-[11px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full font-black animate-pulse tabular-nums">
                        {sugestoesPendentesCount}
                      </span>
                    ) : (
                      <span className="text-[11px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold tabular-nums">
                        {todasSugestoes.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={recarregandoManual || loadingEstadias || loadingPedidosGlobais || loadingLogs}
                    onClick={handleRecarregarManual}
                    aria-label="Recarregar dados do sistema"
                    className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl transition-all cursor-pointer tap-bounce flex items-center justify-center ${
                      recarregandoManual
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-inner'
                        : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 active:scale-90 border border-stone-200/70'
                    }`}
                    title="Recarregar dados do sistema"
                  >
                    <RefreshCw
                      size={16}
                      aria-hidden="true"
                      className={`transition-all duration-300 ${
                        recarregandoManual || loadingEstadias || loadingPedidosGlobais || loadingLogs
                          ? 'animate-spin text-amber-700'
                          : ''
                      }`}
                    />
                  </button>

                  {abaPrincipal === 'estadias' && (
                    <button
                      type="button"
                      onClick={handleAbrirCriar}
                      className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all tap-bounce cursor-pointer"
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span>Nova Estadia</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-filtros específicos de cada aba */}
              {abaPrincipal === 'estadias' ? (
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-1">
                  {/* Abas de status */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: 'ativas', label: 'Ativas', count: contadores.ativas },
                        { id: 'finalizadas', label: 'Finalizadas', count: contadores.finalizadas },
                        { id: 'arquivadas', label: 'Arquivadas', count: contadores.arquivadas },
                        { id: 'todas', label: 'Todas', count: contadores.todas }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          statusFilter === tab.id
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${
                            statusFilter === tab.id
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={15} aria-hidden="true" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por casa ou titular..."
                      aria-label="Buscar estadia por casa ou titular"
                      className="w-full min-h-[40px] pl-9 pr-9 py-1.5 bg-stone-100 focus:bg-white text-xs text-stone-900 placeholder:text-stone-500 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        aria-label="Limpar busca de estadias"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ) : abaPrincipal === 'pedidos' ? (
                /* Sub-filtros da aba "Todos os Pedidos" */
                <div className="space-y-3 pt-1">
                  {/* Abas de Status da Esteira de Pedidos */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: 'todos', label: 'Todos os Pedidos', count: contadoresPedidos.todos },
                        { id: 'ativos', label: '⚡ Ativos', count: contadoresPedidos.ativos },
                        { id: 'em_aprovacao', label: '⏳ Em Aprovação', count: contadoresPedidos.em_aprovacao },
                        { id: 'enviar_fornecedores', label: '📤 Enviar Fornecedor', count: contadoresPedidos.enviar_fornecedores },
                        { id: 'preparacao_entrega', label: '📦 Preparação & Entrega', count: contadoresPedidos.preparacao_entrega },
                        { id: 'finalizado', label: '✅ Finalizados', count: contadoresPedidos.finalizado },
                        { id: 'rejeitado', label: '❌ Rejeitados', count: contadoresPedidos.rejeitado }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFiltroStatusPedido(tab.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          filtroStatusPedido === tab.id
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${
                            filtroStatusPedido === tab.id
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-stone-500 shrink-0" aria-hidden="true" />
                      <select
                        value={filtroEstadiaId}
                        onChange={(e) => setFiltroEstadiaId(e.target.value)}
                        aria-label="Filtrar pedidos por estadia"
                        className="min-h-[40px] bg-stone-100 text-xs font-bold text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer w-full sm:w-auto"
                      >
                        <option value="todas">Todas as Estadias</option>
                        {todasEstadias.map((est) => (
                          <option key={est.id} value={est.id}>
                            {est.casa}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={15} aria-hidden="true" />
                      <input
                        type="text"
                        value={buscaPedidos}
                        onChange={(e) => setBuscaPedidos(e.target.value)}
                        placeholder="Buscar por cozinheira ou casa..."
                        aria-label="Buscar pedidos por cozinheira ou casa"
                        className="w-full min-h-[40px] pl-9 pr-9 py-1.5 bg-stone-100 focus:bg-white text-xs text-stone-900 placeholder:text-stone-500 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                      />
                      {buscaPedidos && (
                        <button
                          type="button"
                          onClick={() => setBuscaPedidos('')}
                          aria-label="Limpar busca de pedidos"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : abaPrincipal === 'historico' ? (
                /* Sub-filtros da aba "Histórico de Ações" */
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFiltroTipoLog('todos')}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filtroTipoLog === 'todos'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      Todas as Ações
                    </button>

                    <button
                      type="button"
                      onClick={() => setFiltroTipoLog('EXCLUIR_ESTADIA')}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filtroTipoLog === 'EXCLUIR_ESTADIA'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      <span>Exclusões</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFiltroTipoLog('PEDIDO_CRIADO')}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filtroTipoLog === 'PEDIDO_CRIADO'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      <ShoppingBag size={13} aria-hidden="true" />
                      <span>Pedidos Criados</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <select
                        value={filtroTipoLog}
                        onChange={(e) => setFiltroTipoLog(e.target.value)}
                        aria-label="Filtrar histórico por tipo de ação"
                        className="min-h-[38px] bg-stone-100 text-xs font-bold text-stone-800 px-2.5 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                      >
                        <option value="todos">Mais Filtros...</option>
                        <option value="EXCLUIR_ESTADIA">🗑️ Exclusões de Estadia</option>
                        <option value="RECUPERAR_ESTADIA">🔄 Estadias Recuperadas</option>
                        <option value="PEDIDO_CRIADO">🛍️ Pedidos Criados</option>
                        <option value="ITEM_FORA_CARDAPIO">💡 Itens Fora do Menu</option>
                        <option value="CARDAPIO_NOVO_ITEM">✨ Itens Publicados no Menu</option>
                        <option value="CRIAR_ESTADIA">➕ Criações de Estadia</option>
                        <option value="EDITAR_ESTADIA">✏️ Edições de Estadia</option>
                        <option value="ARQUIVAR_ESTADIA">📦 Arquivamentos</option>
                        <option value="FINALIZAR_ESTADIA">✓ Finalizações</option>
                        <option value="REATIVAR_ESTADIA">⚡ Reativações</option>
                        <option value="LOGIN">🔑 Acessos ao Painel</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={15} aria-hidden="true" />
                    <input
                      type="text"
                      value={buscaLogs}
                      onChange={(e) => setBuscaLogs(e.target.value)}
                      placeholder="Buscar por pessoa, casa, ação..."
                      aria-label="Buscar no histórico por pessoa, casa ou ação"
                      className="w-full min-h-[40px] pl-9 pr-9 py-1.5 bg-stone-100 focus:bg-white text-xs text-stone-900 placeholder:text-stone-500 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                    />
                    {buscaLogs && (
                      <button
                        type="button"
                        onClick={() => setBuscaLogs('')}
                        aria-label="Limpar busca do histórico"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Sub-filtros da aba "Itens Fora do Menu / Sugestões" */
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-1">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: 'pendente', label: '🟡 Pendentes', count: sugestoesPendentesCount },
                        {
                          id: 'adicionado',
                          label: '🟢 Adicionados ao Menu',
                          count: todasSugestoes.filter((s) => s.status === 'adicionado').length
                        },
                        {
                          id: 'descartado',
                          label: '⚪ Descartados',
                          count: todasSugestoes.filter((s) => s.status === 'descartado').length
                        },
                        { id: 'todas', label: 'Todas as Sugestões', count: todasSugestoes.length }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFiltroStatusSugestao(tab.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          filtroStatusSugestao === tab.id
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${
                            filtroStatusSugestao === tab.id
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Fornecedor Dropdown + Busca */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={filtroFornecedorSugestao}
                      onChange={(e) => setFiltroFornecedorSugestao(e.target.value)}
                      aria-label="Filtrar sugestões por fornecedor"
                      className="min-h-[40px] bg-stone-100 text-xs font-bold text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                    >
                      <option value="todos">Todos os Fornecedores</option>
                      {Object.values(FORNECEDORES).map((f) => (
                        <option key={f.id} value={f.id}>
                          {EMOJI_FORNECEDORES[f.id] || '📦'} {f.nome}
                        </option>
                      ))}
                    </select>

                    <div className="relative sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={15} aria-hidden="true" />
                      <input
                        type="text"
                        value={buscaSugestoes}
                        onChange={(e) => setBuscaSugestoes(e.target.value)}
                        placeholder="Buscar por item, cozinheira, casa..."
                        aria-label="Buscar sugestões por item, cozinheira ou casa"
                        className="w-full min-h-[40px] pl-9 pr-9 py-1.5 bg-stone-100 focus:bg-white text-xs text-stone-900 placeholder:text-stone-500 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                      />
                      {buscaSugestoes && (
                        <button
                          type="button"
                          onClick={() => setBuscaSugestoes('')}
                          aria-label="Limpar busca de sugestões"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conteúdo: Lista de Estadias OU Visão Geral de Pedidos */}
            <div className="space-y-4">
              {abaPrincipal === 'estadias' ? (
                /* ========================================================= */
                /* LISTAGEM DE ESTADIAS                                      */
                /* ========================================================= */
                loadingEstadias ? (
                  <div className="text-center py-16 text-stone-600 flex flex-col items-center gap-2.5">
                    <RefreshCw className="animate-spin text-amber-600" size={24} aria-hidden="true" />
                    <p className="text-xs font-medium">Carregando estadias...</p>
                  </div>
                ) : estadias.length === 0 ? (
                  <div className="text-center py-14 sm:py-16 bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 space-y-3 shadow-xs">
                    <div className="w-14 h-14 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Home size={24} aria-hidden="true" />
                    </div>
                    <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                      Nenhuma estadia encontrada
                    </h4>
                    <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                      Não há estadias correspondentes ao filtro. Clique em &quot;Nova Estadia&quot; para cadastrar a primeira.
                    </p>
                  </div>
                ) : (
                  estadias.map((estadia) => {
                    const linkCardapio = `${window.location.origin}/e/${estadia.codigo}`;

                    return (
                      <div
                        key={estadia.id}
                        className="bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow space-y-3.5"
                      >
                        {/* Topo do Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-100 pb-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center justify-center font-bold shrink-0">
                              <Home size={18} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-stone-900 text-base leading-tight truncate">
                                {estadia.casa}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600 mt-0.5 tabular-nums">
                                <span className="flex items-center gap-1">
                                  <Calendar size={13} className="text-stone-500 shrink-0" aria-hidden="true" />
                                  {formatarDataBr(estadia.entrada)} até {formatarDataBr(estadia.saida)}
                                </span>
                                <span aria-hidden="true">•</span>
                                <span className="flex items-center gap-1">
                                  <Users size={13} className="text-stone-500 shrink-0" aria-hidden="true" />
                                  {estadia.hospedes} hóspede{estadia.hospedes > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Botão de Pedidos e Badge de Status */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAbrirPedidosEstadia(estadia)}
                              aria-label={`Ver ${estadia.total_pedidos ?? 0} pedidos de ${estadia.casa}`}
                              className="min-h-[38px] text-xs font-bold px-3.5 py-1.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-stone-800 rounded-full border border-stone-200 transition-colors flex items-center gap-1.5 tap-bounce cursor-pointer tabular-nums"
                              title="Ver pedidos desta estadia"
                            >
                              <ShoppingBag size={13} className="text-amber-700" aria-hidden="true" />
                              <span>{estadia.total_pedidos ?? 0} pedido{(estadia.total_pedidos ?? 0) !== 1 ? 's' : ''}</span>
                              <ChevronRight size={12} className="text-stone-500" aria-hidden="true" />
                            </button>

                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                estadia.status === 'ativa'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : estadia.status === 'finalizada'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-300'
                              }`}
                            >
                              {estadia.status === 'ativa'
                                ? '● Ativa'
                                : estadia.status === 'finalizada'
                                ? '✓ Finalizada'
                                : 'Arquivada'}
                            </span>
                          </div>
                        </div>

                        {/* Dados da Estadia */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700 bg-stone-50/80 p-3 rounded-xl border border-stone-200/70">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User size={14} className="text-stone-500 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              <strong className="text-stone-900">Titular:</strong> {estadia.titular}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ShieldAlert size={14} className="text-stone-500 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              <strong className="text-stone-900">Responsável:</strong> {estadia.funcionario}
                            </span>
                          </div>
                        </div>

                        {/* Rastreabilidade / Auditoria da Estadia */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600 px-1 tabular-nums">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-stone-500" aria-hidden="true" />
                            Cadastrada por: <strong className="text-stone-800">{estadia.criada_por_nome || estadia.funcionario || 'Equipe'}</strong>
                          </span>
                          {estadia.status === 'arquivada' && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1 text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Archive size={11} className="text-amber-700" aria-hidden="true" />
                                Arquivada por <strong>{estadia.arquivada_por_nome || 'Equipe'}</strong> {estadia.arquivada_em ? `em ${formatarDataHoraBahia(estadia.arquivada_em)}` : ''}
                              </span>
                            </>
                          )}
                          {estadia.status === 'finalizada' && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1 text-stone-800 font-semibold bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                <CheckCircle2 size={11} className="text-emerald-700" aria-hidden="true" />
                                Finalizada por <strong>{estadia.finalizada_por_nome || 'Equipe'}</strong> {estadia.finalizada_em ? `em ${formatarDataHoraBahia(estadia.finalizada_em)}` : ''}
                              </span>
                            </>
                          )}
                          {estadia.reativada_por_nome && estadia.status === 'ativa' && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1 text-emerald-900 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <RefreshCw size={11} className="text-emerald-700" aria-hidden="true" />
                                Reativada por <strong>{estadia.reativada_por_nome}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Link do Cardápio & Compartilhamento */}
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <span className="font-bold text-amber-950 shrink-0">Link da Cozinheira:</span>
                            <code className="text-amber-900 font-mono truncate text-xs bg-white px-2.5 py-1 rounded-lg border border-amber-200/80">
                              /e/{estadia.codigo}
                            </code>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopiarLink(estadia.codigo)}
                              aria-label={`Copiar link do cardápio de ${estadia.casa}`}
                              className="min-h-[40px] sm:min-h-[36px] px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors tap-bounce cursor-pointer"
                              title="Copiar URL do cardápio"
                            >
                              {copiedId === estadia.codigo ? (
                                <>
                                  <Check size={14} className="text-emerald-700" aria-hidden="true" />
                                  <span>Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} aria-hidden="true" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopiarMensagemWhatsApp(estadia)}
                              aria-label={`Copiar mensagem de WhatsApp para ${estadia.casa}`}
                              className="min-h-[40px] sm:min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors tap-bounce cursor-pointer"
                              title="Copiar texto para WhatsApp"
                            >
                              <Share2 size={14} aria-hidden="true" />
                              <span>WhatsApp</span>
                            </button>

                            <a
                              href={linkCardapio}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir cardápio de ${estadia.casa} em nova aba`}
                              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] p-2 text-amber-900 hover:text-amber-950 hover:bg-amber-100 rounded-xl border border-amber-200/70 bg-white/70 flex items-center justify-center transition-colors"
                              title="Abrir cardápio em nova aba"
                            >
                              <ExternalLink size={15} aria-hidden="true" />
                            </a>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEstadiaModalFinanceiro(estadia)}
                              className="min-h-[40px] px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer tap-bounce"
                              title="Gerenciar pagamentos, notas fiscais, saldos e despesas da estadia"
                            >
                              <CreditCard size={14} aria-hidden="true" />
                              <span>Pagamentos</span>
                              {estadia.adiantamentos && estadia.adiantamentos.length > 0 && (
                                <span className="bg-stone-950 text-white text-[11px] px-1.5 py-0.5 rounded-full font-black tabular-nums">
                                  {estadia.adiantamentos.length}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAbrirEditar(estadia)}
                              className="min-h-[40px] px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit3 size={14} aria-hidden="true" />
                              <span>Editar</span>
                            </button>

                            {estadia.status === 'ativa' && (
                              <button
                                type="button"
                                onClick={() => setEstadiaFinalizar(estadia)}
                                className="min-h-[40px] px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 size={14} aria-hidden="true" />
                                <span>Finalizar</span>
                              </button>
                            )}

                            {estadia.status === 'finalizada' && (
                              <button
                                type="button"
                                disabled
                                className="min-h-[40px] px-3.5 py-2 bg-stone-100 text-stone-500 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed border border-dashed border-stone-300"
                                title="Recurso em desenvolvimento"
                              >
                                <Sparkles size={14} aria-hidden="true" />
                                <span>Gerar apresentação (em breve)</span>
                              </button>
                            )}

                            {estadia.status !== 'arquivada' ? (
                              <button
                                type="button"
                                onClick={() => handleArquivar(estadia)}
                                className="min-h-[40px] px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Archive size={14} aria-hidden="true" />
                                <span>Arquivar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReativar(estadia)}
                                className="min-h-[40px] px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RefreshCw size={14} aria-hidden="true" />
                                <span>Reativar</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEstadiaExcluir(estadia);
                              setNomeConfirmacaoExclusao('');
                            }}
                            aria-label={`Excluir estadia ${estadia.casa}`}
                            className="min-h-[40px] px-3.5 py-2 text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Excluir estadia e pedidos"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : abaPrincipal === 'pedidos' ? (
                /* ========================================================= */
                /* VISÃO GERAL DE TODOS OS PEDIDOS (CRONOLÓGICA)             */
                /* ========================================================= */
                loadingPedidosGlobais ? (
                  <div className="text-center py-16 text-stone-600 flex flex-col items-center gap-2.5">
                    <RefreshCw className="animate-spin text-amber-600" size={24} aria-hidden="true" />
                    <p className="text-xs font-medium">Carregando pedidos...</p>
                  </div>
                ) : pedidosFiltrados.length === 0 ? (
                  <div className="text-center py-14 sm:py-16 bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 space-y-3 shadow-xs">
                    <div className="w-14 h-14 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <ShoppingBag size={24} aria-hidden="true" />
                    </div>
                    <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                      {filtroStatusPedido === 'ativos'
                        ? 'Nenhum pedido ativo no momento'
                        : 'Nenhum pedido encontrado'}
                    </h4>
                    <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                      {filtroStatusPedido === 'ativos'
                        ? 'Não há pedidos em aprovação, envio para fornecedor ou preparação no momento. Clique na aba "Todos os Pedidos" ou "Finalizados" para ver o histórico.'
                        : 'Os pedidos finalizados pela cozinheira no link da estadia aparecerão aqui em tempo real.'}
                    </p>
                  </div>
                ) : (
                  pedidosFiltrados.map((ped) => {
                    const totalItens = Array.isArray(ped.itens) ? ped.itens.length : 0;
                    const dadosEstadia = ped.estadia || {};
                    const statusPed: StatusPedido = ped.status || 'em_aprovacao';
                    const qtdAnexos = Array.isArray(ped.anexos) ? ped.anexos.length : 0;

                    return (
                      <div
                        key={ped.id}
                        className="bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-sm border border-amber-200 shrink-0 mt-0.5 tabular-nums">
                            #{ped.numero}
                          </div>

                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-stone-900 text-sm tabular-nums">
                                Pedido #{ped.numero}
                              </h4>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-stone-100 text-stone-800 rounded-full border border-stone-200">
                                {dadosEstadia.casa || 'Casa'}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                              </span>

                              {/* Badge de Status do Pedido */}
                              <span
                                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                  statusPed === 'em_aprovacao'
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : statusPed === 'enviar_fornecedores'
                                    ? 'bg-sky-100 text-sky-950 border-sky-300'
                                    : statusPed === 'preparacao_entrega'
                                    ? 'bg-purple-100 text-purple-950 border-purple-300'
                                    : statusPed === 'finalizado'
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                    : 'bg-red-100 text-red-950 border-red-300'
                                }`}
                              >
                                {statusPed === 'em_aprovacao'
                                  ? '⏳ Em Aprovação'
                                  : statusPed === 'enviar_fornecedores'
                                  ? '📤 Enviar Fornecedor'
                                  : statusPed === 'preparacao_entrega'
                                  ? '📦 Preparação & Entrega'
                                  : statusPed === 'finalizado'
                                  ? '✓ Finalizado'
                                  : '❌ Rejeitado'}
                              </span>

                              {qtdAnexos > 0 && (
                                <span className="text-[11px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1 tabular-nums">
                                  <Paperclip size={11} aria-hidden="true" />
                                  <span>{qtdAnexos} anexo(s)</span>
                                </span>
                              )}
                            </div>

                            {/* Trilha de Auditoria do Pedido */}
                            <div className="flex items-center gap-2 text-xs text-stone-600 flex-wrap tabular-nums">
                              <span className="flex items-center gap-1 text-stone-800 font-medium">
                                <ChefHat size={13} className="text-amber-700" aria-hidden="true" />
                                {ped.cozinheira}
                              </span>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} className="text-stone-500" aria-hidden="true" />
                                {formatarDataHoraBahia(ped.finalizado_em)}
                              </span>

                              {ped.aprovado_por_nome && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="text-sky-900 font-medium">
                                    Aprovado por {ped.aprovado_por_nome}
                                  </span>
                                </>
                              )}

                              {ped.rejeitado_por_nome && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="text-red-900 font-medium">
                                    Rejeitado por {ped.rejeitado_por_nome}
                                  </span>
                                </>
                              )}

                              {ped.enviado_fornecedor_por_nome && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="text-purple-900 font-medium">
                                    Enviado aos fornecedores por {ped.enviado_fornecedor_por_nome}
                                  </span>
                                </>
                              )}

                              {ped.concluido_por_nome && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="text-emerald-900 font-medium">
                                    Finalizado por {ped.concluido_por_nome}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação Rápida */}
                        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                          {statusPed === 'em_aprovacao' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'enviar_fornecedores')}
                                className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer tap-bounce"
                                title="Aprovar pedido para envio ao fornecedor"
                              >
                                <CheckCircle2 size={14} aria-hidden="true" />
                                <span>Aprovar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'rejeitado')}
                                className="min-h-[40px] px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl text-xs font-bold border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Rejeitar pedido"
                              >
                                <XCircle size={14} aria-hidden="true" />
                                <span>Rejeitar</span>
                              </button>
                            </>
                          )}

                          {statusPed === 'rejeitado' && (
                            <button
                              type="button"
                              onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'em_aprovacao')}
                              className="min-h-[40px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer tap-bounce"
                              title="Desfazer rejeição e voltar para aprovação"
                            >
                              <RotateCcw size={14} aria-hidden="true" />
                              <span>Voltar p/ Aprovação</span>
                            </button>
                          )}

                          {statusPed === 'enviar_fornecedores' && (
                            <button
                              type="button"
                              onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'preparacao_entrega')}
                              className="min-h-[40px] px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer tap-bounce"
                              title="Marcar como enviado aos fornecedores"
                            >
                              <Send size={14} aria-hidden="true" />
                              <span>Marcar Enviado</span>
                            </button>
                          )}

                          {statusPed === 'preparacao_entrega' && (
                            <button
                              type="button"
                              onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'finalizado')}
                              className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer tap-bounce"
                              title="Concluir e finalizar o pedido"
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                              <span>Finalizar Pedido</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => baixarPlanilhaPedido(ped, dadosEstadia)}
                            aria-label={`Baixar planilha Excel do pedido #${ped.numero}`}
                            className="min-w-[40px] min-h-[40px] p-2 sm:px-3 sm:py-2 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Baixar planilha (.xlsx)"
                          >
                            <FileSpreadsheet size={15} className="text-emerald-700" aria-hidden="true" />
                            <span className="hidden sm:inline">Excel</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPedidoDetalhe({ pedido: ped, estadia: dadosEstadia })}
                            className="min-h-[40px] px-3.5 py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer tap-bounce"
                            title="Ver pedido de compra completo"
                          >
                            <Eye size={14} aria-hidden="true" />
                            <span>Ver Pedido</span>
                            <ChevronRight size={14} aria-hidden="true" />
                          </button>
                        </div>

                        {/* Prévia dos itens do pedido */}
                        {Array.isArray(ped.itens) && ped.itens.length > 0 && (
                          <div className="w-full bg-stone-50/90 rounded-xl p-2.5 border border-stone-200/80 text-xs mt-1">
                            <div className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 tabular-nums">
                              <ShoppingBag size={12} className="text-amber-700" aria-hidden="true" />
                              <span>Itens do Pedido de Compras ({ped.itens.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                              {ped.itens.slice(0, 8).map((it: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-stone-800 text-[11px] font-medium border border-stone-200 shadow-2xs"
                                >
                                  <strong className="text-stone-950 font-bold tabular-nums">{it.quantidade} {it.unidade}</strong>
                                  <span>{it.item || it.nome}</span>
                                </span>
                              ))}
                              {ped.itens.length > 8 && (
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 tabular-nums">
                                  +{ped.itens.length - 8} outros itens...
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : abaPrincipal === 'historico' ? (
                /* ========================================================= */
                /* HISTÓRICO DE AÇÕES & AUDITORIA (QUEM ARQUIVOU, ETC)        */
                /* ========================================================= */
                loadingLogs ? (
                  <div className="text-center py-16 text-stone-600 flex flex-col items-center gap-2.5">
                    <RefreshCw className="animate-spin text-amber-600" size={24} aria-hidden="true" />
                    <p className="text-xs font-medium">Carregando histórico de auditoria...</p>
                  </div>
                ) : logsAuditoria.length === 0 ? (
                  <div className="text-center py-14 sm:py-16 bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 space-y-3 shadow-xs">
                    <div className="w-14 h-14 bg-stone-100 text-stone-600 border border-stone-200 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <History size={24} aria-hidden="true" />
                    </div>
                    <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                      Nenhuma atividade registrada
                    </h4>
                    <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                      Todas as ações no sistema (criação, arquivamento, finalização, exclusão, reativação e pedidos) serão registradas com nome do responsável, data e hora.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logsAuditoria.map((log) => {
                      let icone = <Activity size={16} className="text-stone-600" />;
                      let estiloBadge = 'bg-stone-100 text-stone-700 border-stone-200';
                      let rotuloAcao = 'Ação';

                      if (log.tipo_acao === 'ARQUIVAR_ESTADIA') {
                        icone = <Archive size={16} className="text-amber-700" />;
                        estiloBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                        rotuloAcao = 'Arquivamento';
                      } else if (log.tipo_acao === 'EXCLUIR_ESTADIA') {
                        icone = <Trash2 size={16} className="text-red-700" />;
                        estiloBadge = 'bg-red-50 text-red-800 border-red-200';
                        rotuloAcao = 'Exclusão';
                      } else if (log.tipo_acao === 'CRIAR_ESTADIA') {
                        icone = <Plus size={16} className="text-emerald-700" />;
                        estiloBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        rotuloAcao = 'Criação';
                      } else if (log.tipo_acao === 'EDITAR_ESTADIA') {
                        icone = <Edit3 size={16} className="text-blue-700" />;
                        estiloBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                        rotuloAcao = 'Edição';
                      } else if (log.tipo_acao === 'FINALIZAR_ESTADIA') {
                        icone = <CheckCircle2 size={16} className="text-stone-800" />;
                        estiloBadge = 'bg-stone-100 text-stone-800 border-stone-300';
                        rotuloAcao = 'Finalização';
                      } else if (log.tipo_acao === 'REATIVAR_ESTADIA') {
                        icone = <RefreshCw size={16} className="text-teal-700" />;
                        estiloBadge = 'bg-teal-50 text-teal-800 border-teal-200';
                        rotuloAcao = 'Reativação';
                      } else if (log.tipo_acao === 'RECUPERAR_ESTADIA') {
                        icone = <RotateCcw size={16} className="text-teal-700" />;
                        estiloBadge = 'bg-teal-50 text-teal-800 border-teal-200';
                        rotuloAcao = 'Recuperação';
                      } else if (log.tipo_acao === 'PEDIDO_CRIADO') {
                        icone = <ShoppingBag size={16} className="text-purple-700" />;
                        estiloBadge = 'bg-purple-50 text-purple-800 border-purple-200';
                        rotuloAcao = 'Pedido Criado';
                      } else if (log.tipo_acao === 'ITEM_FORA_CARDAPIO') {
                        icone = <Lightbulb size={16} className="text-amber-700" />;
                        estiloBadge = 'bg-amber-50 text-amber-900 border-amber-300';
                        rotuloAcao = 'Item Fora do Menu';
                      } else if (log.tipo_acao === 'CARDAPIO_NOVO_ITEM') {
                        icone = <Sparkles size={16} className="text-emerald-700" />;
                        estiloBadge = 'bg-emerald-50 text-emerald-900 border-emerald-300';
                        rotuloAcao = 'Novo Item no Cardápio';
                      } else if (log.tipo_acao === 'LOGIN') {
                        icone = <Lock size={16} className="text-stone-700" />;
                        estiloBadge = 'bg-stone-100 text-stone-700 border-stone-200';
                        rotuloAcao = 'Acesso';
                      }

                      const isEstadiaAtivaAgora = todasEstadias.some(
                        (e) =>
                          e.id === log.estadia_id ||
                          (e.casa && log.estadia_casa && e.casa.toLowerCase() === log.estadia_casa.toLowerCase() && e.status === 'ativa')
                      );

                      return (
                        <div
                          key={log.id}
                          className="bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 bg-stone-50 border-stone-200">
                              {icone}
                            </div>

                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${estiloBadge}`}>
                                  {rotuloAcao}
                                </span>
                                {log.estadia_casa && (
                                  <span className="text-[11px] font-bold text-amber-950 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                    <Home size={12} className="text-amber-700" aria-hidden="true" />
                                    {log.estadia_casa}
                                  </span>
                                )}
                                <span className="font-extrabold text-stone-900 text-sm">
                                  {log.titulo}
                                </span>
                              </div>

                              {/* Descrição do Log com suporte a quebras de linha e detalhamento de O QUE FOI EDITADO */}
                              {log.tipo_acao === 'PEDIDO_EDITADO' ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-stone-700 font-semibold leading-relaxed">
                                    {log.descricao.split('\nO que foi editado')[0].split('\nModificações')[0]}
                                  </p>

                                  {/* Se tiver lista estruturada em dados_backup */}
                                  {Array.isArray(log.dados_backup?.alteracoes) && log.dados_backup.alteracoes.length > 0 ? (
                                    <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-2.5 space-y-1.5">
                                      <span className="text-[11px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5 tabular-nums">
                                        <Edit3 size={11} className="text-amber-700" aria-hidden="true" />
                                        <span>O que foi editado ({log.dados_backup.alteracoes.length} {log.dados_backup.alteracoes.length === 1 ? 'item' : 'itens'}):</span>
                                      </span>
                                      <div className="flex flex-col gap-1">
                                        {log.dados_backup.alteracoes.map((alt: string, aIdx: number) => {
                                          const isRemovido = alt.includes('➖');
                                          const isAdicionado = alt.includes('➕');
                                          return (
                                            <div
                                              key={aIdx}
                                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
                                                isRemovido
                                                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                                                  : isAdicionado
                                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                  : 'bg-amber-100/70 border-amber-200 text-amber-950'
                                              }`}
                                            >
                                              <span>{alt}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : log.descricao.includes('\n• ') ? (
                                    <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-2.5 space-y-1">
                                      <span className="text-[11px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                                        <Edit3 size={11} className="text-amber-700" aria-hidden="true" />
                                        <span>O que foi editado:</span>
                                      </span>
                                      <div className="text-xs text-stone-800 space-y-1 whitespace-pre-line font-medium">
                                        {log.descricao.substring(log.descricao.indexOf('\n• ')).trim()}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                                  {log.descricao}
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-[11px] text-stone-600 pt-0.5">
                                <span className="flex items-center gap-1 font-semibold text-stone-800">
                                  <User size={12} className="text-stone-500" aria-hidden="true" />
                                  {log.usuario_nome}
                                  {log.usuario_login && (
                                    <span className="text-stone-600 font-mono text-[11px]">
                                      (@{log.usuario_login})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Data/Hora e Botões de Ação Específicos */}
                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-stone-100 flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-2 text-xs text-stone-600">
                            <span className="flex items-center gap-1.5 font-semibold text-stone-800 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 tabular-nums">
                              <Clock size={13} className="text-amber-600" aria-hidden="true" />
                              {formatarDataHoraBahia(log.criado_em)}
                            </span>

                            {/* Botão de Recuperar na aba/filtro de Exclusão */}
                            {log.tipo_acao === 'EXCLUIR_ESTADIA' && (
                              <div className="flex items-center gap-2 mt-1">
                                {isEstadiaAtivaAgora ? (
                                  <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <Check size={12} className="text-emerald-700" aria-hidden="true" />
                                    <span>Ativa em Estadias</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRecuperarEstadia(log)}
                                    disabled={recuperandoId === log.id}
                                    className="min-h-[38px] px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all tap-bounce cursor-pointer"
                                    title="Recuperar esta estadia e fazê-la voltar para a aba de Estadias"
                                  >
                                    <RotateCcw size={13} className={recuperandoId === log.id ? 'animate-spin' : ''} aria-hidden="true" />
                                    <span>{recuperandoId === log.id ? 'Recuperando...' : 'Recuperar Estadia'}</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Botão para ver Pedido Criado */}
                            {log.tipo_acao === 'PEDIDO_CRIADO' && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAbaPrincipal('pedidos');
                                    if (log.estadia_casa) setBuscaPedidos(log.estadia_casa);
                                  }}
                                  className="min-h-[36px] px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold rounded-xl text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Ver este pedido no painel"
                                >
                                  <ShoppingBag size={12} className="text-purple-700" aria-hidden="true" />
                                  <span>Ver Pedidos</span>
                                </button>
                              </div>
                            )}

                            {/* Botão para ver Item Fora do Menu */}
                            {(log.tipo_acao === 'ITEM_FORA_CARDAPIO' || log.tipo_acao === 'CARDAPIO_NOVO_ITEM') && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAbaPrincipal('sugestoes');
                                  }}
                                  className="min-h-[36px] px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 font-bold rounded-xl text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Ver itens fora do cardápio"
                                >
                                  <Lightbulb size={12} className="text-amber-700" aria-hidden="true" />
                                  <span>Ver Sugestões</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ========================================================= */
                /* ITENS FORA DO MENU / SUGESTÕES DAS COZINHEIRAS             */
                /* ========================================================= */
                <div className="space-y-4">
                  {/* Banner Explicativo */}
                  <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border border-amber-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm font-black">
                        <Lightbulb size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                          <span>Itens Fora do Cardápio</span>
                          {sugestoesPendentesCount > 0 ? (
                            <span className="text-[11px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full font-black animate-pulse tabular-nums">
                              {sugestoesPendentesCount} pendente{sugestoesPendentesCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-bold">
                              Tudo revisado
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-stone-700 mt-0.5 max-w-2xl leading-relaxed">
                          Sempre que uma cozinheira ou cliente adicionar um produto que não existe no menu oficial, ele aparece aqui automaticamente. Você pode avaliar, escolher a categoria e publicar no cardápio de todas as casas!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Sugestões */}
                  {loadingPedidosGlobais ? (
                    <div className="text-center py-16 text-stone-600 flex flex-col items-center gap-2.5">
                      <RefreshCw className="animate-spin text-amber-600" size={24} aria-hidden="true" />
                      <p className="text-xs font-medium">Carregando sugestões de itens...</p>
                    </div>
                  ) : sugestoesFiltradas.length === 0 ? (
                    <div className="text-center py-14 sm:py-16 bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 space-y-3 shadow-xs">
                      <div className="w-14 h-14 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                        <Lightbulb size={24} aria-hidden="true" />
                      </div>
                      <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                        Nenhum item fora do menu encontrado
                      </h4>
                      <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                        {filtroStatusSugestao === 'pendente'
                          ? 'Excelente! Não há nenhum item customizado pendente de avaliação no momento.'
                          : 'Nenhuma sugestão encontrada com os filtros selecionados.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {sugestoesFiltradas.map((sug) => {
                        const forn = FORNECEDORES[sug.fornecedor as FornecedorId];
                        const isPendente = sug.status === 'pendente';
                        const isAdicionado = sug.status === 'adicionado';
                        const isDescartado = sug.status === 'descartado';

                        return (
                          <div
                            key={sug.id}
                            className={`bg-white rounded-3xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
                              isPendente
                                ? 'border-amber-300 ring-2 ring-amber-400/20'
                                : isAdicionado
                                ? 'border-emerald-200 bg-emerald-50/20'
                                : 'border-stone-200 opacity-85'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <span>{EMOJI_FORNECEDORES[sug.fornecedor] || '📦'}</span>
                                    <span>{forn?.nome || sug.fornecedor}</span>
                                  </span>

                                  {isPendente && (
                                    <span className="text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-0.5 rounded-xl flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                                      <span>Aguardando Avaliação</span>
                                    </span>
                                  )}
                                  {isAdicionado && (
                                    <span className="text-[11px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                                      <CheckCircle2 size={13} className="text-emerald-700" aria-hidden="true" />
                                      <span>Publicado no Cardápio Oficial</span>
                                    </span>
                                  )}
                                  {isDescartado && (
                                    <span className="text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300 px-2.5 py-0.5 rounded-xl">
                                      Descartado
                                    </span>
                                  )}

                                  <span className="text-[11px] font-bold text-stone-700 bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-200">
                                    Unidade pedida: <strong className="text-stone-900">{sug.unidade}</strong>
                                  </span>
                                </div>

                                <h3 className="text-base sm:text-lg font-black text-stone-900">
                                  {sug.nome}
                                </h3>

                                {/* Observações feitas pela cozinheira */}
                                {sug.observacoes.length > 0 && (
                                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2.5 text-xs text-amber-950 flex items-start gap-2 mt-2">
                                    <ChefHat size={14} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                                    <div>
                                      <strong className="font-bold">Observação da cozinheira:</strong>
                                      <div className="italic text-stone-700 mt-0.5 space-y-0.5">
                                        {sug.observacoes.map((obs, idx) => (
                                          <p key={idx}>"{obs}"</p>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex items-center gap-2 self-start shrink-0 flex-wrap sm:flex-nowrap">
                                {isPendente && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirAdicionarAoCardapio(sug)}
                                      className="min-h-[40px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer tap-bounce"
                                    >
                                      <Plus size={15} aria-hidden="true" />
                                      <span>Adicionar ao Cardápio</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleAlterarStatusSugestao(sug.nome, 'descartado')}
                                      className="min-h-[40px] px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Descartar esta sugestão"
                                    >
                                      <X size={14} aria-hidden="true" />
                                      <span>Descartar</span>
                                    </button>
                                  </>
                                )}

                                {isAdicionado && (
                                  <div className="flex items-center gap-2">
                                    <span className="min-h-[38px] text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                                      <Check size={14} aria-hidden="true" />
                                      <span>Já no Cardápio</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAlterarStatusSugestao(sug.nome, 'pendente')}
                                      className="min-h-[38px] px-3 py-1.5 text-stone-700 hover:text-stone-950 text-xs font-bold rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                                      title="Reabrir como pendente"
                                    >
                                      Reabrir
                                    </button>
                                  </div>
                                )}

                                {isDescartado && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAlterarStatusSugestao(sug.nome, 'pendente')}
                                      className="min-h-[38px] px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <RotateCcw size={13} aria-hidden="true" />
                                      <span>Reativar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirAdicionarAoCardapio(sug)}
                                      className="min-h-[38px] px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Plus size={14} aria-hidden="true" />
                                      <span>Adicionar ao Menu</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rodapé do Card: Histórico de quem pediu */}
                            <div className="border-t border-stone-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600 tabular-nums">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-stone-800">
                                  Solicitado em {sug.total_pedidos} {sug.total_pedidos === 1 ? 'pedido' : 'pedidos'} ({sug.total_quantidade} {sug.unidade} total):
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {sug.pedidos.map((ped, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const pedEncontrado = pedidosGlobais.find((p) => p.id === ped.pedido_id);
                                        if (pedEncontrado) {
                                          setPedidoDetalhe({
                                            pedido: pedEncontrado,
                                            estadia: pedEncontrado.estadia
                                          });
                                        }
                                      }}
                                      className="bg-stone-100 hover:bg-amber-100 hover:text-amber-950 border border-stone-200 text-stone-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                      title="Clique para ver os detalhes deste pedido"
                                    >
                                      <ShoppingBag size={11} className="text-amber-700" aria-hidden="true" />
                                      <span>
                                        Pedido #{ped.pedido_numero} ({ped.estadia_casa} - {ped.cozinheira})
                                      </span>
                                      <span className="font-bold text-stone-950">
                                        &bull; {ped.quantidade} {sug.unidade}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="text-[11px] text-stone-600 shrink-0 font-medium">
                                Última vez: {formatarDataHoraBahia(sug.ultima_vez_pedido)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        )}

      {/* ========================================================= */}
      {/* MODAL DE PEDIDOS DE UMA ESTADIA ESPECÍFICA                */}
      {/* ========================================================= */}
      {estadiaModalPedidos && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between gap-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base leading-tight truncate">
                    Pedidos da {estadiaModalPedidos.casa}
                  </h3>
                  <p className="text-xs text-stone-300">
                    Histórico de compras enviadas pela cozinheira
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEstadiaModalPedidos(null)}
                aria-label="Fechar modal de pedidos"
                className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {loadingPedidosDaEstadia ? (
                <div className="text-center py-12 text-stone-600 flex flex-col items-center gap-2">
                  <RefreshCw className="animate-spin text-amber-600" size={24} aria-hidden="true" />
                  <p className="text-xs font-medium">Carregando pedidos da estadia...</p>
                </div>
              ) : pedidosDaEstadia.length === 0 ? (
                <div className="text-center py-12 text-stone-600 space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto border border-stone-200">
                    <ShoppingBag size={24} aria-hidden="true" />
                  </div>
                  <p className="font-bold text-sm text-stone-900">Nenhum pedido finalizado ainda.</p>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto">
                    Os pedidos enviados pela cozinheira através do link aparecerão listados aqui.
                  </p>
                </div>
              ) : (
                pedidosDaEstadia.map((ped) => {
                  const totalItens = Array.isArray(ped.itens) ? ped.itens.length : 0;
                  const statusPed: StatusPedido = ped.status || 'em_aprovacao';

                  return (
                    <div
                      key={ped.id}
                      className="bg-stone-50 hover:bg-white rounded-2xl border border-stone-200 p-4 transition-all space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm border border-amber-200 shrink-0 tabular-nums">
                            #{ped.numero}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-sm tabular-nums">
                                Pedido #{ped.numero}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 tabular-nums">
                                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                              </span>
                              <span
                                className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                                  statusPed === 'em_aprovacao'
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : statusPed === 'enviar_fornecedores'
                                    ? 'bg-sky-100 text-sky-950 border-sky-300'
                                    : statusPed === 'preparacao_entrega'
                                    ? 'bg-purple-100 text-purple-950 border-purple-300'
                                    : statusPed === 'finalizado'
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                    : 'bg-red-100 text-red-950 border-red-300'
                                }`}
                              >
                                {statusPed === 'em_aprovacao'
                                  ? '⏳ Em Aprovação'
                                  : statusPed === 'enviar_fornecedores'
                                  ? '📤 Enviar Fornecedor'
                                  : statusPed === 'preparacao_entrega'
                                  ? '📦 Preparação & Entrega'
                                  : statusPed === 'finalizado'
                                  ? '✓ Finalizado'
                                  : '❌ Rejeitado'}
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 flex items-center gap-2 mt-0.5 tabular-nums flex-wrap">
                              <span className="text-stone-800 font-medium">
                                Cozinheira: {ped.cozinheira}
                              </span>
                              <span aria-hidden="true">•</span>
                              <span>{formatarDataHoraBahia(ped.finalizado_em)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center shrink-0">
                          {statusPed === 'em_aprovacao' && (
                            <button
                              type="button"
                              onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'enviar_fornecedores')}
                              className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Aprovar pedido"
                            >
                              <CheckCircle2 size={13} aria-hidden="true" />
                              <span>Aprovar</span>
                            </button>
                          )}

                          {statusPed === 'enviar_fornecedores' && (
                            <button
                              type="button"
                              onClick={() => handleAlterarStatusPedidoRapido(ped.id, 'preparacao_entrega')}
                              className="min-h-[38px] px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Marcar como enviado ao fornecedor"
                            >
                              <Send size={13} aria-hidden="true" />
                              <span>Enviado</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => baixarPlanilhaPedido(ped, estadiaModalPedidos)}
                            aria-label={`Baixar planilha Excel do pedido #${ped.numero}`}
                            className="min-w-[38px] min-h-[38px] p-2 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 rounded-xl border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Baixar planilha (.xlsx)"
                          >
                            <FileSpreadsheet size={15} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPedidoDetalhe({ pedido: ped, estadia: estadiaModalPedidos })}
                            className="min-h-[38px] px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer tap-bounce"
                            title="Ver pedido de compras completo"
                          >
                            <Eye size={13} aria-hidden="true" />
                            <span>Ver Pedido</span>
                            <ChevronRight size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Prévia dos itens do pedido visíveis no card */}
                      {Array.isArray(ped.itens) && ped.itens.length > 0 && (
                        <div className="bg-white rounded-xl p-2.5 border border-stone-200/90 text-xs">
                          <div className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 tabular-nums">
                            <ShoppingBag size={11} className="text-amber-700" aria-hidden="true" />
                            <span>Itens do Pedido de Compras ({ped.itens.length}):</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {ped.itens.slice(0, 8).map((it: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200 shadow-2xs"
                              >
                                <strong className="text-stone-950 font-bold tabular-nums">{it.quantidade} {it.unidade}</strong>
                                <span>{it.item || it.nome}</span>
                              </span>
                            ))}
                            {ped.itens.length > 8 && (
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 tabular-nums">
                                +{ped.itens.length - 8} outros itens...
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE DETALHES COMPLETOS DO PEDIDO (COM EXCEL & PRINT) */}
      {/* ========================================================= */}
      {pedidoDetalhe && (
        <DetalhesPedidoModal
          pedido={pedidoDetalhe.pedido}
          estadia={pedidoDetalhe.estadia}
          onClose={() => setPedidoDetalhe(null)}
          onAtualizarPedido={(pedidoAtualizado) => {
            setPedidosGlobais((prev) =>
              prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
            );
            setPedidosDaEstadia((prev) =>
              prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
            );
            setPedidoDetalhe({
              pedido: pedidoAtualizado,
              estadia: pedidoDetalhe.estadia
            });
            setVersaoFinanceiro((v) => v + 1);
            carregarLogsAuditoria();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL DE GERENCIAMENTO DE PAGAMENTOS DA ESTADIA           */}
      {/* ========================================================= */}
      {estadiaModalFinanceiro && (
        <GerenciamentoPagamentosModal
          estadia={estadiaModalFinanceiro}
          versaoAtualizacao={versaoFinanceiro}
          onClose={() => setEstadiaModalFinanceiro(null)}
          onEstadiaAtualizada={(atualizada) => {
            setEstadiaModalFinanceiro(atualizada);
            setTodasEstadias((prev) =>
              prev.map((e) => (e.id === atualizada.id ? { ...e, ...atualizada } : e))
            );
            carregarLogsAuditoria();
          }}
          onPedidoAtualizado={(pedidoAtualizado) => {
            setPedidosGlobais((prev) =>
              prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
            );
            setPedidosDaEstadia((prev) =>
              prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
            );
            setPedidoDetalhe((prev) => {
              if (prev && prev.pedido.id === pedidoAtualizado.id) {
                return { ...prev, pedido: { ...prev.pedido, ...pedidoAtualizado } };
              }
              return prev;
            });
            carregarLogsAuditoria();
          }}
          onAbrirPedido={async (pedidoId, pedidoObj) => {
            let ped = pedidoObj ||
              pedidosGlobais.find((p) => p.id === pedidoId) ||
              pedidosDaEstadia.find((p) => p.id === pedidoId);

            if (!ped && pedidoId) {
              try {
                const peds = await listarPedidosPorEstadia(estadiaModalFinanceiro?.id || '');
                ped = peds.find((p) => p.id === pedidoId);
              } catch (err) {
                console.error('Erro ao buscar pedido da estadia:', err);
              }
            }

            if (ped) {
              setPedidoDetalhe({
                pedido: ped,
                estadia: estadiaModalFinanceiro || ped.estadia
              });
            }
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL CRIAR / EDITAR ESTADIA                              */}
      {/* ========================================================= */}
      {modalForm.aberto && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  {modalForm.modo === 'criar' ? 'Nova Estadia' : 'Editar Estadia'}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  {modalForm.modo === 'criar'
                    ? 'Preencha os dados da estadia para gerar o link do cardápio.'
                    : 'Atualize os dados cadastrais da estadia.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalForm({ aberto: false, modo: 'criar' })}
                aria-label="Fechar modal de estadia"
                className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium flex items-center gap-2"
              >
                <AlertTriangle size={15} className="shrink-0 text-red-600" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSalvarForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nome da Casa *
                </label>
                <input
                  type="text"
                  required
                  value={formCasa}
                  onChange={(e) => setFormCasa(e.target.value)}
                  placeholder="Ex: Villa Trancoso, Casa das Falésias..."
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm text-stone-900 placeholder:text-stone-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Data de Entrada *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEntrada}
                    onChange={(e) => setFormEntrada(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm text-stone-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Data de Saída *
                  </label>
                  <input
                    type="date"
                    required
                    value={formSaida}
                    onChange={(e) => setFormSaida(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm text-stone-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Nº de Hóspedes *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={formHospedes}
                    onChange={(e) => setFormHospedes(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm text-stone-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Responsável (Equipe) *
                  </label>
                  <select
                    required
                    value={formFuncionario}
                    onChange={(e) => setFormFuncionario(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm bg-white font-medium text-stone-900 cursor-pointer shadow-2xs"
                  >
                    <option value="" disabled>Selecione o responsável...</option>
                    {USUARIOS_EQUIPE.map((user) => (
                      <option key={user.login} value={user.nome}>
                        {user.nome} ({user.cargo})
                      </option>
                    ))}
                    {formFuncionario && !USUARIOS_EQUIPE.some((u) => u.nome === formFuncionario) && (
                      <option value={formFuncionario}>{formFuncionario}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Titular da Hospedagem *
                </label>
                <input
                  type="text"
                  required
                  value={formTitular}
                  onChange={(e) => setFormTitular(e.target.value)}
                  placeholder="Nome completo do hóspede titular"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm text-stone-900 placeholder:text-stone-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalForm({ aberto: false, modo: 'criar' })}
                  className="min-h-[40px] px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSalvando}
                  className="min-h-[40px] px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer tap-bounce"
                >
                  {formSalvando ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} aria-hidden="true" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Estadia</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE FINALIZAÇÃO                       */}
      {/* ========================================================= */}
      {estadiaFinalizar && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-4 animate-modal-in">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
              <CheckCircle2 size={24} aria-hidden="true" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-stone-900 text-base">
                Finalizar Estadia &quot;{estadiaFinalizar.casa}&quot;?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Ao finalizar esta estadia, o link deixará de aceitar novos pedidos pela cozinheira. Os pedidos já realizados permanecerão gravados para consulta.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEstadiaFinalizar(null)}
                className="min-h-[40px] px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={finalizando}
                onClick={handleConfirmarFinalizar}
                className="min-h-[40px] px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer tap-bounce"
              >
                {finalizando ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} aria-hidden="true" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <span>Confirmar Finalização</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADICIONAR ITEM AO CARDÁPIO OFICIAL                   */}
      {/* ========================================================= */}
      {modalNovoItem.aberto && (
        <div className="fixed inset-0 z-80 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between gap-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Lightbulb size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base leading-tight">
                    Adicionar Produto ao Cardápio Oficial
                  </h3>
                  <p className="text-xs text-stone-300">
                    Disponibilize este produto oficialmente para todas as casas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoItem({ aberto: false })}
                aria-label="Fechar modal de novo produto"
                className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoItemCardapio} className="p-5 sm:p-6 space-y-4">
              {formNovoErro && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2"
                >
                  <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
                  <span>{formNovoErro}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nome do Produto no Cardápio *
                </label>
                <input
                  type="text"
                  required
                  value={formNovoNome}
                  onChange={(e) => setFormNovoNome(e.target.value)}
                  placeholder="Ex: Polvo em Postas, Queijo Parmesão..."
                  className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm font-semibold text-stone-900 placeholder:text-stone-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Fornecedor *
                  </label>
                  <select
                    value={formNovoFornecedor}
                    onChange={(e) => {
                      const novoForn = e.target.value as FornecedorId;
                      setFormNovoFornecedor(novoForn);
                      const subcats = SUBCATEGORIAS_POR_FORNECEDOR[novoForn] || ['Outros'];
                      setFormNovoSubcategoria(subcats[0]);
                    }}
                    className="w-full min-h-[42px] px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs font-bold bg-white cursor-pointer"
                  >
                    {Object.values(FORNECEDORES).map((f) => (
                      <option key={f.id} value={f.id}>
                        {EMOJI_FORNECEDORES[f.id] || '📦'} {f.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Subcategoria *
                  </label>
                  <select
                    value={formNovoSubcategoria}
                    onChange={(e) => setFormNovoSubcategoria(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs font-bold bg-white cursor-pointer"
                  >
                    {(SUBCATEGORIAS_POR_FORNECEDOR[formNovoFornecedor] || ['Outros']).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formNovoSubcategoria === 'Outros' && (
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Nome da Subcategoria Personalizada *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNovoSubcategoriaCustom}
                    onChange={(e) => setFormNovoSubcategoriaCustom(e.target.value)}
                    placeholder="Ex: Especiais da Bahia..."
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs text-stone-900 placeholder:text-stone-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={formNovoUnidade}
                    onChange={(e) => setFormNovoUnidade(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs font-bold bg-white cursor-pointer"
                  >
                    <option value="kg">kg (Quilograma)</option>
                    <option value="g">g (Grama)</option>
                    <option value="un">un (Unidade)</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="garrafa">garrafa (Garrafa)</option>
                    <option value="lata">lata (Lata)</option>
                    <option value="dúzia">dúzia</option>
                    <option value="bandeja">bandeja</option>
                    <option value="maço">maço</option>
                    <option value="litro">litro</option>
                    <option value="caixa">caixa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Qtd Sugerida / Pessoa / Dia
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={formNovoQtdPessoaDia}
                    onChange={(e) => setFormNovoQtdPessoaDia(Number(e.target.value))}
                    placeholder="0 = sem sugestão"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Descrição Breve (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNovoDescricao}
                  onChange={(e) => setFormNovoDescricao(e.target.value)}
                  placeholder="Ex: Produto fresco, selecionar peças inteiras..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-xs resize-none text-stone-900 placeholder:text-stone-500"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalNovoItem({ aberto: false })}
                  className="min-h-[42px] px-4 py-2.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formNovoSalvando}
                  className="min-h-[42px] px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 tap-bounce"
                >
                  {formNovoSalvando ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} aria-hidden="true" />
                      <span>Confirmar e Publicar no Cardápio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DUPLA DE EXCLUSÃO                   */}
      {/* ========================================================= */}
      {estadiaExcluir && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-4 animate-modal-in">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <Trash2 size={24} aria-hidden="true" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-red-950 text-base">
                Excluir Definitivamente?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Esta ação é irreversível. A estadia e <strong>todos os seus pedidos</strong> serão apagados do banco de dados.
              </p>
            </div>

            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3 text-xs text-red-950 space-y-2">
              <p className="font-semibold text-center">
                Para confirmar, digite exatamente o nome da casa:
              </p>
              <p className="text-center font-bold font-mono text-stone-900 bg-white py-1.5 px-2 rounded-lg border border-red-200 select-all">
                {estadiaExcluir.casa}
              </p>
              <input
                type="text"
                value={nomeConfirmacaoExclusao}
                onChange={(e) => setNomeConfirmacaoExclusao(e.target.value)}
                placeholder="Digite o nome da casa aqui..."
                aria-label="Digite o nome da casa para confirmar exclusão"
                className="w-full min-h-[40px] px-3 py-2 bg-white text-stone-900 placeholder:text-stone-500 text-xs rounded-xl border border-red-300 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-center font-semibold"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEstadiaExcluir(null);
                  setNomeConfirmacaoExclusao('');
                }}
                className="min-h-[40px] px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  excluindo ||
                  nomeConfirmacaoExclusao.trim().toLowerCase() !== estadiaExcluir.casa.trim().toLowerCase()
                }
                onClick={handleConfirmarExcluir}
                className="min-h-[40px] px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-stone-200 disabled:text-stone-500 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {excluindo ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} aria-hidden="true" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Excluir Definitivamente</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
