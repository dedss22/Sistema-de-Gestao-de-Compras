import React, { useState, useEffect, useMemo } from 'react';
import catalogoData from './data/catalogo.json';
import { ItemCatalogo, ItemPedido, FornecedorId, Pedido, KitPronto } from './types';
import { FORNECEDORES } from './data/fornecedores';
import { SupplierTabs } from './components/SupplierTabs';
import { ItemCard } from './components/ItemCard';
import { StayHeader } from './components/StayHeader';
import { KitsSelector } from './components/KitsSelector';
import { BottomSummaryBar } from './components/BottomSummaryBar';
import { ReviewModal } from './components/ReviewModal';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientApprovalView } from './components/ClientApprovalView';
import { saveDraft, loadDraft, saveOrder, getOrderById } from './services/storage';
import { obterEstadiaPorCodigo, criarPedido } from './services/db';
import { enviarPedido } from './services/enviarPedido';
import { CozinheiraBoasVindasModal } from './components/CozinheiraBoasVindasModal';
import { PedidoSucessoModal } from './components/PedidoSucessoModal';
import { AlertaItemEssencial } from './utils/validation';
import { obterCatalogoCompleto, onCatalogoAtualizado } from './services/catalogoService';
import { Search, Sparkles, WifiOff, X, AlertTriangle, Lock, RefreshCw, ChefHat } from 'lucide-react';

