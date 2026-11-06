import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  PedidoBanco,
  Estadia,
  StatusPedido,
  AnexoPedido,
  alterarStatusPedido,
  editarItensPedido,
  adicionarAnexosPedido,
  atualizarAnexoPedido,
  removerAnexoPedido
} from '../services/db';
import {
  formatarDataBr,
  formatarDataHoraBahia,
  baixarPlanilhaPedido
} from '../services/gerarPlanilha';
import {
  comprimirComprovanteParaUpload,
  obterMidiaIndexedDB,
  hidratarPedidoComMidia
} from '../services/anexoStorage';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  Users,
  User,
  ChefHat,
  Home,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Send,
  Package,
  Paperclip,
  Upload,
  Eye,
  Trash2,
  RotateCcw,
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  Filter,
  DollarSign,
  Edit3,
  CreditCard,
  Building2,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Plus,
  Search
} from 'lucide-react';

interface DetalhesPedidoModalProps {
  pedido: PedidoBanco;
  estadia?: Partial<Estadia> | null;
  onClose: () => void;
  onAtualizarPedido?: (pedidoAtualizado: PedidoBanco) => void;
}

interface ComprovanteFormState {
  id?: string;
  nome: string;
  tipo: 'imagem' | 'pdf';
  tamanho: string;
  url: string;
  fornecedor: string;
  valor_total: string;
  quem_pagou: 'hospede' | 'outra_pessoa';
  quem_pagou_outro: string;
  data_comprovante: string;
}