export const App: React.FC = () => {
  // Catálogo oficial reativo (base JSON + novos itens adicionados pelo admin)
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>(() => obterCatalogoCompleto());

  useEffect(() => {
    const unsub = onCatalogoAtualizado(() => {
      setCatalogo(obterCatalogoCompleto());
    });
    return unsub;
  }, []);
  // 1. Identificar Casa e Modo pela URL
  const [slugCasa, setSlugCasa] = useState<string>('villa-trancoso');
  const [casaNome, setCasaNome] = useState<string>('Villa Trancoso');
  const [dataChegada, setDataChegada] = useState<string>('');
  const [dataSaida, setDataSaida] = useState<string>('');
  const [numHospedes, setNumHospedes] = useState<number>(8);

  // Itens Selecionados no Pedido Atual
  const [itensPedido, setItensPedido] = useState<Record<string, ItemPedido>>({});
  
  // Controle de Navegação e Modais
  const [activeTab, setActiveTab] = useState<FornecedorId>('peixaria');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Pedido | null>(null);
  const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);
  
  // Feedback visual de salvamento e rede
  const [draftSavedAt, setDraftSavedAt] = useState<string>('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1.1 Estado do Fluxo da Cozinheira (/e/:codigo)
  const [codigoEstadia, setCodigoEstadia] = useState<string | null>(null);
  const [totalPedidosEstadia, setTotalPedidosEstadia] = useState<number>(0);
  const [carregandoEstadia, setCarregandoEstadia] = useState<boolean>(false);
  const [erroEstadia, setErroEstadia] = useState<'invalido' | 'encerrada' | null>(null);
  const [cozinheiraNome, setCozinheiraNome] = useState<string>(() => {
    return localStorage.getItem('cozinheira_nome') || '';
  });
  const [mostrarModalBoasVindas, setMostrarModalBoasVindas] = useState<boolean>(true);

  // É o 1º pedido da estadia? (Itens recomendados e essenciais aparecem APENAS no 1º pedido)
  const isPrimeiroPedido = useMemo(() => {
    if (!codigoEstadia) return false;
    const jaEnviouLocal = localStorage.getItem(`primeiro_pedido_enviado_${codigoEstadia}`) === 'true';
    return totalPedidosEstadia === 0 && !jaEnviouLocal;
  }, [codigoEstadia, totalPedidosEstadia]);

  // Modal de sucesso de pedido (B2)
  const [pedidoSucesso, setPedidoSucesso] = useState<{
    numero: number;
    finalizado_em: string;
    totalItens: number;
  } | null>(null);

  // Calcular número de dias da estadia
  const numDias = useMemo(() => {
    if (!dataChegada || !dataSaida) return 3; // Padrão 3 dias para cálculo de sugestão
    const start = new Date(dataChegada).getTime();
    const end = new Date(dataSaida).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 3;
  }, [dataChegada, dataSaida]);

  // Inicialização e Detecção de URL
  useEffect(() => {
    // Registrar Service Worker para PWA Offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service Worker não registrado:', err);
      });
    }

    // Monitorar conexão de rede
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const aprovarParam = urlParams.get('aprovar');
    if (aprovarParam) {
      setApprovalOrderId(aprovarParam);
      return;
    }

    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin')) {
      setIsAdminOpen(true);
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      setIsAdminOpen(currentPath === '/admin' || currentPath.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);

    // 1.2 Detectar rota da Cozinheira (/e/:codigo)
    const matchEstadia = path.match(/^\/e\/([a-zA-Z0-9_-]+)/);
    const codigoUrl = matchEstadia ? matchEstadia[1] : null;

    if (codigoUrl) {
      setCodigoEstadia(codigoUrl);
      setCarregandoEstadia(true);
      setErroEstadia(null);

      obterEstadiaPorCodigo(codigoUrl)
        .then((res: any) => {
          if (!res) {
            setErroEstadia('invalido');
          } else if (res.status !== 'ativa') {
            setErroEstadia('encerrada');
          } else {
            const nomeCasaEstadia = res.casa || 'Casa de Temporada';
            setCasaNome(nomeCasaEstadia);
            setDataChegada(res.entrada || '');
            setDataSaida(res.saida || '');
            setNumHospedes(Number(res.hospedes) || 8);
            setSlugCasa(`estadia-${codigoUrl}`);
            setTotalPedidosEstadia(res.total_pedidos ?? 0);

            // SEMPRE abrir o cardápio com o carrinho limpo (sem rascunho anterior)
            setItensPedido({});
            localStorage.removeItem(`lista_compras_rascunho_${codigoUrl}`);
            setDraftSavedAt('');

            // Cozinheira: SEMPRE abrir o modal para pedir/confirmar o nome de quem está fazendo este pedido
            const nomeSalvo = localStorage.getItem('cozinheira_nome') || '';
            setCozinheiraNome(nomeSalvo.trim());
            setMostrarModalBoasVindas(true);
          }
        })
        .catch((err) => {
          console.error('Erro ao obter estadia:', err);
          setErroEstadia('invalido');
        })
        .finally(() => {
          setCarregandoEstadia(false);
        });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('popstate', handlePopState);
      };
    }

    let detectedSlug = 'villa-trancoso';
    if (path.startsWith('/casa/')) {
      detectedSlug = path.replace('/casa/', '').split('/')[0];
    } else if (urlParams.get('casa')) {
      detectedSlug = urlParams.get('casa')!;
    }

    const formatName = detectedSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    setSlugCasa(detectedSlug);
    setCasaNome(formatName);

    // Definir datas iniciais sugestivas (próxima semana)
    const hoje = new Date();
    const chegada = new Date(hoje);
    chegada.setDate(hoje.getDate() + 7);
    const saida = new Date(chegada);
    saida.setDate(chegada.getDate() + 4);

    const defaultChegada = chegada.toISOString().split('T')[0];
    const defaultSaida = saida.toISOString().split('T')[0];

    // Carregar Rascunho salvo se existir
    const rascunho = loadDraft(detectedSlug);
    if (rascunho) {
      if (rascunho.casa) setCasaNome(rascunho.casa);
      if (rascunho.dataChegada) setDataChegada(rascunho.dataChegada);
      if (rascunho.dataSaida) setDataSaida(rascunho.dataSaida);
      if (rascunho.numHospedes) setNumHospedes(rascunho.numHospedes);
      if (rascunho.itens) setItensPedido(rascunho.itens);
      setDraftSavedAt('Rascunho recuperado automaticamente');
    } else {
      setDataChegada(defaultChegada);
      setDataSaida(defaultSaida);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Salvamento Automático do Rascunho (aparelho e estadia)
  useEffect(() => {
    if (!slugCasa) return;
    const timer = setTimeout(() => {
      if (codigoEstadia) {
        localStorage.setItem(
          `lista_compras_rascunho_${codigoEstadia}`,
          JSON.stringify({
            casa: casaNome,
            dataChegada,
            dataSaida,
            numHospedes,
            itens: itensPedido,
            timestamp: new Date().toISOString()
          })
        );
      } else {
        saveDraft(slugCasa, {
          casa: casaNome,
          dataChegada,
          dataSaida,
          numHospedes,
          itens: itensPedido
        });
      }
      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setDraftSavedAt(`Rascunho salvo às ${agora}`);
    }, 800);

    return () => clearTimeout(timer);
  }, [codigoEstadia, slugCasa, casaNome, dataChegada, dataSaida, numHospedes, itensPedido]);

  const handleOpenAdmin = () => {
    setIsAdminOpen(true);
    if (!window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Contadores de Itens por Fornecedor
  const itemCounts = useMemo<Record<FornecedorId, number>>(() => {
    const counts: Record<FornecedorId, number> = {
      peixaria: 0,
      acougue: 0,
      'frios-laticinios': 0,
      hortifruti: 0,
      bebidas: 0,
      mercado: 0
    };
    Object.values(itensPedido).forEach((item) => {
      if (item.quantidade > 0 && counts[item.fornecedor] !== undefined) {
        counts[item.fornecedor]++;
      }
    });
    return counts;
  }, [itensPedido]);

  const totalItens = useMemo(() => {
    return Object.values(itensPedido).filter(i => i.quantidade > 0).length;
  }, [itensPedido]);

  // Atualizar quantidade de um item
  const handleUpdateQuantidade = (item: ItemCatalogo, novaQtd: number) => {
    setItensPedido((prev) => {
      const copy = { ...prev };
      if (novaQtd <= 0) {
        delete copy[item.id];
      } else {
        copy[item.id] = {
          id: item.id,
          nome: item.nome,
          fornecedor: item.fornecedor,
          unidade: item.unidade,
          quantidade: novaQtd,
          observacao: copy[item.id]?.observacao || '',
          aceitaSubstituto: copy[item.id]?.aceitaSubstituto ?? true
        };
      }
      return copy;
    });
  };

  // Atualizar opções do item (observação e substituto)
  const handleUpdateOpcoes = (itemId: string, observacao: string, aceitaSubstituto: boolean) => {
    setItensPedido((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          observacao,
          aceitaSubstituto
        }
      };
    });
  };

  // Aplicar Kit Pronto com cálculo automático
  const handleAplicarKit = (kit: KitPronto) => {
    setItensPedido((prev) => {
      const updated = { ...prev };
      kit.itens.forEach((kitItem) => {
        const catalogoItem = catalogo.find(c => c.id === kitItem.itemId);
        if (!catalogoItem) return;

        let qtdCalculada = 0;
        if (kitItem.fatorQtdPessoaDia) {
          qtdCalculada = kitItem.fatorQtdPessoaDia * numHospedes * numDias;
        } else if (kitItem.fatorQtdPessoa) {
          qtdCalculada = kitItem.fatorQtdPessoa * numHospedes;
        } else if (kitItem.fatorQtdFixa) {
          qtdCalculada = kitItem.fatorQtdFixa;
        }

        // Arredondar para número amigável
        const isDecimal = catalogoItem.unidade === 'kg' || catalogoItem.unidade.toLowerCase().includes('litro');
        const step = isDecimal ? 0.5 : 1;
        const finalQtd = isDecimal 
          ? Number((Math.ceil(qtdCalculada * 2) / 2).toFixed(1))
          : Math.max(1, Math.round(qtdCalculada));

        const qtdAtual = updated[kitItem.itemId]?.quantidade || 0;
        const novaQtd = Math.max(qtdAtual, finalQtd);

        updated[kitItem.itemId] = {
          id: catalogoItem.id,
          nome: catalogoItem.nome,
          fornecedor: catalogoItem.fornecedor,
          unidade: catalogoItem.unidade,
          quantidade: novaQtd,
          observacao: updated[kitItem.itemId]?.observacao || '',
          aceitaSubstituto: updated[kitItem.itemId]?.aceitaSubstituto ?? true
        };
      });
      return updated;
    });

    showToast(`Kit "${kit.titulo}" adicionado com sucesso!`);
  };

  // Adicionar item sugerido pelo alerta essencial
  const handleAdicionarEssencialSugerido = (alerta: AlertaItemEssencial) => {
    const catItem = catalogo.find(c => c.id === alerta.itemIdSugerido);
    if (catItem) {
      handleUpdateQuantidade(catItem, alerta.quantidadeSugerida);
      showToast(`${alerta.nome} adicionado à lista!`);
    }
  };

  // Finalizar e Enviar Pedido (Fase B2: Suporte a múltiplos pedidos via RPC e rascunho por estadia)
  const handleEnviarParaAprovacao = async () => {
    if (!navigator.onLine) {
      alert('Você está sem conexão com a internet. Verifique sua rede e tente finalizar novamente. Sua lista foi mantida com segurança.');
      return;
    }

    const itensArray = Object.values(itensPedido)
      .filter((i) => i.quantidade > 0)
      .map((i) => {
        const catItem = catalogo.find(
          (c) => c.id === i.id || c.nome.toLowerCase() === i.nome.toLowerCase()
        );
        const isCustom = Boolean(i.isCustom || !catItem || i.id.startsWith('custom-'));
        return {
          fornecedor: i.fornecedor,
          categoria: catItem?.subcategoria || i.subcategoria || (isCustom ? 'Itens Especiais / Novos' : i.fornecedor),
          item: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
          observacao: i.observacao ? i.observacao.trim() : '',
          aceitaSubstituto: Boolean(i.aceitaSubstituto),
          is_custom: isCustom,
          item_id: i.id
        };
      });

    if (itensArray.length === 0) {
      alert('Adicione pelo menos um item à lista para finalizar o pedido.');
      return;
    }

    if (codigoEstadia && (!cozinheiraNome || cozinheiraNome.trim().length < 2)) {
      setMostrarModalBoasVindas(true);
      alert('Por favor, informe seu nome para identificar quem está enviando este pedido.');
      return;
    }

    try {
      let numeroPedidoFinal = 1;
      let finalizadoEmFinal = new Date().toISOString();

      if (codigoEstadia) {
        const nomeCozinheiraFinal = cozinheiraNome.trim() || 'Cozinheira';
        const res = await criarPedido({
          codigo: codigoEstadia,
          cozinheira: nomeCozinheiraFinal,
          itens: itensArray
        });

        numeroPedidoFinal = res.numero;
        finalizadoEmFinal = res.finalizado_em;

        // Disparo do ponto de integração de e-mail (B5)
        await enviarPedido(
          {
            numero: numeroPedidoFinal,
            finalizado_em: finalizadoEmFinal,
            cozinheira: nomeCozinheiraFinal,
            itens: itensArray
          },
          {
            casa: casaNome,
            entrada: dataChegada,
            saida: dataSaida,
            hospedes: numHospedes,
            codigo: codigoEstadia
          }
        );

        // Limpa rascunho da estadia após finalização bem-sucedida
        localStorage.removeItem(`lista_compras_rascunho_${codigoEstadia}`);

        // Limpa a lista na tela e fecha revisão
        setIsReviewOpen(false);
        setItensPedido({});
        if (codigoEstadia) {
          localStorage.setItem(`primeiro_pedido_enviado_${codigoEstadia}`, 'true');
        }
        setTotalPedidosEstadia((prev) => prev + 1);

        // Abre tela de sucesso vibrante da cozinheira
        setPedidoSucesso({
          numero: numeroPedidoFinal,
          finalizado_em: finalizadoEmFinal,
          totalItens: itensArray.length
        });
      } else {
        const novoPedido: Pedido = {
          id: `ped-${slugCasa}-${Date.now().toString().slice(-6)}`,
          casa: casaNome,
          slugCasa: slugCasa,
          dataChegada,
          dataSaida,
          numHospedes,
          itens: itensPedido,
          status: 'Aguardando aprovação',
          dataCriacao: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString()
        };

        await saveOrder(novoPedido);
        setIsReviewOpen(false);
        setSubmittedOrder(novoPedido);
      }
    } catch (err: any) {
      console.error('Erro ao finalizar pedido:', err);
      const msg = err.message || '';
      if (msg.includes('não está ativa') || msg.includes('encerrada')) {
        alert('Esta estadia foi encerrada pela equipe e não aceita mais pedidos. Sua lista foi mantida na tela.');
      } else if (!navigator.onLine || msg.includes('Failed to fetch') || msg.includes('network')) {
        alert('Falha na conexão com a internet. Verifique sua rede e tente finalizar novamente. Sua lista foi mantida com segurança.');
      } else {
        alert(`Erro ao finalizar pedido: ${msg || 'Tente novamente em instantes.'} Sua lista foi mantida.`);
      }
    }
  };

  const handleFazerNovoPedido = () => {
    setPedidoSucesso(null);
    setItensPedido({});
    if (codigoEstadia) {
      localStorage.removeItem(`lista_compras_rascunho_${codigoEstadia}`);
    }
    setMostrarModalBoasVindas(true);
    showToast('Pronto! Cardápio limpo para o novo pedido.');
  };

  const handleConfirmarNomeCozinheira = (nome: string) => {
    localStorage.setItem('cozinheira_nome', nome);
    setCozinheiraNome(nome);
    setMostrarModalBoasVindas(false);
    showToast(`Bem-vinda, ${nome}!`);
  };

  // Filtragem e Agrupamento dos itens da aba atual
  const itensFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return catalogo.filter((item) => {
      if (item.fornecedor !== activeTab) return false;
      if (!item.ativo) return false;
      if (!q) return true;
      return (
        item.nome.toLowerCase().includes(q) ||
        item.subcategoria.toLowerCase().includes(q) ||
        (item.descricaoBreve && item.descricaoBreve.toLowerCase().includes(q))
      );
    });
  }, [activeTab, searchQuery]);

  // Itens agrupados por subcategoria, com favoritos no topo
  const gruposSubcategorias = useMemo(() => {
    const grupos: Record<string, ItemCatalogo[]> = {};
    itensFiltrados.forEach((item) => {
      if (!grupos[item.subcategoria]) {
        grupos[item.subcategoria] = [];
      }
      grupos[item.subcategoria].push(item);
    });

    // Ordenar: favoritos primeiro em cada grupo
    Object.keys(grupos).forEach((sub) => {
      grupos[sub].sort((a, b) => {
        if (a.favorito && !b.favorito) return -1;
        if (!a.favorito && b.favorito) return 1;
        return a.nome.localeCompare(b.nome);
      });
    });

    return grupos;
  }, [itensFiltrados]);

  // Se a tela for a de aprovação do cliente
  if (approvalOrderId) {
    const pedidoAprovacao = getOrderById(approvalOrderId);
    if (!pedidoAprovacao) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-stone-800">Pedido não encontrado.</p>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setApprovalOrderId(null);
            }}
            className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold"
          >
            Ir para a página inicial
          </button>
        </div>
      );
    }

    return (
      <ClientApprovalView
        pedido={pedidoAprovacao}
        onStatusUpdated={(atualizado) => setSubmittedOrder(atualizado)}
        onVoltarParaApp={() => {
          window.history.pushState({}, '', '/');
          setApprovalOrderId(null);
        }}
      />
    );
  }

  // Rota Administrativa (/admin): Renderiza EXCLUSIVAMENTE o Painel da Equipe em PÁGINA INTEIRA
  if (isAdminOpen || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin')) {
    return <AdminDashboard />;
  }

  // Se estiver carregando dados da estadia via link da cozinheira (/e/:codigo)
  if (carregandoEstadia) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="animate-spin text-amber-600 mb-3" size={32} />
        <p className="text-sm font-bold text-stone-700">Carregando cardápio da casa...</p>
      </div>
    );
  }

  // Se o link da estadia for inválido (B1)
  if (erroEstadia === 'invalido') {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900">Link Inválido</h2>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">
            Link inválido, peça um novo à equipe.
          </p>
        </div>
      </div>
    );
  }

  // Se a estadia não estiver ativa / encerrada (B1)
  if (erroEstadia === 'encerrada') {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-stone-100 text-stone-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900">Estadia Encerrada</h2>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">
            Esta estadia foi encerrada.
          </p>
        </div>
      </div>
    );
  }

  // Se o pedido acabou de ser enviado (modo legado)
  if (submittedOrder) {
    return (
      <ConfirmationScreen
        pedido={submittedOrder}
        onVoltarParaInicio={() => {
          setSubmittedOrder(null);
        }}
        onVerComoCliente={(id) => {
          setApprovalOrderId(id);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col pb-28">
      {/* Banner de Conexão Offline */}
      {isOffline && (
        <div className="bg-amber-600 text-stone-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
          <WifiOff size={14} />
          <span>Modo Offline: Suas alterações estão salvas no celular e funcionarão normalmente.</span>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <Sparkles size={14} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Cabeçalho da Estadia da Casa */}
      <StayHeader
        casaNome={casaNome}
        dataChegada={dataChegada}
        dataSaida={dataSaida}
        numHospedes={numHospedes}
        onUpdateStay={(dados) => {
          setCasaNome(dados.casaNome);
          setDataChegada(dados.dataChegada);
          setDataSaida(dados.dataSaida);
          setNumHospedes(dados.numHospedes);
          showToast('Dados da estadia atualizados!');
        }}
        onOpenAdmin={handleOpenAdmin}
        cozinheiraNome={cozinheiraNome}
        isModoCozinheira={Boolean(codigoEstadia)}
        onAlterarCozinheira={() => setMostrarModalBoasVindas(true)}
      />

      {/* 2. Kits Prontos com 1 Toque (Apenas no 1º pedido da estadia) */}
      {isPrimeiroPedido && (
        <div className="max-w-xl mx-auto w-full">
          <KitsSelector
            onAplicarKit={handleAplicarKit}
            numHospedes={numHospedes}
            numDias={numDias}
          />
        </div>
      )}

      {/* 3. Abas Fixas no Topo por Fornecedor */}
      <SupplierTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        itemCounts={itemCounts}
      />

      {/* 4. Barra de Busca e Indicador de Rascunho */}
      <div className="max-w-xl mx-auto w-full px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={`Buscar em ${FORNECEDORES[activeTab].nome}... (ex: filé, manga, água)`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm pl-10 pr-10 py-3 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {draftSavedAt && (
          <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
            <span>{draftSavedAt}</span>
            <span className="font-semibold text-stone-700">
              {itensFiltrados.length} opções disponíveis
            </span>
          </div>
        )}
      </div>

      {/* 5. Grade de Cards de Itens Agrupados por Subcategoria */}
      <div className="max-w-xl mx-auto w-full px-4 space-y-6 mt-1 flex-1">
        {Object.keys(gruposSubcategorias).length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 space-y-2 my-6">
            <span className="text-4xl">🔍</span>
            <h3 className="font-bold text-stone-800 text-sm">
              Nenhum produto encontrado para "{searchQuery}"
            </h3>
            <p className="text-xs text-stone-500">
              Tente buscar por outro termo ou use o botão de "Adicionar item que não está na lista" na tela de revisão.
            </p>
          </div>
        ) : (
          Object.entries(gruposSubcategorias).map(([subcategoria, itens]) => (
            <div key={subcategoria} className="space-y-3">
              {/* Cabeçalho da Subcategoria */}
              <div className="flex items-center gap-2 pt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${FORNECEDORES[activeTab].corPrimaria}`} />
                <h3 className="font-black text-stone-900 text-sm uppercase tracking-wider">
                  {subcategoria}
                </h3>
                <span className="text-stone-400 text-xs">({itens.length})</span>
              </div>

              {/* Grid 2 colunas no celular / mobile-first */}
              <div className="grid grid-cols-2 gap-3">
                {itens.map((item) => {
                  const isDecimal = item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro');
                  const sugestao = isPrimeiroPedido && item.quantidade_por_pessoa_dia
                    ? isDecimal
                      ? Number((Math.ceil(item.quantidade_por_pessoa_dia * numHospedes * numDias * 2) / 2).toFixed(1))
                      : Math.max(1, Math.round(item.quantidade_por_pessoa_dia * numHospedes * numDias))
                    : undefined;

                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      itemPedido={itensPedido[item.id]}
                      onUpdateQuantidade={handleUpdateQuantidade}
                      onUpdateOpcoes={handleUpdateOpcoes}
                      sugestaoQtd={sugestao}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 6. Barra Fixa Inferior com Totais por Aba e Botão Revisar */}
      <BottomSummaryBar
        itemCounts={itemCounts}
        totalItens={totalItens}
        onOpenReview={() => setIsReviewOpen(true)}
      />

      {/* 7. Modal de Revisão da Lista */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        isPrimeiroPedido={isPrimeiroPedido}
        itens={itensPedido}
        numHospedes={numHospedes}
        numDias={numDias}
        cozinheiraNome={cozinheiraNome}
        onAlterarCozinheira={() => setMostrarModalBoasVindas(true)}
        onUpdateQuantidade={(itemId, novaQtd) => {
          const itemCat = catalogo.find(c => c.id === itemId);
          if (itemCat) {
            handleUpdateQuantidade(itemCat, novaQtd);
          } else if (itensPedido[itemId]) {
            setItensPedido(prev => ({
              ...prev,
              [itemId]: { ...prev[itemId], quantidade: novaQtd }
            }));
          }
        }}
        onRemoverItem={(itemId) => {
          setItensPedido(prev => {
            const copy = { ...prev };
            delete copy[itemId];
            return copy;
          });
        }}
        onAdicionarItemCustom={(itemCustom) => {
          setItensPedido(prev => ({
            ...prev,
            [itemCustom.id]: itemCustom
          }));
          showToast(`"${itemCustom.nome}" adicionado!`);
        }}
        onAdicionarEssencialSugerido={handleAdicionarEssencialSugerido}
        onEnviarParaAprovacao={handleEnviarParaAprovacao}
      />

      {/* 8. Modal de Boas-Vindas da Cozinheira (/e/:codigo) (B1) */}
      {codigoEstadia && mostrarModalBoasVindas && (
        <CozinheiraBoasVindasModal
          casa={casaNome}
          entrada={dataChegada}
          saida={dataSaida}
          hospedes={numHospedes}
          nomeInicial={cozinheiraNome}
          onConfirmar={handleConfirmarNomeCozinheira}
        />
      )}

      {/* 10. Modal de Sucesso do Pedido com Fazer Novo Pedido (B2) */}
      {pedidoSucesso && (
        <PedidoSucessoModal
          numeroPedido={pedidoSucesso.numero}
          cozinheiraNome={cozinheiraNome || 'Cozinheira'}
          casaNome={casaNome}
          finalizadoEm={pedidoSucesso.finalizado_em}
          totalItens={pedidoSucesso.totalItens}
          onFazerNovoPedido={handleFazerNovoPedido}
        />
      )}
    </div>
  );
};

export default App;