const NOMES_FORNECEDORES: Record<string, { nome: string; cor: string; badge: string }> = {
  peixaria: { nome: 'Peixaria', cor: 'bg-sky-50 text-sky-800 border-sky-200', badge: 'bg-sky-100 text-sky-900 border-sky-300' },
  acougue: { nome: 'Açougue', cor: 'bg-red-50 text-red-800 border-red-200', badge: 'bg-red-100 text-red-900 border-red-300' },
  'frios-laticinios': { nome: 'Frios & Laticínios', cor: 'bg-amber-50 text-amber-800 border-amber-200', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  hortifruti: { nome: 'Hortifruti', cor: 'bg-emerald-50 text-emerald-800 border-emerald-200', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  bebidas: { nome: 'Bebidas', cor: 'bg-violet-50 text-violet-800 border-violet-200', badge: 'bg-violet-100 text-violet-900 border-violet-300' },
  mercado: { nome: 'Mercado', cor: 'bg-orange-50 text-orange-800 border-orange-200', badge: 'bg-orange-100 text-orange-900 border-orange-300' }
};

const formatarMoeda = (val: number | undefined): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const DetalhesPedidoModal: React.FC<DetalhesPedidoModalProps> = ({
  pedido: pedidoInicial,
  estadia: estadiaProp,
  onClose,
  onAtualizarPedido
}) => {
  const [pedido, setPedido] = useState<PedidoBanco>(pedidoInicial);

  // Mantém sincronizado com as props e hidrata fotos do IndexedDB
  useEffect(() => {
    setPedido(pedidoInicial);
    if (pedidoInicial && Array.isArray(pedidoInicial.anexos)) {
      hidratarPedidoComMidia(pedidoInicial).then((hidratado) => {
        if (hidratado) setPedido(hidratado);
      });
    }
  }, [pedidoInicial]);
  const [abaModal, setAbaModal] = useState<'itens' | 'anexos' | 'estadia'>('itens');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [enviandoAnexos, setEnviandoAnexos] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [imagemZoom, setImagemZoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do formulário de comprovante (novo ou edição)
  const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false);
  const [comprovanteForm, setComprovanteForm] = useState<ComprovanteFormState | null>(null);
  const [erroComprovante, setErroComprovante] = useState<string | null>(null);

  // Controles de visualização / zoom / rotação do documento no formulário
  const [docZoomEscala, setDocZoomEscala] = useState<number>(1);
  const [docRotacao, setDocRotacao] = useState<number>(0);
  const [docFullscreen, setDocFullscreen] = useState<boolean>(false);

  // Estados e controle de Edição de Itens do Pedido
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [itensEdicao, setItensEdicao] = useState<any[]>([]);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [buscaItemEdicao, setBuscaItemEdicao] = useState('');
  const [filtroFornEdicao, setFiltroFornEdicao] = useState('todos');
  const [mostrarNovoItemForm, setMostrarNovoItemForm] = useState(false);
  const [novoItem, setNovoItem] = useState({
    item: '',
    fornecedor: 'mercado',
    categoria: 'Geral',
    quantidade: 1,
    unidade: 'un',
    observacao: '',
    aceitaSubstituto: true
  });

  const handleAbrirEdicao = () => {
    const copiaItens = (pedido.itens || []).map((it: any) => ({
      ...it,
      item: it.item || it.nome || 'Item sem nome',
      quantidade: typeof it.quantidade === 'number' ? it.quantidade : Number(it.quantidade) || 1,
      unidade: it.unidade || 'un',
      observacao: it.observacao || '',
      aceitaSubstituto: it.aceitaSubstituto !== false,
      fornecedor: it.fornecedor || 'mercado',
      categoria: it.categoria || '-'
    }));
    setItensEdicao(copiaItens);
    setBuscaItemEdicao('');
    setFiltroFornEdicao('todos');
    setMostrarNovoItemForm(false);
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (itensEdicao.length === 0) {
      if (!confirm('O pedido ficará sem nenhum item. Deseja continuar?')) return;
    }
    setSalvandoEdicao(true);
    try {
      const atualizado = await editarItensPedido(pedido.id, itensEdicao);
      atualizado.estadia = estadia;
      setPedido(atualizado);
      onAtualizarPedido?.(atualizado);
      showToast(`Pedido #${pedido.numero} editado com sucesso! (${itensEdicao.length} itens)`);
      setModalEditarAberto(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações no pedido.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Combina dados da estadia vindos por prop ou pelo join do pedido
  const estadia = estadiaProp || pedido.estadia || {};

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Agrupar itens por fornecedor
  const itensPorFornecedor = useMemo(() => {
    const grupos: Record<string, any[]> = {};
    const lista = Array.isArray(pedido.itens) ? pedido.itens : [];

    lista.forEach((item) => {
      const forn = item.fornecedor || 'mercado';
      if (!grupos[forn]) grupos[forn] = [];
      grupos[forn].push(item);
    });

    return grupos;
  }, [pedido.itens]);

  const fornecedoresDisponiveis = useMemo(() => {
    return Object.keys(itensPorFornecedor);
  }, [itensPorFornecedor]);

  const totalItens = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
  const statusAtual: StatusPedido = pedido.status || 'em_aprovacao';
  const anexosLista: AnexoPedido[] = pedido.anexos || [];

  // Cálculos financeiros dos comprovantes anexados
  const totaisComprovantes = useMemo(() => {
    let total = 0;
    let totalHospede = 0;
    let totalOutro = 0;

    anexosLista.forEach((a) => {
      const v = typeof a.valor_total === 'number' && !isNaN(a.valor_total) ? a.valor_total : 0;
      total += v;
      if (a.quem_pagou === 'outra_pessoa') {
        totalOutro += v;
      } else {
        totalHospede += v;
      }
    });

    return { total, totalHospede, totalOutro };
  }, [anexosLista]);

  const printRef = useRef<HTMLDivElement>(null);

  const handleImprimir = () => {
    if (!printRef.current) {
      window.print();
      return;
    }

    try {
      const iframeAntigo = document.getElementById('iframe-impressao-pedido-temp');
      if (iframeAntigo) iframeAntigo.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'iframe-impressao-pedido-temp';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        return;
      }

      // Clona todas as tags de estilo e folhas de estilo do head da aplicação
      const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join('\n');

      const titulo = abaModal === 'anexos'
        ? `Relatorio-Notas-Pedido-${pedido.numero}-${estadia.casa || 'Estadia'}`
        : `Lista-Compras-Pedido-${pedido.numero}-${estadia.casa || 'Estadia'}`;

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>${titulo}</title>
            ${estilos}
            <style>
              @page {
                margin: 8mm 10mm;
                size: A4 portrait;
              }
              body {
                background: #ffffff !important;
                color: #1c1917 !important;
                padding: 0 !important;
                margin: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
              }
              .print-avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              img {
                max-width: 100% !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 100%; margin: 0 auto; padding: 4px;">
              ${printRef.current.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      const disparar = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Falha ao acionar print no iframe, usando fallback:', e);
          window.print();
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 4000);
        }
      };

      // Se houver imagens no documento (ex: fotos de notas), aguarda o carregamento
      const imgs = iframeDoc.images;
      if (imgs && imgs.length > 0) {
        let carregadas = 0;
        const checar = () => {
          carregadas++;
          if (carregadas >= imgs.length) disparar();
        };
        for (let i = 0; i < imgs.length; i++) {
          if (imgs[i].complete) {
            carregadas++;
          } else {
            imgs[i].onload = checar;
            imgs[i].onerror = checar;
          }
        }
        if (carregadas >= imgs.length) {
          disparar();
        } else {
          setTimeout(disparar, 600);
        }
      } else {
        setTimeout(disparar, 150);
      }
    } catch (err) {
      console.error('Erro na impressão do pedido:', err);
      window.print();
    }
  };

  const handleBaixarExcel = () => {
    baixarPlanilhaPedido(pedido, estadia);
  };

  // Transição de Status
  const handleAlterarStatus = async (novoStatus: StatusPedido) => {
    setSalvandoStatus(true);
    try {
      const atualizado = await alterarStatusPedido(pedido.id, novoStatus);
      atualizado.estadia = estadia;
      setPedido(atualizado);
      onAtualizarPedido?.(atualizado);

      if (novoStatus === 'enviar_fornecedores') {
        showToast('Pedido aprovado com sucesso!');
      } else if (novoStatus === 'rejeitado') {
        showToast('Pedido marcado como rejeitado.');
      } else if (novoStatus === 'em_aprovacao') {
        showToast('Pedido reaberto para aprovação.');
      } else if (novoStatus === 'preparacao_entrega') {
        showToast('Status alterado: Pedido enviado aos fornecedores!');
      } else if (novoStatus === 'finalizado') {
        showToast('Pedido finalizado e concluído com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao alterar status do pedido:', err);
      showToast(err.message || 'Erro ao atualizar status do pedido.');
    } finally {
      setSalvandoStatus(false);
    }
  };

  // Seleção de Arquivo -> Comprime inteligentemente e abre o Modal de preenchimento
  const handleSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const tipo = isPdf ? 'pdf' : 'imagem';

    try {
      // Comprime a imagem antes de ler para evitar estourar a cota do navegador (reduz 90% do peso mantendo 100% legível)
      const { url: urlOtimizada, tamanhoFormatado } = await comprimirComprovanteParaUpload(file);

      // Data padrão: hoje em formato YYYY-MM-DD
      const hojeStr = new Date().toISOString().split('T')[0];

      setComprovanteForm({
        nome: file.name,
        tipo,
        tamanho: tamanhoFormatado,
        url: urlOtimizada,
        fornecedor: '',
        valor_total: '',
        quem_pagou: 'hospede',
        quem_pagou_outro: '',
        data_comprovante: hojeStr
      });
      setDocZoomEscala(1);
      setDocRotacao(0);
      setDocFullscreen(false);
      setErroComprovante(null);
      setModalComprovanteAberto(true);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      showToast('Erro ao carregar o arquivo selecionado.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Abrir edição de um comprovante já existente
  const handleEditarComprovante = async (anexo: AnexoPedido) => {
    let urlExibir = anexo.url;
    if (!urlExibir || urlExibir.startsWith('indexeddb:')) {
      const midia = await obterMidiaIndexedDB(anexo.id);
      if (midia) urlExibir = midia;
    }

    setComprovanteForm({
      id: anexo.id,
      nome: anexo.nome,
      tipo: anexo.tipo,
      tamanho: anexo.tamanho,
      url: urlExibir,
      fornecedor: anexo.fornecedor || '',
      valor_total: anexo.valor_total !== undefined ? String(anexo.valor_total).replace('.', ',') : '',
      quem_pagou: anexo.quem_pagou || 'hospede',
      quem_pagou_outro: anexo.quem_pagou_outro || '',
      data_comprovante: anexo.data_comprovante || new Date().toISOString().split('T')[0]
    });
    setDocZoomEscala(1);
    setDocRotacao(0);
    setDocFullscreen(false);
    setErroComprovante(null);
    setModalComprovanteAberto(true);
  };

  // Salvar comprovante preenchido (novo ou atualizado)
  const handleSalvarComprovante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comprovanteForm) return;

    const fornLimpo = comprovanteForm.fornecedor.trim();
    if (!fornLimpo) {
      setErroComprovante('Por favor, informe o Fornecedor da nota / comprovante.');
      return;
    }

    const valorLimpoStr = comprovanteForm.valor_total.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
    const valorNum = parseFloat(valorLimpoStr);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErroComprovante('Por favor, informe um Valor Total válido (maior que zero).');
      return;
    }

    if (!comprovanteForm.data_comprovante) {
      setErroComprovante('Por favor, selecione a data do comprovante.');
      return;
    }

    if (comprovanteForm.quem_pagou === 'outra_pessoa' && !comprovanteForm.quem_pagou_outro.trim()) {
      setErroComprovante('Por favor, informe quem foi a outra pessoa que realizou o pagamento.');
      return;
    }

    setEnviandoAnexos(true);
    try {
      if (comprovanteForm.id) {
        // Atualização de anexo existente
        const atualizado = await atualizarAnexoPedido(pedido.id, comprovanteForm.id, {
          fornecedor: fornLimpo,
          valor_total: valorNum,
          quem_pagou: comprovanteForm.quem_pagou,
          quem_pagou_outro: comprovanteForm.quem_pagou === 'outra_pessoa' ? comprovanteForm.quem_pagou_outro.trim() : '',
          data_comprovante: comprovanteForm.data_comprovante
        });
        atualizado.estadia = estadia;
        setPedido(atualizado);
        onAtualizarPedido?.(atualizado);
        showToast('Dados do comprovante atualizados com sucesso!');
      } else {
        // Novo anexo
        const atualizado = await adicionarAnexosPedido(pedido.id, [
          {
            nome: comprovanteForm.nome,
            tipo: comprovanteForm.tipo,
            tamanho: comprovanteForm.tamanho,
            url: comprovanteForm.url,
            fornecedor: fornLimpo,
            valor_total: valorNum,
            quem_pagou: comprovanteForm.quem_pagou,
            quem_pagou_outro: comprovanteForm.quem_pagou === 'outra_pessoa' ? comprovanteForm.quem_pagou_outro.trim() : '',
            data_comprovante: comprovanteForm.data_comprovante
          }
        ]);
        atualizado.estadia = estadia;
        setPedido(atualizado);
        onAtualizarPedido?.(atualizado);
        showToast('Comprovante anexado e registrado com sucesso!');
      }

      setModalComprovanteAberto(false);
      setComprovanteForm(null);
    } catch (err: any) {
      console.error('Erro ao salvar comprovante:', err);
      setErroComprovante(err.message || 'Erro ao registrar comprovante.');
    } finally {
      setEnviandoAnexos(false);
    }
  };

  // Remover Anexo
  const handleRemoverAnexo = async (anexoId: string) => {
    if (!window.confirm('Deseja realmente remover este comprovante do pedido?')) return;
    try {
      const atualizado = await removerAnexoPedido(pedido.id, anexoId);
      atualizado.estadia = estadia;
      setPedido(atualizado);
      onAtualizarPedido?.(atualizado);
      showToast('Comprovante removido.');
    } catch (err) {
      console.error('Erro ao remover anexo:', err);
      showToast('Erro ao remover anexo.');
    }
  };

  return (
    <div className="fixed inset-0 z-80 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden modal-overlay-pedido print:static print:p-0 print:bg-white print:overflow-visible print:block">
      {/* Toast flutuante interno */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-90 bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="text-amber-400" size={15} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. VISÃO EM TELA (NÃO IMPRESSA)                          */}
      {/* ========================================================= */}
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200 modal-conteudo-tela print:hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:px-6 sm:py-4 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/30 shrink-0 shadow-inner">
              #{pedido.numero}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                  Pedido #{pedido.numero}
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalItens} {totalItens === 1 ? 'item solicitado' : 'itens solicitados'}
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                  👩‍🍳 {pedido.cozinheira}
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <Home size={12} className="text-amber-400" />
                <span className="font-bold text-stone-200">{estadia.casa || 'Casa de Temporada'}</span>
                <span>•</span>
                <span>Enviado em {formatarDataHoraBahia(pedido.finalizado_em)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBaixarExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer tap-bounce"
              title="Baixar planilha formatada em Excel"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Baixar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer tap-bounce"
              title={abaModal === 'anexos' ? 'Imprimir relatório de comprovantes e fotos numeradas' : 'Imprimir lista de compras no mesmo design da tela'}
            >
              <Printer size={15} />
              <span className="hidden sm:inline">
                {abaModal === 'anexos' ? 'Imprimir Relatório de Notas' : 'Imprimir / PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors ml-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PIPELINE / ESTEIRA DE STATUS & AÇÃO RÁPIDA               */}
        {/* ========================================================= */}
        <div className="bg-stone-100/90 border-b border-stone-200 p-3 sm:px-6 sm:py-3.5 space-y-2.5 shrink-0">
          {/* Stepper Visual de Fases */}
          {statusAtual !== 'rejeitado' ? (
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
              {/* Passo 1: Em Aprovação */}
              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  statusAtual === 'em_aprovacao'
                    ? 'bg-amber-100/80 border-amber-300 text-amber-950 ring-2 ring-amber-400/30 font-black'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Clock size={12} className={statusAtual === 'em_aprovacao' ? 'text-amber-700' : 'text-stone-400'} />
                  <span>1. Em Aprovação</span>
                </div>
              </div>

              {/* Passo 2: Enviar Fornecedor */}
              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  statusAtual === 'enviar_fornecedores'
                    ? 'bg-sky-100/80 border-sky-300 text-sky-950 ring-2 ring-sky-400/30 font-black'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Send size={12} className={statusAtual === 'enviar_fornecedores' ? 'text-sky-700' : 'text-stone-400'} />
                  <span>2. Enviar Fornecedores</span>
                </div>
              </div>

              {/* Passo 3: Preparação e Entrega */}
              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  statusAtual === 'preparacao_entrega'
                    ? 'bg-purple-100/80 border-purple-300 text-purple-950 ring-2 ring-purple-400/30 font-black'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Package size={12} className={statusAtual === 'preparacao_entrega' ? 'text-purple-700' : 'text-stone-400'} />
                  <span>3. Preparação & Entrega</span>
                </div>
              </div>

              {/* Passo 4: Finalizado */}
              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  statusAtual === 'finalizado'
                    ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/30 font-black'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={12} className={statusAtual === 'finalizado' ? 'text-emerald-700' : 'text-stone-400'} />
                  <span>4. Finalizado</span>
                </div>
              </div>
            </div>
          ) : (
            /* Banner de Pedido Rejeitado */
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-900 text-xs">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-600 shrink-0" />
                <div>
                  <strong className="block font-black text-sm text-red-950">Pedido Rejeitado</strong>
                  <span>
                    Rejeitado por <strong>{pedido.rejeitado_por_nome || 'Equipe'}</strong> {pedido.rejeitado_em ? `em ${formatarDataHoraBahia(pedido.rejeitado_em)}` : ''}.
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={salvandoStatus}
                onClick={() => handleAlterarStatus('em_aprovacao')}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer tap-bounce shrink-0"
              >
                <RotateCcw size={13} />
                <span>Voltar para Aprovação</span>
              </button>
            </div>
          )}

          {/* Barra de Ações Contextuais Conforme a Fase Atual */}
          <div className="bg-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Mensagem e Contexto da Fase */}
            <div className="text-xs">
              {statusAtual === 'em_aprovacao' && (
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>Pedido enviado pela cozinheira <strong>{pedido.cozinheira}</strong>. Aguarda aprovação para prosseguir.</span>
                </div>
              )}
              {statusAtual === 'enviar_fornecedores' && (
                <div className="flex items-center gap-2 text-sky-900 font-semibold">
                  <Send size={15} className="text-sky-600 shrink-0" />
                  <span>
                    Aprovado por <strong>{pedido.aprovado_por_nome || 'Equipe'}</strong>. Encaminhe para os fornecedores e confirme abaixo.
                  </span>
                </div>
              )}
              {statusAtual === 'preparacao_entrega' && (
                <div className="flex items-center gap-2 text-purple-900 font-semibold">
                  <Package size={15} className="text-purple-600 shrink-0" />
                  <span>
                    Enviado aos fornecedores por <strong>{pedido.enviado_fornecedor_por_nome || 'Equipe'}</strong>. Anexe os comprovantes e finalize quando entregue.
                  </span>
                </div>
              )}
              {statusAtual === 'finalizado' && (
                <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    Pedido finalizado com sucesso por <strong>{pedido.concluido_por_nome || 'Equipe'}</strong> {pedido.concluido_em ? `em ${formatarDataHoraBahia(pedido.concluido_em)}` : ''}.
                  </span>
                </div>
              )}
              {statusAtual === 'rejeitado' && (
                <span className="text-stone-500">Este pedido foi rejeitado. Você pode reabri-lo caso a rejeição tenha sido feita por engano.</span>
              )}
            </div>

            {/* Botões de Ação Dinâmicos */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {statusAtual === 'em_aprovacao' && (
                <>
                  <button
                    type="button"
                    onClick={handleAbrirEdicao}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black rounded-xl text-xs border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer tap-bounce shadow-2xs"
                    title="Editar itens, quantidades e observações do pedido"
                  >
                    <Edit3 size={13} className="text-amber-700" />
                    <span>Editar Pedido</span>
                  </button>

                  <button
                    type="button"
                    disabled={salvandoStatus}
                    onClick={() => handleAlterarStatus('rejeitado')}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle size={13} />
                    <span>Rejeitar</span>
                  </button>

                  <button
                    type="button"
                    disabled={salvandoStatus}
                    onClick={() => handleAlterarStatus('enviar_fornecedores')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer tap-bounce"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar Pedido</span>
                  </button>
                </>
              )}

              {statusAtual === 'enviar_fornecedores' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAbrirEdicao}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer tap-bounce"
                    title="Editar itens e quantidades antes do envio"
                  >
                    <Edit3 size={13} />
                    <span>Editar Pedido</span>
                  </button>

                  <button
                    type="button"
                    disabled={salvandoStatus}
                    onClick={() => handleAlterarStatus('preparacao_entrega')}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer tap-bounce"
                  >
                    <Send size={14} />
                    <span>Marcar Pedido Enviado</span>
                  </button>
                </div>
              )}

              {statusAtual === 'preparacao_entrega' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAbaModal('anexos');
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-xl text-xs border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Paperclip size={13} />
                    <span>Anexar Comprovante</span>
                  </button>

                  <button
                    type="button"
                    disabled={salvandoStatus}
                    onClick={() => handleAlterarStatus('finalizado')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer tap-bounce"
                  >
                    <CheckCircle2 size={14} />
                    <span>Finalizar Pedido</span>
                  </button>
                </div>
              )}

              {statusAtual === 'finalizado' && (
                <button
                  type="button"
                  onClick={() => {
                    setAbaModal('anexos');
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Paperclip size={13} />
                  <span>Anexar Comprovante Extra</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Oculto de Arquivos (Fotos e PDFs) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleSelecionarArquivo}
          className="hidden"
        />

        {/* ========================================================= */}
        {/* NAVEGAÇÃO DE ABAS: ITENS DO PEDIDO | ANEXOS | HOSPEDAGEM */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 border-b border-stone-200 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setAbaModal('itens')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                abaModal === 'itens'
                  ? 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/20'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              <ShoppingBag size={14} className={abaModal === 'itens' ? 'text-stone-950' : 'text-amber-600'} />
              <span>Pedido de Compras ({totalItens} itens)</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaModal('anexos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                abaModal === 'anexos'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              <Paperclip size={14} className={abaModal === 'anexos' ? 'text-white' : 'text-purple-600'} />
              <span>Comprovantes & Notas ({anexosLista.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaModal('estadia')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                abaModal === 'estadia'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              <Home size={14} className={abaModal === 'estadia' ? 'text-amber-400' : 'text-stone-400'} />
              <span>Hospedagem & Auditoria</span>
            </button>
          </div>

          <div className="text-[11px] text-stone-500 font-medium hidden md:block">
            {totalItens} itens • {anexosLista.length} comprovante(s)
          </div>
        </div>

        {/* ========================================================= */}
        {/* CORPO PRINCIPAL COM ROLAGEM DEDICADA                    */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#faf7f2]/50 space-y-4">
          {/* ========================================================= */}
          {/* ABA 1: ITENS DO PEDIDO DE COMPRAS (DESTAQUE MÁXIMO)      */}
          {/* ========================================================= */}
          {abaModal === 'itens' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Cabeçalho Resumo estilo Planilha de Compras */}
              <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:px-4 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Cozinheira:</span>
                    <span className="font-extrabold text-stone-900 text-sm">{pedido.cozinheira}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Casa:</span>
                    <span className="font-bold text-stone-800">{estadia.casa || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Período:</span>
                    <span className="font-medium text-stone-700">{formatarDataBr(estadia.entrada || '')} a {formatarDataBr(estadia.saida || '')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Hóspedes / Titular:</span>
                    <span className="font-medium text-stone-700">{estadia.hospedes || '-'} pess. • {estadia.titular || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Filtro Rápido por Fornecedor (se houver mais de um) */}
              {fornecedoresDisponiveis.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-stone-400 flex items-center gap-1 pr-1">
                    <Filter size={12} />
                    <span>Filtrar:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setFiltroFornecedor('todos')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filtroFornecedor === 'todos'
                        ? 'bg-stone-900 text-white'
                        : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    Todos ({totalItens})
                  </button>

                  {fornecedoresDisponiveis.map((fornKey) => {
                    const info = NOMES_FORNECEDORES[fornKey] || { nome: fornKey };
                    const qtd = itensPorFornecedor[fornKey]?.length || 0;
                    return (
                      <button
                        key={fornKey}
                        type="button"
                        onClick={() => setFiltroFornecedor(fornKey)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filtroFornecedor === fornKey
                            ? 'bg-amber-600 text-white'
                            : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {info.nome} ({qtd})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tabela do Pedido de Compras Formatada */}
              {totalItens === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 text-stone-500 space-y-2">
                  <ShoppingBag size={32} className="mx-auto text-stone-300" />
                  <p className="font-bold text-sm text-stone-800">Nenhum item encontrado neste pedido.</p>
                </div>
              ) : (
                Object.entries(itensPorFornecedor)
                  .filter(([fornId]) => filtroFornecedor === 'todos' || filtroFornecedor === fornId)
                  .map(([fornId, itens]) => {
                    const fornInfo = NOMES_FORNECEDORES[fornId] || {
                      nome: fornId,
                      cor: 'bg-stone-100 text-stone-800 border-stone-200',
                      badge: 'bg-stone-100 text-stone-800 border-stone-300'
                    };

                    return (
                      <div
                        key={fornId}
                        className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs"
                      >
                        {/* Cabeçalho da Categoria / Fornecedor */}
                        <div className={`px-4 py-2.5 border-b font-extrabold text-xs flex items-center justify-between ${fornInfo.cor}`}>
                          <div className="flex items-center gap-2">
                            <span className="uppercase tracking-wider font-black">{fornInfo.nome}</span>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/70 border border-stone-300/60 text-stone-800">
                            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>

                        {/* Tabela de Itens do Fornecedor */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-extrabold text-[11px] uppercase tracking-wider">
                                <th className="py-2.5 pl-4 pr-2 w-10 text-center">#</th>
                                <th className="py-2.5 px-3">Item Solicitado</th>
                                <th className="py-2.5 px-3 hidden sm:table-cell">Categoria</th>
                                <th className="py-2.5 px-3 text-right sm:text-left">Quantidade</th>
                                <th className="py-2.5 px-3 hidden md:table-cell">Observação</th>
                                <th className="py-2.5 pr-4 pl-2 text-right">Substituto?</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {itens.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                  <td className="py-3 pl-4 pr-2 text-center font-mono text-stone-400 font-bold text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-extrabold text-stone-900 text-sm leading-tight">
                                      {item.item || item.nome}
                                    </div>
                                    {item.observacao && item.observacao.trim() && (
                                      <p className="text-[11px] text-amber-900 italic mt-0.5 md:hidden bg-amber-50 px-2 py-0.5 rounded inline-block">
                                        Obs: {item.observacao.trim()}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 hidden sm:table-cell">
                                    {item.categoria && item.categoria !== '-' ? (
                                      <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                        {item.categoria}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right sm:text-left">
                                    <span className="font-black text-stone-950 text-sm bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 inline-block shadow-2xs">
                                      {item.quantidade} {item.unidade}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 hidden md:table-cell">
                                    {item.observacao && item.observacao.trim() ? (
                                      <span className="text-xs text-amber-950 italic bg-amber-50/80 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                        {item.observacao.trim()}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 pr-4 pl-2 text-right">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${
                                        item.aceitaSubstituto
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}
                                    >
                                      {item.aceitaSubstituto ? '✓ Aceita' : '✗ Não aceita'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: COMPROVANTES, VALORES E NOTAS FISCAIS              */}
          {/* ========================================================= */}
          {abaModal === 'anexos' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Barra de Ação Superior & Resumo Financeiro */}
              <div className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                      <Paperclip size={18} className="text-purple-600" />
                      <span>Comprovantes & Notas Fiscais ({anexosLista.length})</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Anexe fotos de notas fiscais ou PDFs com fornecedor, valor e responsável pelo pagamento.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleImprimir}
                      className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer tap-bounce shrink-0 shadow-xs"
                      title="Imprimir relatório completo de comprovantes e fotos numeradas"
                    >
                      <Printer size={15} className="text-purple-700" />
                      <span>Imprimir Relatório de Notas</span>
                    </button>

                    <button
                      type="button"
                      disabled={enviandoAnexos}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer tap-bounce shrink-0"
                    >
                      {enviandoAnexos ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          <span>Anexar Comprovante (Foto/PDF)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Cards de Métricas / Resumo dos Valores dos Comprovantes */}
                {anexosLista.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                        Total das Notas
                      </span>
                      <span className="text-lg font-black text-stone-900 block mt-0.5">
                        R$ {formatarMoeda(totaisComprovantes.total)}
                      </span>
                      <span className="text-[11px] text-stone-500">{anexosLista.length} comprovante(s)</span>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                        👤 Pago pelo Hóspede
                      </span>
                      <span className="text-lg font-black text-emerald-950 block mt-0.5">
                        R$ {formatarMoeda(totaisComprovantes.totalHospede)}
                      </span>
                      <span className="text-[11px] text-emerald-700">Reembolso / Acerto</span>
                    </div>

                    <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200/80">
                      <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">
                        👥 Pago por Outra Pessoa
                      </span>
                      <span className="text-lg font-black text-purple-950 block mt-0.5">
                        R$ {formatarMoeda(totaisComprovantes.totalOutro)}
                      </span>
                      <span className="text-[11px] text-purple-700">Equipe / Concierge / Terceiros</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista dos Comprovantes Anexados */}
              {anexosLista.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-stone-300 hover:border-purple-400 bg-stone-50/50 hover:bg-purple-50/30 text-center transition-all cursor-pointer space-y-3"
                >
                  <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <Upload size={26} />
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-stone-900">
                      Nenhum comprovante anexado a este pedido
                    </p>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                      Clique aqui para enviar fotos de notas fiscais, cupons de supermercado, peixaria ou comprovantes em PDF com o fornecedor e valor.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {anexosLista.map((anexo, index) => {
                    const numeroNota = index + 1;
                    const isOutraPessoa = anexo.quem_pagou === 'outra_pessoa';
                    const valorFormatado = formatarMoeda(anexo.valor_total);

                    return (
                      <div
                        key={anexo.id}
                        className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                      >
                        {/* Topo do Card: Número da Nota, Data e Quem Pagou */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black bg-purple-700 text-white px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1">
                              <FileText size={12} />
                              <span>Nota {numeroNota}</span>
                            </span>

                            <span className="text-xs font-bold text-stone-600 flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-xl">
                              <Calendar size={13} className="text-stone-400" />
                              <span>{anexo.data_comprovante ? formatarDataBr(anexo.data_comprovante) : 'Data não informada'}</span>
                            </span>
                          </div>

                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                              isOutraPessoa
                                ? 'bg-purple-50 text-purple-900 border-purple-200'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            {isOutraPessoa ? (
                              <>
                                <Users size={12} className="text-purple-600" />
                                <span>Pago por: {anexo.quem_pagou_outro || 'Outra pessoa'}</span>
                              </>
                            ) : (
                              <>
                                <User size={12} className="text-emerald-600" />
                                <span>Pago pelo Hóspede</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Corpo do Card: Prévia da Foto + Fornecedor + Valor */}
                        <div className="flex items-start gap-3.5 pt-1">
                          {anexo.tipo === 'imagem' ? (
                            <div
                              onClick={() => setImagemZoom(anexo.url)}
                              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-stone-200 bg-stone-100 cursor-pointer relative group/img shadow-inner"
                              title="Clique para ampliar a foto"
                            >
                              <img
                                src={anexo.url}
                                alt={anexo.nome}
                                className="w-full h-full object-cover"
                              />
                              {/* Selo identificador sobre a imagem */}
                              <div className="absolute top-1 left-1 bg-stone-950/85 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                                Nota {numeroNota}
                              </div>
                              <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye size={16} />
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => window.open(anexo.url, '_blank')}
                              className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex flex-col items-center justify-center shrink-0 border border-red-200 cursor-pointer shadow-inner hover:bg-red-200 transition-colors relative"
                              title="Clique para abrir o PDF"
                            >
                              <div className="absolute top-1 left-1 bg-stone-950/85 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                                Nota {numeroNota}
                              </div>
                              <FileText size={22} className="mt-2" />
                              <span className="text-[10px] font-bold uppercase">PDF</span>
                            </div>
                          )}

                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold">
                              <Building2 size={13} className="text-amber-600 shrink-0" />
                              <span className="truncate">Fornecedor:</span>
                            </div>
                            <h5 className="font-black text-stone-900 text-base leading-tight truncate">
                              {anexo.fornecedor || 'Fornecedor não informado'}
                            </h5>

                            <div className="mt-1 flex items-baseline gap-1">
                              <span className="text-xs font-bold text-stone-500">Valor Total:</span>
                              <span className="text-lg font-black text-emerald-800">
                                R$ {valorFormatado}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-400 mt-1 truncate">
                              {anexo.nome} • {anexo.tamanho}
                            </p>
                          </div>
                        </div>

                        {/* Rodapé do Card com Ações */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-stone-400 truncate">
                            Anexado por {anexo.anexado_por_nome || 'Equipe'}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {anexo.tipo === 'imagem' ? (
                              <button
                                type="button"
                                onClick={() => setImagemZoom(anexo.url)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                                title="Ver imagem ampliada"
                              >
                                <Eye size={13} />
                                <span>Ver</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => window.open(anexo.url, '_blank')}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                                title="Abrir PDF em nova aba"
                              >
                                <ExternalLink size={13} />
                                <span>Abrir</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEditarComprovante(anexo)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Editar fornecedor, valor ou quem pagou"
                            >
                              <Edit3 size={13} />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoverAnexo(anexo.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Excluir este comprovante"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: DADOS DA HOSPEDAGEM & HISTÓRICO DE AUDITORIA      */}
          {/* ========================================================= */}
          {abaModal === 'estadia' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200 text-xs">
              {/* Card 1: Dados da Hospedagem */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <span className="font-extrabold text-[11px] text-stone-400 uppercase tracking-wider block border-b border-stone-100 pb-2">
                  Dados da Hospedagem
                </span>
                <div className="flex items-center gap-2">
                  <Home size={16} className="text-amber-600 shrink-0" />
                  <span className="font-extrabold text-stone-900 text-sm">{estadia.casa || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Calendar size={15} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Período:</strong> {formatarDataBr(estadia.entrada || '')} a {formatarDataBr(estadia.saida || '')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Users size={15} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Hóspedes:</strong> {estadia.hospedes || '-'} pessoas
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <User size={15} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Titular:</strong> {estadia.titular || 'Não informado'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <ShieldCheck size={15} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Responsável da Equipe:</strong> {estadia.funcionario || 'Não informado'}
                  </span>
                </div>
              </div>

              {/* Card 2: Trilha Completa de Auditoria */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <span className="font-extrabold text-[11px] text-stone-400 uppercase tracking-wider block border-b border-stone-100 pb-2">
                  Histórico de Execução do Pedido
                </span>

                <div className="space-y-2 text-xs">
                  {/* Quem enviou pelo cardápio */}
                  <div className="flex items-start gap-2 text-stone-900">
                    <ChefHat size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Pedido Feito por: {pedido.cozinheira}</strong>
                      <span className="text-[11px] text-stone-500">
                        {formatarDataHoraBahia(pedido.finalizado_em)}
                      </span>
                    </div>
                  </div>

                  {/* Quem aprovou */}
                  {pedido.aprovado_por_nome && (
                    <div className="flex items-start gap-2 text-sky-900 pt-2 border-t border-stone-100">
                      <CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Aprovado por: {pedido.aprovado_por_nome}</strong>
                        <span className="text-[11px] text-stone-500">
                          {formatarDataHoraBahia(pedido.aprovado_em || '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quem rejeitou */}
                  {pedido.rejeitado_por_nome && (
                    <div className="flex items-start gap-2 text-red-900 pt-2 border-t border-stone-100">
                      <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Rejeitado por: {pedido.rejeitado_por_nome}</strong>
                        <span className="text-[11px] text-stone-500">
                          {formatarDataHoraBahia(pedido.rejeitado_em || '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quem marcou como enviado ao fornecedor */}
                  {pedido.enviado_fornecedor_por_nome && (
                    <div className="flex items-start gap-2 text-purple-900 pt-2 border-t border-stone-100">
                      <Send size={16} className="text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Enviado aos fornecedores por: {pedido.enviado_fornecedor_por_nome}</strong>
                        <span className="text-[11px] text-stone-500">
                          {formatarDataHoraBahia(pedido.enviado_fornecedor_em || '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quem finalizou */}
                  {pedido.concluido_por_nome && (
                    <div className="flex items-start gap-2 text-emerald-900 pt-2 border-t border-stone-100">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Finalizado por: {pedido.concluido_por_nome}</strong>
                        <span className="text-[11px] text-stone-500">
                          {formatarDataHoraBahia(pedido.concluido_em || '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quem editou o pedido & O que foi editado */}
                  {pedido.editado_por_nome && (
                    <div className="flex items-start gap-2 text-amber-950 pt-2 border-t border-stone-100">
                      <Edit3 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <strong className="block text-stone-900">Editado por: {pedido.editado_por_nome}</strong>
                          <span className="text-[11px] text-stone-500">
                            {formatarDataHoraBahia(pedido.editado_em || '')}
                          </span>
                        </div>

                        {/* Detalhes de alterações registradas no pedido */}
                        {Array.isArray(pedido.historico_edicoes) && pedido.historico_edicoes.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                              Histórico detalhado das edições:
                            </span>
                            {pedido.historico_edicoes.map((ed: any, edIdx: number) => (
                              <div
                                key={edIdx}
                                className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                                  <span>
                                    Edição #{pedido.historico_edicoes!.length - edIdx} • {ed.autor_nome}
                                  </span>
                                  <span className="text-stone-500 font-normal">
                                    {formatarDataHoraBahia(ed.data)}
                                  </span>
                                </div>
                                {ed.motivo && (
                                  <p className="text-[11px] italic text-stone-600">
                                    Motivo: {ed.motivo}
                                  </p>
                                )}
                                {Array.isArray(ed.alteracoes) && ed.alteracoes.length > 0 ? (
                                  <div className="flex flex-col gap-1 pt-0.5">
                                    {ed.alteracoes.map((alt: string, aIdx: number) => {
                                      const isRemovido = alt.includes('➖');
                                      const isAdicionado = alt.includes('➕');
                                      return (
                                        <div
                                          key={aIdx}
                                          className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${
                                            isRemovido
                                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                                              : isAdicionado
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                              : 'bg-amber-100/70 border-amber-200 text-amber-950'
                                          }`}
                                        >
                                          {alt}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-stone-500">
                                    {ed.resumo || 'Itens do pedido ajustados.'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3.5 sm:px-6 sm:py-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-xs text-stone-500 hidden sm:inline">
            Exportação para Microsoft Excel e visualização com caixas de conferência.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleBaixarExcel}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Baixar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title={abaModal === 'anexos' ? 'Imprimir relatório de comprovantes e fotos numeradas' : 'Imprimir lista de compras no mesmo design da tela'}
            >
              <Printer size={14} />
              <span>{abaModal === 'anexos' ? 'Imprimir Relatório de Notas' : 'Imprimir Lista de Compras'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MODAL FORMULÁRIO DE PREENCHIMENTO DO COMPROVANTE       */}
      {/* ========================================================= */}
      {modalComprovanteAberto && comprovanteForm && (
        <div className="fixed inset-0 z-90 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base leading-tight">
                    {comprovanteForm.id ? 'Editar Dados do Comprovante' : 'Dados do Comprovante'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Preencha os dados da nota para o relatório final
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocFullscreen(true)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Maximizar visualização da imagem ou documento"
                >
                  <Maximize2 size={14} className="text-purple-600" />
                  <span>Maximizar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalComprovanteAberto(false);
                    setComprovanteForm(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Formulário com corpo com scroll e rodapé com botões sempre visíveis */}
            <form onSubmit={handleSalvarComprovante} className="flex-1 flex flex-col min-h-0 pt-3">
              {/* Corpo dos campos com overflow-y-auto */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
                {/* Miniatura Compacta do Documento / Comprovante (Clica para maximizar) */}
                <div
                  onClick={() => setDocFullscreen(true)}
                  className="bg-stone-50 hover:bg-purple-50/50 border border-stone-200 hover:border-purple-300 rounded-2xl p-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-2xs"
                  title="Clique para maximizar e ver a nota com zoom"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {comprovanteForm.tipo === 'imagem' ? (
                      <div className="w-13 h-13 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-900 relative">
                        <img
                          src={comprovanteForm.url}
                          alt={comprovanteForm.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                          <Maximize2 size={16} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-13 h-13 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                        <FileText size={22} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="font-bold text-xs text-stone-900 truncate group-hover:text-purple-700 transition-colors">
                        {comprovanteForm.nome}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {comprovanteForm.tamanho}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 mt-0.5">
                        <Maximize2 size={11} />
                        <span>Toque para maximizar</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocFullscreen(true);
                    }}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 rounded-xl text-xs font-black shrink-0 flex items-center gap-1 transition-colors cursor-pointer tap-bounce"
                  >
                    <Maximize2 size={12} />
                    <span>Maximizar</span>
                  </button>
                </div>

                {/* Campo 1: Fornecedor */}
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    Fornecedor *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    list="lista-fornecedores-sugestao"
                    value={comprovanteForm.fornecedor}
                    onChange={(e) => {
                      setComprovanteForm({ ...comprovanteForm, fornecedor: e.target.value });
                      if (erroComprovante) setErroComprovante(null);
                    }}
                    placeholder="Ex: Peixaria Central, Supermercado, Hortifruti..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-200 focus:border-purple-600 focus:outline-hidden text-sm font-semibold text-stone-900 placeholder:text-stone-400 shadow-2xs"
                  />
                  <datalist id="lista-fornecedores-sugestao">
                    <option value="Peixaria" />
                    <option value="Açougue" />
                    <option value="Hortifruti" />
                    <option value="Frios & Laticínios" />
                    <option value="Bebidas" />
                    <option value="Mercado / Supermercado" />
                    <option value="Padaria" />
                    <option value="Farmácia" />
                    <option value="Gás & Água" />
                  </datalist>
                </div>

                {/* Grid: Valor Total & Data do Comprovante */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Campo 2: Valor Total */}
                  <div>
                    <label className="block text-xs font-black text-stone-800 mb-1">
                      Valor total (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={comprovanteForm.valor_total}
                        onChange={(e) => {
                          setComprovanteForm({ ...comprovanteForm, valor_total: e.target.value });
                          if (erroComprovante) setErroComprovante(null);
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-stone-200 focus:border-purple-600 focus:outline-hidden text-sm font-black text-stone-900 placeholder:text-stone-400 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Campo 3: Data do Comprovante */}
                  <div>
                    <label className="block text-xs font-black text-stone-800 mb-1">
                      Data da Nota/Recibo *
                    </label>
                    <input
                      type="date"
                      required
                      value={comprovanteForm.data_comprovante}
                      onChange={(e) => {
                        setComprovanteForm({ ...comprovanteForm, data_comprovante: e.target.value });
                        if (erroComprovante) setErroComprovante(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 focus:border-purple-600 focus:outline-hidden text-sm font-semibold text-stone-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Campo 4: Quem Pagou (Hóspede ou Outra Pessoa) */}
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1.5">
                    Quem Pagou? *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setComprovanteForm({
                          ...comprovanteForm,
                          quem_pagou: 'hospede',
                          quem_pagou_outro: ''
                        });
                        if (erroComprovante) setErroComprovante(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        comprovanteForm.quem_pagou === 'hospede'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <User size={14} className={comprovanteForm.quem_pagou === 'hospede' ? 'text-emerald-700' : 'text-stone-400'} />
                      <span>Hóspede</span>
                      {comprovanteForm.quem_pagou === 'hospede' && <Check size={14} className="text-emerald-700 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComprovanteForm({
                          ...comprovanteForm,
                          quem_pagou: 'outra_pessoa'
                        });
                        if (erroComprovante) setErroComprovante(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        comprovanteForm.quem_pagou === 'outra_pessoa'
                          ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Users size={14} className={comprovanteForm.quem_pagou === 'outra_pessoa' ? 'text-purple-700' : 'text-stone-400'} />
                      <span>Outra pessoa</span>
                      {comprovanteForm.quem_pagou === 'outra_pessoa' && <Check size={14} className="text-purple-700 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* Subcampo: Se marcou "Outra pessoa", pede o nome */}
                {comprovanteForm.quem_pagou === 'outra_pessoa' && (
                  <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-xs font-black text-purple-950">
                      Quem foi a outra pessoa que pagou? *
                    </label>
                    <input
                      type="text"
                      required
                      value={comprovanteForm.quem_pagou_outro}
                      onChange={(e) => {
                        setComprovanteForm({ ...comprovanteForm, quem_pagou_outro: e.target.value });
                        if (erroComprovante) setErroComprovante(null);
                      }}
                      placeholder="Ex: André (Concierge), Empresa Paralelo 17, Motorista..."
                      className="w-full px-3 py-2 rounded-xl border-2 border-purple-300 focus:border-purple-600 focus:outline-hidden text-xs font-bold text-stone-900 placeholder:text-stone-400 bg-white"
                    />
                    <p className="text-[10px] text-purple-700 font-medium">
                      💡 Esta informação será guardada para o acerto e relatório final da estadia.
                    </p>
                  </div>
                )}

                {/* Mensagem de Erro */}
                {erroComprovante && (
                  <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{erroComprovante}</span>
                  </div>
                )}
              </div>

              {/* Botões do Rodapé do Formulário - SEMPRE FIXOS E VISÍVEIS */}
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-stone-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalComprovanteAberto(false);
                    setComprovanteForm(null);
                  }}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={enviandoAnexos}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-black rounded-xl text-xs shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer tap-bounce"
                >
                  {enviandoAnexos ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>{comprovanteForm.id ? 'Salvar Alterações' : 'Salvar Comprovante'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2.1 LIGHTBOX / TELA CHEIA DO DOCUMENTO SENDO PREENCHIDO    */}
      {/* ========================================================= */}
      {docFullscreen && comprovanteForm && (
        <div className="fixed inset-0 z-100 bg-stone-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          {/* Barra Superior de Controle */}
          <div className="p-3 sm:px-6 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 z-10 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                {comprovanteForm.tipo === 'imagem' ? <Eye size={16} /> : <FileText size={16} />}
              </div>
              <div className="truncate">
                <h4 className="font-extrabold text-xs sm:text-sm truncate text-white leading-tight">
                  {comprovanteForm.nome}
                </h4>
                <span className="text-[10px] text-stone-400">
                  Modo Maximizado • Use os controles para inspecionar os detalhes da nota
                </span>
              </div>
            </div>

            {/* Ferramentas de Zoom & Rotação */}
            <div className="flex items-center gap-1 sm:gap-2">
              {comprovanteForm.tipo === 'imagem' && (
                <>
                  <button
                    type="button"
                    onClick={() => setDocZoomEscala((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                    className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors cursor-pointer"
                    title="Diminuir Zoom (-)"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-mono font-bold text-stone-300 px-1 hidden sm:inline">
                    {Math.round(docZoomEscala * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocZoomEscala((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                    className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors cursor-pointer"
                    title="Aumentar Zoom (+)"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocRotacao((prev) => (prev + 90) % 360)}
                    className="px-2.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="Girar 90 graus"
                  >
                    <RotateCw size={15} />
                    <span className="hidden sm:inline">Girar</span>
                    {docRotacao > 0 && <span className="text-[10px]">({docRotacao}°)</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocZoomEscala(1);
                      setDocRotacao(0);
                    }}
                    className="px-2.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer hidden md:inline"
                    title="Resetar Zoom e Rotação"
                  >
                    Resetar
                  </button>
                </>
              )}

              {comprovanteForm.tipo === 'pdf' && (
                <button
                  type="button"
                  onClick={() => window.open(comprovanteForm.url, '_blank')}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Abrir em Nova Aba</span>
                </button>
              )}

              {/* Botão de Fechar e Voltar ao Formulário */}
              <button
                type="button"
                onClick={() => setDocFullscreen(false)}
                className="ml-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/30 tap-bounce cursor-pointer"
              >
                <X size={15} />
                <span>Voltar ao Formulário</span>
              </button>
            </div>
          </div>

          {/* Área da Imagem / PDF em Tela Cheia */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center select-none">
            {comprovanteForm.tipo === 'imagem' ? (
              <div
                className="transition-transform duration-200 flex items-center justify-center max-w-full"
                style={{
                  transform: `rotate(${docRotacao}deg) scale(${docZoomEscala})`,
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={comprovanteForm.url}
                  alt={comprovanteForm.nome}
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-stone-800"
                />
              </div>
            ) : (
              <iframe
                src={comprovanteForm.url}
                title={comprovanteForm.nome}
                className="w-full h-full max-w-5xl rounded-2xl border border-stone-800 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. LIGHTBOX ZOOM DE IMAGEM ANEXADA                        */}
      {/* ========================================================= */}
      {imagemZoom && (
        <div
          onClick={() => setImagemZoom(null)}
          className="fixed inset-0 z-110 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imagemZoom}
              alt="Ampliação do comprovante"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-stone-700"
            />
            <button
              type="button"
              onClick={() => setImagemZoom(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3.1 MODAL DE EDIÇÃO COMPLETA DE ITENS DO PEDIDO           */}
      {/* ========================================================= */}
      {modalEditarAberto && (
        <div className="fixed inset-0 z-100 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Cabeçalho do Modal de Edição */}
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Edit3 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-stone-900 text-base leading-tight">
                      Editar Pedido #{pedido.numero}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {itensEdicao.length} {itensEdicao.length === 1 ? 'item' : 'itens'}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      • {estadia.casa || 'Estadia'} ({pedido.cozinheira})
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Ajuste quantidades, observações ou adicione e remova itens antes da aprovação
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMostrarNovoItemForm((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer tap-bounce ${
                    mostrarNovoItemForm
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <Plus size={14} />
                  <span>{mostrarNovoItemForm ? 'Fechar Inclusão' : 'Adicionar Item'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Formulário Retrátil para Inserir Novo Item */}
            {mostrarNovoItemForm && (
              <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl shrink-0 animate-in slide-in-from-top-2 duration-150 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={13} className="text-amber-700" />
                    <span>Adicionar Novo Item ao Pedido</span>
                  </span>
                  <span className="text-[11px] text-amber-800">
                    O item será adicionado no topo da lista
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  {/* Nome do Item */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold uppercase text-stone-600 mb-0.5">Item / Produto *</label>
                    <input
                      type="text"
                      value={novoItem.item}
                      onChange={(e) => setNovoItem({ ...novoItem, item: e.target.value })}
                      placeholder="Ex: Queijo Minas Padrão, Pera Williams..."
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-600"
                    />
                  </div>

                  {/* Fornecedor */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-stone-600 mb-0.5">Fornecedor / Categoria *</label>
                    <select
                      value={novoItem.fornecedor}
                      onChange={(e) => setNovoItem({ ...novoItem, fornecedor: e.target.value, categoria: NOMES_FORNECEDORES[e.target.value]?.nome || 'Geral' })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-600 cursor-pointer"
                    >
                      <option value="hortifruti">Hortifruti</option>
                      <option value="bebidas">Bebidas</option>
                      <option value="mercado">Mercado</option>
                      <option value="frios-laticinios">Frios & Laticínios</option>
                      <option value="acougue">Açougue</option>
                      <option value="peixaria">Peixaria</option>
                    </select>
                  </div>

                  {/* Quantidade */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-stone-600 mb-0.5">Qtd *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-600"
                    />
                  </div>

                  {/* Unidade */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-stone-600 mb-0.5">Unidade *</label>
                    <input
                      type="text"
                      list="opcoes-unidades-edicao"
                      value={novoItem.unidade}
                      onChange={(e) => setNovoItem({ ...novoItem, unidade: e.target.value })}
                      placeholder="un, kg, litro..."
                      className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-600"
                    />
                    <datalist id="opcoes-unidades-edicao">
                      <option value="un" />
                      <option value="kg" />
                      <option value="litro" />
                      <option value="pacote" />
                      <option value="bandeja" />
                      <option value="lata" />
                      <option value="garrafa" />
                      <option value="pote" />
                      <option value="caixa" />
                    </datalist>
                  </div>

                  {/* Observação */}
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-bold uppercase text-stone-600 mb-0.5">Observação (Opcional)</label>
                    <input
                      type="text"
                      value={novoItem.observacao}
                      onChange={(e) => setNovoItem({ ...novoItem, observacao: e.target.value })}
                      placeholder="Ex: Marca específica, bem maduro, sem glúten..."
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-medium text-stone-800 focus:outline-hidden focus:border-amber-600"
                    />
                  </div>

                  {/* Aceita substituto e Botão Inserir */}
                  <div className="sm:col-span-4 flex items-end gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 pb-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={novoItem.aceitaSubstituto}
                        onChange={(e) => setNovoItem({ ...novoItem, aceitaSubstituto: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Aceita substituto</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (!novoItem.item.trim()) {
                          alert('Informe o nome do item a ser adicionado.');
                          return;
                        }
                        const itemParaAdicionar = {
                          ...novoItem,
                          item: novoItem.item.trim(),
                          quantidade: Number(novoItem.quantidade) || 1,
                          unidade: novoItem.unidade.trim() || 'un',
                          is_custom: true
                        };
                        setItensEdicao((prev) => [itemParaAdicionar, ...prev]);
                        setNovoItem({
                          item: '',
                          fornecedor: novoItem.fornecedor,
                          categoria: NOMES_FORNECEDORES[novoItem.fornecedor]?.nome || 'Geral',
                          quantidade: 1,
                          unidade: 'un',
                          observacao: '',
                          aceitaSubstituto: true
                        });
                        showToast(`"${itemParaAdicionar.item}" adicionado à lista.`);
                      }}
                      className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer tap-bounce shrink-0"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Barra de Filtro e Busca Rápida */}
            <div className="flex items-center justify-between gap-3 pt-3 pb-2 shrink-0 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={buscaItemEdicao}
                  onChange={(e) => setBuscaItemEdicao(e.target.value)}
                  placeholder="Filtrar por nome ou categoria..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFiltroFornEdicao('todos')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    filtroFornEdicao === 'todos' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Todos ({itensEdicao.length})
                </button>
                {['hortifruti', 'bebidas', 'mercado', 'frios-laticinios', 'acougue', 'peixaria'].map((forn) => {
                  const qtd = itensEdicao.filter((i) => i.fornecedor === forn).length;
                  if (qtd === 0) return null;
                  const label = NOMES_FORNECEDORES[forn]?.nome || forn;
                  return (
                    <button
                      key={forn}
                      type="button"
                      onClick={() => setFiltroFornEdicao(forn)}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        filtroFornEdicao === forn ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {label} ({qtd})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista dos Itens Editáveis */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
              {itensEdicao.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  Nenhum item no pedido. Clique em <strong>"Adicionar Item"</strong> acima para inserir.
                </div>
              ) : (
                itensEdicao
                  .map((it, realIndex) => ({ item: it, index: realIndex }))
                  .filter(({ item }) => {
                    const termo = buscaItemEdicao.toLowerCase();
                    const bateNome = (item.item || item.nome || '').toLowerCase().includes(termo);
                    const bateCat = (item.categoria || '').toLowerCase().includes(termo);
                    const bateFiltro = filtroFornEdicao === 'todos' || item.fornecedor === filtroFornEdicao;
                    return (bateNome || bateCat) && bateFiltro;
                  })
                  .map(({ item, index }) => (
                    <div
                      key={index}
                      className="bg-white border border-stone-200 hover:border-amber-300 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all"
                    >
                      {/* Info do Item */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={item.item || item.nome}
                            onChange={(e) => {
                              const novaLista = [...itensEdicao];
                              novaLista[index] = { ...novaLista[index], item: e.target.value };
                              setItensEdicao(novaLista);
                            }}
                            className="font-extrabold text-stone-900 text-xs sm:text-sm bg-transparent hover:bg-stone-50 focus:bg-amber-50 focus:outline-hidden px-1.5 py-0.5 rounded-lg border border-transparent focus:border-amber-400 flex-1 min-w-[180px]"
                          />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                            {NOMES_FORNECEDORES[item.fornecedor]?.nome || item.fornecedor || item.categoria || 'Geral'}
                          </span>
                        </div>

                        {/* Observação Inline */}
                        <div className="mt-1">
                          <input
                            type="text"
                            value={item.observacao || ''}
                            onChange={(e) => {
                              const novaLista = [...itensEdicao];
                              novaLista[index] = { ...novaLista[index], observacao: e.target.value };
                              setItensEdicao(novaLista);
                            }}
                            placeholder="Obs / marca de preferência (opcional)..."
                            className="w-full text-[11px] text-stone-600 italic bg-transparent hover:bg-stone-50 focus:bg-white focus:outline-hidden px-1.5 py-0.5 rounded border border-transparent focus:border-stone-300 placeholder:text-stone-300"
                          />
                        </div>
                      </div>

                      {/* Controles de Quantidade, Substituto e Excluir */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Seletor de Quantidade com - e + */}
                        <div className="flex items-center bg-stone-100 border border-stone-200 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const novaLista = [...itensEdicao];
                              const atual = Number(novaLista[index].quantidade) || 1;
                              const step = atual > 1 && atual % 1 === 0 ? 1 : 0.5;
                              const novo = Math.max(0.1, Number((atual - step).toFixed(2)));
                              novaLista[index] = { ...novaLista[index], quantidade: novo };
                              setItensEdicao(novaLista);
                            }}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs active:scale-95"
                            title="Diminuir quantidade"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantidade}
                            onChange={(e) => {
                              const novaLista = [...itensEdicao];
                              novaLista[index] = { ...novaLista[index], quantidade: parseFloat(e.target.value) || 0 };
                              setItensEdicao(novaLista);
                            }}
                            className="w-12 text-center text-xs font-black text-stone-900 bg-transparent focus:outline-hidden"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const novaLista = [...itensEdicao];
                              const atual = Number(novaLista[index].quantidade) || 1;
                              const step = atual % 1 === 0 ? 1 : 0.5;
                              const novo = Number((atual + step).toFixed(2));
                              novaLista[index] = { ...novaLista[index], quantidade: novo };
                              setItensEdicao(novaLista);
                            }}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs active:scale-95"
                            title="Aumentar quantidade"
                          >
                            +
                          </button>

                          <span className="text-[11px] font-bold text-stone-500 px-2 select-none">
                            {item.unidade || 'un'}
                          </span>
                        </div>

                        {/* Botão de Alternar Substituto */}
                        <button
                          type="button"
                          onClick={() => {
                            const novaLista = [...itensEdicao];
                            novaLista[index] = { ...novaLista[index], aceitaSubstituto: !novaLista[index].aceitaSubstituto };
                            setItensEdicao(novaLista);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer select-none ${
                            item.aceitaSubstituto
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                          title="Clique para alternar se aceita substituto"
                        >
                          {item.aceitaSubstituto ? '✓ Substituto' : '✗ Não substitui'}
                        </button>

                        {/* Botão de Excluir Item */}
                        <button
                          type="button"
                          onClick={() => {
                            const nome = item.item || item.nome || 'o item';
                            if (confirm(`Remover "${nome}" deste pedido?`)) {
                              const novaLista = itensEdicao.filter((_, i) => i !== index);
                              setItensEdicao(novaLista);
                              showToast(`"${nome}" removido do pedido.`);
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors cursor-pointer tap-bounce"
                          title="Remover item do pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Rodapé Fixo com Botões de Ação */}
            <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-stone-100 shrink-0">
              <div className="text-xs text-stone-500 font-semibold">
                Total: <strong className="text-stone-900">{itensEdicao.length}</strong> itens no pedido
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={salvandoEdicao}
                  onClick={handleSalvarEdicao}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer tap-bounce"
                >
                  {salvandoEdicao ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} strokeWidth={2.5} />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MOTOR DE IMPRESSÃO / PDF NATIVO                       */}
      {/* ========================================================= */}
      <style>{`
        @media screen {
          .documento-impressao-pedido {
            display: none !important;
          }
        }
        @media print {
          @page {
            margin: 8mm 10mm;
            size: auto;
          }
          body {
            background: #ffffff !important;
            color: #1c1917 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .modal-overlay-pedido {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
          }
          .modal-conteudo-tela {
            display: none !important;
          }
          .documento-impressao-pedido {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .documento-impressao-pedido * {
            visibility: visible !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div
        ref={printRef}
        id="area-impressao-pedido"
        className="documento-impressao-pedido p-4 sm:p-6 bg-white text-stone-900 font-sans w-full"
      >
        {/* ========================================================= */}
        {/* VISÃO A: LISTA DE COMPRAS (DESIGN IDÊNTICO AO DA TELA)   */}
        {/* ========================================================= */}
        {abaModal !== 'anexos' && (
          <div className="w-full text-stone-900 font-sans">
            {/* Cabeçalho Superior Escuro */}
            <div className="bg-stone-950 text-white p-4 rounded-2xl flex items-center justify-between mb-3 border border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/30 shrink-0">
                  #{pedido.numero}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-extrabold text-base leading-tight text-white">
                      Pedido #{pedido.numero}
                    </h1>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {totalItens} {totalItens === 1 ? 'item solicitado' : 'itens solicitados'}
                    </span>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                      👩‍🍳 {pedido.cozinheira}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-stone-200">{estadia.casa || 'Casa de Temporada'}</span>
                    <span>•</span>
                    <span>Enviado em {formatarDataHoraBahia(pedido.finalizado_em)}</span>
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-stone-400">
                <p className="font-bold text-stone-300 uppercase tracking-wider">Cardápio Digital</p>
                <p>Ficha de Separação e Conferência</p>
              </div>
            </div>

            {/* Stepper / Timeline de 4 Fases (idêntico ao da tela) */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {/* Passo 1: Em Aprovação */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                  statusAtual === 'em_aprovacao'
                    ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-black'
                    : 'bg-white border-stone-200 text-stone-500 font-bold'
                }`}
              >
                <Clock size={13} className={statusAtual === 'em_aprovacao' ? 'text-amber-700' : 'text-stone-400'} />
                <span>1. Em Aprovação</span>
              </div>

              {/* Passo 2: Enviar Fornecedores */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                  statusAtual === 'enviar_fornecedores'
                    ? 'bg-sky-100/90 border-sky-300 text-sky-950 font-black'
                    : 'bg-white border-stone-200 text-stone-500 font-bold'
                }`}
              >
                <Send size={13} className={statusAtual === 'enviar_fornecedores' ? 'text-sky-700' : 'text-stone-400'} />
                <span>2. Enviar Fornecedores</span>
              </div>

              {/* Passo 3: Preparação & Entrega */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                  statusAtual === 'preparacao_entrega'
                    ? 'bg-purple-100/90 border-purple-300 text-purple-950 font-black'
                    : 'bg-white border-stone-200 text-stone-500 font-bold'
                }`}
              >
                <Package size={13} className={statusAtual === 'preparacao_entrega' ? 'text-purple-700' : 'text-stone-400'} />
                <span>3. Preparação & Entrega</span>
              </div>

              {/* Passo 4: Finalizado */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                  statusAtual === 'finalizado'
                    ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-black ring-1 ring-emerald-500/30'
                    : 'bg-white border-stone-200 text-stone-500 font-bold'
                }`}
              >
                <CheckCircle2 size={13} className={statusAtual === 'finalizado' ? 'text-emerald-700' : 'text-stone-400'} />
                <span>4. Finalizado</span>
              </div>
            </div>

            {/* Banner de Contexto da Fase Atual */}
            <div className="bg-white border border-stone-200 p-2.5 rounded-2xl mb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {statusAtual === 'finalizado' ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-emerald-900 font-semibold">
                      Pedido finalizado com sucesso por <strong>{pedido.concluido_por_nome || 'Equipe'}</strong> {pedido.concluido_em ? `em ${formatarDataHoraBahia(pedido.concluido_em)}` : ''}.
                    </span>
                  </>
                ) : statusAtual === 'preparacao_entrega' ? (
                  <>
                    <Package size={15} className="text-purple-600 shrink-0" />
                    <span className="text-purple-900 font-semibold">
                      Pedido em preparação e entrega. Enviado aos fornecedores por <strong>{pedido.enviado_fornecedor_por_nome || 'Equipe'}</strong>.
                    </span>
                  </>
                ) : statusAtual === 'enviar_fornecedores' ? (
                  <>
                    <Send size={15} className="text-sky-600 shrink-0" />
                    <span className="text-sky-900 font-semibold">
                      Pedido aprovado por <strong>{pedido.aprovado_por_nome || 'Equipe'}</strong>. Pronto para envio aos fornecedores.
                    </span>
                  </>
                ) : (
                  <>
                    <Clock size={15} className="text-amber-600 shrink-0" />
                    <span className="text-amber-900 font-semibold">
                      Pedido enviado pela cozinheira <strong>{pedido.cozinheira}</strong>. Aguarda aprovação para prosseguir.
                    </span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-stone-400">Cardápio Digital</span>
            </div>

            {/* Card com Metadados da Hospedagem (Cozinheira, Casa, Período, Hóspedes) */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 mb-4 shadow-2xs">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">COZINHEIRA:</span>
                  <span className="font-extrabold text-stone-900 text-sm">{pedido.cozinheira}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">CASA:</span>
                  <span className="font-bold text-stone-800 text-sm">{estadia.casa || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">PERÍODO:</span>
                  <span className="font-medium text-stone-700 text-xs">
                    {formatarDataBr(estadia.entrada || '')} a {formatarDataBr(estadia.saida || '')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">HÓSPEDES / TITULAR:</span>
                  <span className="font-medium text-stone-700 text-xs">
                    {estadia.hospedes || '-'} pess. • {estadia.titular || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabelas de Itens por Fornecedor (Completo, sem filtros) */}
            <div className="space-y-4">
              {Object.entries(itensPorFornecedor).map(([fornId, itens]) => {
                const fornInfo = NOMES_FORNECEDORES[fornId] || {
                  nome: fornId.toUpperCase(),
                  cor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                  badge: 'bg-emerald-100 text-emerald-900 border-emerald-300'
                };

                return (
                  <div
                    key={fornId}
                    className="print-avoid-break bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs mb-4"
                  >
                    {/* Header da Categoria com verde idêntico ao do print 1 */}
                    <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-200/80 flex items-center justify-between font-black">
                      <span className="uppercase tracking-wider font-black text-emerald-950 text-xs">
                        {fornInfo.nome}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-stone-300 text-stone-800">
                        {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    {/* Tabela de Itens */}
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 pl-4 pr-2 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Solicitado</th>
                          <th className="py-2.5 px-3 w-36">Categoria</th>
                          <th className="py-2.5 px-3 w-28 text-left">Quantidade</th>
                          <th className="py-2.5 px-3">Observação</th>
                          <th className="py-2.5 pr-4 pl-2 w-24 text-right">Substituto?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {itens.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-stone-100">
                            <td className="py-2.5 pl-4 pr-2 text-center font-mono text-stone-400 font-bold text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-extrabold text-stone-900 text-xs">
                                {item.item || item.nome}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.categoria && item.categoria !== '-' ? (
                                <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 inline-block">
                                  {item.categoria}
                                </span>
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-left">
                              <span className="font-black text-stone-950 text-xs bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 inline-block">
                                {item.quantidade} {item.unidade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-600 italic text-[11px]">
                              {item.observacao && item.observacao.trim() ? item.observacao.trim() : '-'}
                            </td>
                            <td className="py-2.5 pr-4 pl-2 text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${
                                  item.aceitaSubstituto
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {item.aceitaSubstituto ? '✓ Aceita' : '✗ Não aceita'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Assinaturas no Rodapé da Lista de Compras */}
            <div className="mt-8 pt-4 border-t-2 border-stone-300 text-xs grid grid-cols-2 gap-8 print-avoid-break">
              <div className="border-t border-stone-400 pt-2 text-center">
                <p className="text-[11px] text-stone-500">Recebido por (Cozinheira):</p>
                <p className="font-black text-sm mt-1">{pedido.cozinheira}</p>
              </div>
              <div className="border-t border-stone-400 pt-2 text-center">
                <p className="text-[11px] text-stone-500">Conferido por (Equipe):</p>
                <p className="font-black text-sm mt-1">{estadia.funcionario || 'Responsável Operacional'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISÃO B: RELATÓRIO DE COMPROVANTES & NOTAS FISCAIS COM IMAGENS NUMERADAS  */}
        {/* ========================================================================= */}
        {abaModal === 'anexos' && (
          <div className="w-full text-stone-900 font-sans">
            {/* Topo do Relatório de Notas */}
            <div className="border-b-2 border-purple-900 pb-3 mb-4 flex justify-between items-start">
              <div>
                <div className="inline-block bg-purple-700 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded mb-1">
                  Relatório Financeiro de Comprovantes
                </div>
                <h1 className="text-xl font-black uppercase tracking-tight text-stone-900">
                  Comprovantes & Notas Fiscais &bull; Pedido #{pedido.numero}
                </h1>
                <p className="text-xs text-stone-600 mt-0.5">
                  <strong>Casa:</strong> {estadia.casa || 'Casa de Temporada'} &bull; <strong>Titular:</strong> {estadia.titular || 'Não informado'} &bull; <strong>Hóspedes:</strong> {estadia.hospedes || '-'} pess.
                </p>
              </div>
              <div className="text-right text-xs">
                <p><strong>Cozinheira:</strong> {pedido.cozinheira}</p>
                <p><strong>Período:</strong> {formatarDataBr(estadia.entrada || '')} a {formatarDataBr(estadia.saida || '')}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Painel de Indicadores / Resumo dos Valores (KPIs) */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-300">
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Total Geral das Notas
                </span>
                <span className="text-xl font-black text-stone-950 block mt-0.5">
                  R$ {formatarMoeda(totaisComprovantes.total)}
                </span>
                <span className="text-[11px] text-stone-600">{anexosLista.length} comprovante(s)</span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  👤 Total Pago pelo Hóspede
                </span>
                <span className="text-xl font-black text-emerald-950 block mt-0.5">
                  R$ {formatarMoeda(totaisComprovantes.totalHospede)}
                </span>
                <span className="text-[11px] text-emerald-700">Reembolso / Acerto direto</span>
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-300">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">
                  👥 Total Pago por Outras Pessoas
                </span>
                <span className="text-xl font-black text-purple-950 block mt-0.5">
                  R$ {formatarMoeda(totaisComprovantes.totalOutro)}
                </span>
                <span className="text-[11px] text-purple-700">Pendente de acerto pelo cliente</span>
              </div>
            </div>

            {/* Tabela Síntese das Notas */}
            {anexosLista.length > 0 && (
              <div className="print-avoid-break mb-6 bg-white rounded-xl border border-stone-300 overflow-hidden">
                <div className="bg-stone-100 px-3.5 py-2 border-b border-stone-300 font-extrabold text-xs uppercase tracking-wider text-stone-700">
                  Quadro Resumo de Notas Fiscais
                </div>
                <table className="w-full text-xs border-collapse text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-[10px] uppercase">
                      <th className="py-2 px-3 w-20">Nota #</th>
                      <th className="py-2 px-3">Fornecedor</th>
                      <th className="py-2 px-3 w-28">Data</th>
                      <th className="py-2 px-3">Quem Pagou</th>
                      <th className="py-2 px-3 text-right w-32">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {anexosLista.map((anexo, idx) => (
                      <tr key={anexo.id || idx}>
                        <td className="py-2 px-3 font-black text-purple-800">Nota {idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-stone-900">{anexo.fornecedor || 'Não informado'}</td>
                        <td className="py-2 px-3 text-stone-600">{anexo.data_comprovante ? formatarDataBr(anexo.data_comprovante) : '-'}</td>
                        <td className="py-2 px-3">
                          {anexo.quem_pagou === 'outra_pessoa' ? (
                            <span className="text-purple-800 font-bold">Pago por: {anexo.quem_pagou_outro || 'Outra pessoa'}</span>
                          ) : (
                            <span className="text-emerald-800 font-bold">Pago pelo Hóspede</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-stone-900">
                          R$ {formatarMoeda(anexo.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-300">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px]">Total Acumulado:</td>
                      <td className="py-2.5 px-3 text-right text-sm text-purple-950">R$ {formatarMoeda(totaisComprovantes.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Galeria Completa das Notas com IMAGENS E IDENTIFICAÇÃO PROEMINENTE NA IMAGEM */}
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-1">
                <h2 className="text-sm font-black uppercase text-stone-800">
                  Comprovantes e Fotos das Notas Fiscais Numeradas
                </h2>
              </div>

              {anexosLista.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                  Nenhum comprovante anexado a este pedido.
                </div>
              ) : (
                anexosLista.map((anexo, index) => {
                  const numeroNota = index + 1;
                  const isOutraPessoa = anexo.quem_pagou === 'outra_pessoa';

                  return (
                    <div
                      key={anexo.id || index}
                      className="print-avoid-break bg-white border-2 border-stone-300 rounded-2xl p-4 shadow-2xs mb-6"
                    >
                      {/* Header do Card da Nota */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-700 text-white font-black text-sm px-3 py-1 rounded-xl shadow-xs">
                            Nota {numeroNota}
                          </span>
                          <div>
                            <h3 className="font-black text-stone-900 text-base leading-tight">
                              {anexo.fornecedor || 'Fornecedor não informado'}
                            </h3>
                            <p className="text-xs text-stone-500">
                              Data da nota: {anexo.data_comprovante ? formatarDataBr(anexo.data_comprovante) : 'Não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-black text-emerald-800">
                            R$ {formatarMoeda(anexo.valor_total)}
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border inline-block mt-0.5 ${
                              isOutraPessoa
                                ? 'bg-purple-50 text-purple-900 border-purple-200'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            {isOutraPessoa ? `Pago por: ${anexo.quem_pagou_outro || 'Outra pessoa'}` : 'Pago pelo Hóspede'}
                          </span>
                        </div>
                      </div>

                      {/* IMAGEM DA NOTA COM IDENTIFICAÇÃO PROEMINENTE */}
                      <div className="mt-3">
                        {anexo.tipo === 'imagem' ? (
                          <div className="relative rounded-xl overflow-hidden border border-stone-300 bg-stone-50 text-center p-2">
                            {/* Barra Identificadora no Topo da Imagem */}
                            <div className="bg-stone-900 text-white px-3 py-1.5 rounded-lg mb-2 flex items-center justify-between text-xs font-black">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[11px] font-black uppercase">
                                  Nota {numeroNota}
                                </span>
                                <span>{anexo.fornecedor || 'Comprovante'}</span>
                              </div>
                              <span>R$ {formatarMoeda(anexo.valor_total)}</span>
                            </div>

                            {/* Container da Imagem com Badge Flutuante "Nota X" */}
                            <div className="relative inline-block max-w-full">
                              <img
                                src={anexo.url}
                                alt={`Comprovante da Nota ${numeroNota} - ${anexo.fornecedor}`}
                                className="max-h-[500px] max-w-full object-contain mx-auto rounded-lg border border-stone-200 shadow-xs"
                              />
                              {/* Badge "Nota X" diretamente sobre a imagem */}
                              <div className="absolute top-2.5 left-2.5 bg-stone-950/90 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-md border border-white/20 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                <span>Nota {numeroNota}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 text-red-700 rounded-2xl mb-1">
                              <FileText size={26} />
                            </div>
                            <div className="inline-block bg-purple-700 text-white font-black text-xs px-3 py-1 rounded-md">
                              DOCUMENTO PDF &bull; NOTA {numeroNota}
                            </div>
                            <p className="font-extrabold text-stone-900 text-sm">{anexo.nome}</p>
                            <p className="text-xs text-stone-500">
                              Tamanho: {anexo.tamanho} &bull; Fornecedor: {anexo.fornecedor || '-'} &bull; Valor: R$ {formatarMoeda(anexo.valor_total)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Auditoria no Rodapé da Nota */}
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                        <span>Arquivo: {anexo.nome} ({anexo.tamanho})</span>
                        <span>Anexado por: {anexo.anexado_por_nome || 'Equipe'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Assinaturas no Rodapé do Relatório Financeiro */}
            <div className="mt-8 pt-4 border-t-2 border-purple-900 text-xs grid grid-cols-2 gap-8 print-avoid-break">
              <div className="border-t border-stone-400 pt-2 text-center">
                <p className="text-[11px] text-stone-500">Conferido e Lançado por (Equipe):</p>
                <p className="font-black text-sm mt-1">{estadia.funcionario || 'Responsável Financeiro'}</p>
              </div>
              <div className="border-t border-stone-400 pt-2 text-center">
                <p className="text-[11px] text-stone-500">De Acordo / Assinatura do Titular:</p>
                <p className="font-black text-sm mt-1">{estadia.titular || 'Hóspede Titular'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
