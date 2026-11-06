import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Estadia,
  PedidoBanco,
  AnexoPedido,
  AdiantamentoEstadia,
  listarPedidosPorEstadia,
  adicionarAdiantamentoEstadia,
  removerAdiantamentoEstadia,
  registrarPagamentoNotaPedido
} from '../services/db';
import { formatarDataBr, formatarDataHoraBahia } from '../services/gerarPlanilha';
import { comprimirComprovanteParaUpload } from '../services/anexoStorage';
import {
  CreditCard,
  DollarSign,
  Wallet,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Printer,
  Search,
  ExternalLink,
  Eye,
  Calendar,
  Users,
  User,
  Home,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  Sparkles,
  UploadCloud,
  Check,
  FileCheck
} from 'lucide-react';

interface NotaComPedido extends AnexoPedido {
  pedido_id: string;
  pedido_numero: number;
  pedido_cozinheira: string;
  pedido_status: string;
  pedido_data: string;
}

interface GerenciamentoPagamentosModalProps {
  estadia: Estadia;
  onClose: () => void;
  onEstadiaAtualizada?: (estadiaAtualizada: Estadia) => void;
  onPedidoAtualizado?: (pedidoAtualizado: PedidoBanco) => void;
  onAbrirPedido?: (pedidoId: string, pedidoObj?: PedidoBanco) => void;
  versaoAtualizacao?: number;
}

export const GerenciamentoPagamentosModal: React.FC<GerenciamentoPagamentosModalProps> = ({
  estadia,
  onClose,
  onEstadiaAtualizada,
  onPedidoAtualizado,
  onAbrirPedido,
  versaoAtualizacao = 0
}) => {
  const [estadiaLocal, setEstadiaLocal] = useState<Estadia>(estadia);
  const [pedidos, setPedidos] = useState<PedidoBanco[]>([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(true);

  // Navegação: 'notas' ou 'adiantamentos'
  const [abaAtiva, setAbaAtiva] = useState<'notas' | 'adiantamentos'>('notas');

  // Filtros da aba de notas
  const [filtroNotas, setFiltroNotas] = useState<'todas' | 'pendentes' | 'hospede'>('todas');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');

  // Modal / Formulário de Receber Pagamento Geral (Adiantamento da Estadia)
  const [modalReceberPagamentoAberto, setModalReceberPagamentoAberto] = useState(false);
  const [formValor, setFormValor] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10));
  const [formMetodo, setFormMetodo] = useState('PIX');
  const [formQuemPagou, setFormQuemPagou] = useState<'hospede' | 'outra_pessoa'>('hospede');
  const [formQuemPagouOutro, setFormQuemPagouOutro] = useState('');
  const [formObservacao, setFormObservacao] = useState('');
  const [formComprovante, setFormComprovante] = useState<{
    url: string;
    nome: string;
    tipo: 'imagem' | 'pdf';
    tamanho: string;
  } | null>(null);

  // Modal / Formulário de Receber Pagamento de uma NOTA ESPECÍFICA
  const [notaParaReceber, setNotaParaReceber] = useState<{
    anexo: NotaComPedido;
    numeroNota: number;
  } | null>(null);
  const [formNotaValor, setFormNotaValor] = useState('');
  const [formNotaQuemPagou, setFormNotaQuemPagou] = useState<'hospede' | 'outra_pessoa'>('hospede');
  const [formNotaQuemPagouOutro, setFormNotaQuemPagouOutro] = useState('');
  const [formNotaData, setFormNotaData] = useState(new Date().toISOString().slice(0, 10));
  const [formNotaMetodo, setFormNotaMetodo] = useState('PIX');
  const [formNotaObservacao, setFormNotaObservacao] = useState('');
  const [formNotaComprovante, setFormNotaComprovante] = useState<{
    url: string;
    nome: string;
    tipo: 'imagem' | 'pdf';
    tamanho: string;
  } | null>(null);
  const [erroNotaPagamento, setErroNotaPagamento] = useState<string | null>(null);
  const [salvandoNotaPagamento, setSalvandoNotaPagamento] = useState(false);
  const fileInputNotaRef = useRef<HTMLInputElement>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Zoom de comprovante / lightbox
  const [imagemZoom, setImagemZoom] = useState<string | null>(null);

  // Modal para ver TODOS os comprovantes de uma nota específica
  const [modalComprovantesNota, setModalComprovantesNota] = useState<{
    anexo: NotaComPedido;
    numeroNota: number;
  } | null>(null);

  // Modal para pagar nota debitando do saldo/superávit do cliente
  const [modalPagarComSaldo, setModalPagarComSaldo] = useState<{
    anexo: NotaComPedido;
    numeroNota: number;
  } | null>(null);
  const [formValorSaldoDebitar, setFormValorSaldoDebitar] = useState('');
  const [salvandoPagamentoSaldo, setSalvandoPagamentoSaldo] = useState(false);

  // Mensagens toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const exibirToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Carrega pedidos vinculados à estadia
  useEffect(() => {
    let ativo = true;
    setCarregandoPedidos(true);

    listarPedidosPorEstadia(estadiaLocal.id)
      .then((peds) => {
        if (ativo) {
          setPedidos(peds);
          setCarregandoPedidos(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao listar pedidos da estadia:', err);
        if (ativo) setCarregandoPedidos(false);
      });

    return () => {
      ativo = false;
    };
  }, [estadiaLocal.id, versaoAtualizacao]);

  // Lista consolidada de todas as notas anexadas a todos os pedidos da estadia
  const todasAsNotas: NotaComPedido[] = useMemo(() => {
    const lista: NotaComPedido[] = [];
    pedidos.forEach((p) => {
      (p.anexos || []).forEach((a) => {
        lista.push({
          ...a,
          pedido_id: p.id,
          pedido_numero: p.numero,
          pedido_cozinheira: p.cozinheira,
          pedido_status: p.status,
          pedido_data: p.finalizado_em
        });
      });
    });

    // Ordenar pelas datas mais recentes
    return lista.sort((a, b) => {
      const dataA = a.data_comprovante || a.anexado_em || '';
      const dataB = b.data_comprovante || b.anexado_em || '';
      return dataB.localeCompare(dataA);
    });
  }, [pedidos]);

  // Separação de notas por status financeiro e cálculo exato de pagamentos e superávit
  const {
    notasQuitadas,
    notasPendentes,
    totalNotasGasto,
    totalNotasQuitadasPeloHospede,
    totalSuperavitNotas,
    totalPagoPorOutrasPessoas
  } = useMemo(() => {
    const quitadas: NotaComPedido[] = [];
    const pendentes: NotaComPedido[] = [];
    let somaGasto = 0;
    let somaQuitadasHospede = 0;
    let somaSuperavitNotas = 0;
    let somaOutrasPendentes = 0;

    todasAsNotas.forEach((n) => {
      const valorTotal = Number(n.valor_total) || 0;
      somaGasto += valorTotal;

      // Soma todos os pagamentos efetuados pelo hóspede nesta nota
      const pagoClienteNaNota = (n.pagamentos && n.pagamentos.length > 0)
        ? n.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
        : (n.quem_pagou === 'hospede' ? valorTotal : (Number(n.valor_pago) || 0));

      const quitadoNaNota = Math.min(valorTotal, pagoClienteNaNota);
      const superavitNaNota = Math.max(0, pagoClienteNaNota - valorTotal);
      const saldoDevedorNaNota = Math.max(0, valorTotal - pagoClienteNaNota);

      somaQuitadasHospede += quitadoNaNota;
      somaSuperavitNotas += superavitNaNota;
      somaOutrasPendentes += saldoDevedorNaNota;

      if (saldoDevedorNaNota <= 0.01) {
        quitadas.push(n);
      } else {
        pendentes.push(n);
      }
    });

    return {
      notasQuitadas: quitadas,
      notasPendentes: pendentes,
      totalNotasGasto: somaGasto,
      totalNotasQuitadasPeloHospede: somaQuitadasHospede,
      totalSuperavitNotas: somaSuperavitNotas,
      totalPagoPorOutrasPessoas: somaOutrasPendentes
    };
  }, [todasAsNotas]);

  // Lista e soma de saldos / adiantamentos do cliente
  const adiantamentos: AdiantamentoEstadia[] = useMemo(() => {
    return (estadiaLocal.adiantamentos || []).slice().sort((a, b) => {
      return (b.data || b.registrado_em).localeCompare(a.data || a.registrado_em);
    });
  }, [estadiaLocal.adiantamentos]);

  const totalAdiantamentos = useMemo(() => {
    return adiantamentos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  }, [adiantamentos]);

  // =========================================================================
  // OS 4 TOTAIS FINANCEIROS EXATOS:
  // 1. Total Geral Gasto = Soma dos valores totais de todas as compras
  // 2. Total Pago pelo Cliente = (Notas quitadas) + (Superávit das notas) + (Saldos/Adiantamentos)
  // 3. Total Pago por Outros = Saldo pendente a reembolsar das compras pagas por terceiros
  // 4. Situação Financeira / Superávit:
  //    (Total Créditos do Cliente) - (Total a Reembolsar p/ Outros)
  //    > 0 => Superávit / Crédito do Cliente (A casa/equipe deve ao cliente!)
  //    < 0 => Cliente está devendo
  //    == 0 => Quitado / Em dia
  // =========================================================================
  const totalGasto = totalNotasGasto;
  const totalCreditosCliente = totalSuperavitNotas + totalAdiantamentos;
  const totalPagoPeloCliente = totalNotasQuitadasPeloHospede + totalCreditosCliente;
  const saldoSituacao = totalCreditosCliente - totalPagoPorOutrasPessoas;
  const isSuperavit = saldoSituacao > 0.001;
  const isDevendo = saldoSituacao < -0.001;
  const totalDevendo = isDevendo ? Math.abs(saldoSituacao) : 0;
  // saldoDisponivelCliente: saldo em haver livre para o cliente usar em novas compras
  const saldoDisponivelCliente = Math.max(0, saldoSituacao);

  // Formatação em Real Brasileiro (R$)
  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Filtragem da lista de notas exibida
  const notasFiltradas = useMemo(() => {
    return todasAsNotas.filter((n) => {
      const valorTotal = Number(n.valor_total) || 0;
      const pagoClienteNaNota = (n.pagamentos && n.pagamentos.length > 0)
        ? n.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
        : (n.quem_pagou === 'hospede' ? valorTotal : (Number(n.valor_pago) || 0));

      const saldoDevedor = Math.max(0, valorTotal - pagoClienteNaNota);
      const isPendente = saldoDevedor > 0.01;
      const isQuitada = saldoDevedor <= 0.01;

      if (filtroNotas === 'pendentes' && !isPendente) return false;
      if (filtroNotas === 'hospede' && !isQuitada) return false;

      if (buscaFornecedor.trim()) {
        const termo = buscaFornecedor.trim().toLowerCase();
        const forn = (n.fornecedor || '').toLowerCase();
        const nome = (n.nome || '').toLowerCase();
        const quem = (n.quem_pagou_outro || '').toLowerCase();
        if (!forn.includes(termo) && !nome.includes(termo) && !quem.includes(termo)) {
          return false;
        }
      }

      return true;
    });
  }, [todasAsNotas, filtroNotas, buscaFornecedor]);

  // =========================================================================
  // HANDLERS PARA PAGAR NOTA COM SALDO DO CLIENTE (SUPERÁVIT)
  // =========================================================================
  const handleAbrirModalPagarComSaldo = (anexo: NotaComPedido, numeroNota: number) => {
    const valorTotal = Number(anexo.valor_total) || 0;
    const pagoClienteNaNota = (anexo.pagamentos && anexo.pagamentos.length > 0)
      ? anexo.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
      : (anexo.quem_pagou === 'hospede' ? valorTotal : (Number(anexo.valor_pago) || 0));
    const saldoDevedor = Math.max(0, valorTotal - pagoClienteNaNota);

    setModalPagarComSaldo({ anexo, numeroNota });
    const valorSugerido = Math.min(saldoDevedor, saldoDisponivelCliente);
    setFormValorSaldoDebitar(valorSugerido.toFixed(2).replace('.', ','));
  };

  const handleConfirmarPagamentoComSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPagarComSaldo) return;

    const valorLimpo = formValorSaldoDebitar.replace(/[^\d.,]/g, '').replace(',', '.');
    const valorNum = parseFloat(valorLimpo);

    if (isNaN(valorNum) || valorNum <= 0) {
      alert('Informe um valor válido a ser debitado do saldo.');
      return;
    }

    if (valorNum > saldoDisponivelCliente + 0.01) {
      alert(`O valor informado (${formatarMoeda(valorNum)}) é maior do que o saldo disponível do cliente (${formatarMoeda(saldoDisponivelCliente)}).`);
      return;
    }

    setSalvandoPagamentoSaldo(true);
    try {
      const notaAlvo = modalPagarComSaldo.anexo;
      const numNota = modalPagarComSaldo.numeroNota;
      const agora = new Date().toISOString().slice(0, 10);

      // 1. Registra o pagamento na nota com forma_pagamento "Saldo do Cliente"
      const { pedidoAtualizado } = await registrarPagamentoNotaPedido(
        notaAlvo.pedido_id,
        notaAlvo.id,
        {
          valor: valorNum,
          data: agora,
          forma_pagamento: 'Saldo do Cliente (Superávit)',
          quem_pagou: 'hospede',
          quem_pagou_nome: estadiaLocal.titular || 'Hóspede',
          observacao: `Debitado do saldo/superávit do cliente em conta (${formatarMoeda(valorNum)})`,
          comprovante_nome: 'Saldo do Cliente (Superávit)',
          comprovante_tipo: 'imagem',
          comprovante_url: '',
          comprovante_tamanho: 'Saldo em Conta'
        }
      );

      // 2. Grava o débito em adiantamentos da estadia para deduzir o saldo do cliente
      const estadiaAtualizada = await adicionarAdiantamentoEstadia(estadiaLocal.id, {
        valor: -valorNum,
        data: agora,
        forma_pagamento: 'Saldo do Cliente',
        observacao: `Debitado do saldo/superávit para quitação da Nota #${numNota} (${notaAlvo.fornecedor || 'Fornecedor'})`,
        quem_pagou: 'hospede',
        quem_pagou_nome: estadiaLocal.titular || 'Hóspede'
      });

      setEstadiaLocal(estadiaAtualizada);
      if (onEstadiaAtualizada) onEstadiaAtualizada(estadiaAtualizada);

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
      );
      if (onPedidoAtualizado) onPedidoAtualizado(pedidoAtualizado);

      setModalPagarComSaldo(null);
      exibirToast(`Nota #${numNota} quitada com sucesso utilizando ${formatarMoeda(valorNum)} do saldo do cliente!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar débito do saldo.');
    } finally {
      setSalvandoPagamentoSaldo(false);
    }
  };

  // =========================================================================
  // HANDLERS PARA RECEBER PAGAMENTO DE UMA NOTA ESPECÍFICA (COM COMPROVANTE)
  // =========================================================================
  const handleAbrirModalReceberPagamentoNota = (anexo: NotaComPedido, numeroNota: number) => {
    const valorTotal = Number(anexo.valor_total) || 0;
    const jaPago = Math.min(valorTotal, Number(anexo.valor_pago) || 0);
    const saldo = Math.max(0, valorTotal - jaPago);

    setNotaParaReceber({ anexo, numeroNota });
    setFormNotaValor(saldo > 0 ? saldo.toFixed(2).replace('.', ',') : valorTotal.toFixed(2).replace('.', ','));
    setFormNotaQuemPagou('hospede');
    setFormNotaQuemPagouOutro('');
    setFormNotaData(new Date().toISOString().slice(0, 10));
    setFormNotaMetodo('PIX');
    setFormNotaObservacao('');
    setFormNotaComprovante(null);
    setErroNotaPagamento(null);
  };

  const handleArquivoNotaSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErroNotaPagamento('O arquivo selecionado é muito grande. O limite máximo é de 15 MB.');
      return;
    }

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const tipo: 'imagem' | 'pdf' = isPdf ? 'pdf' : 'imagem';
      const { url: urlOtimizada, tamanhoFormatado } = await comprimirComprovanteParaUpload(file);

      setFormNotaComprovante({
        url: urlOtimizada,
        nome: file.name,
        tipo,
        tamanho: tamanhoFormatado
      });
      setErroNotaPagamento(null);
    } catch (err) {
      console.error('Erro ao processar comprovante da nota:', err);
      setErroNotaPagamento('Falha ao processar o arquivo selecionado.');
    } finally {
      if (fileInputNotaRef.current) fileInputNotaRef.current.value = '';
    }
  };

  const handleSalvarPagamentoNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroNotaPagamento(null);

    if (!notaParaReceber) return;

    // Validação 1: Anexo de comprovante OBRIGATÓRIO
    if (!formNotaComprovante) {
      setErroNotaPagamento('É obrigatório anexar o comprovante do pagamento (Foto ou PDF).');
      return;
    }

    // Validação 2: Se for outro terceiro, nome obrigatório
    if (formNotaQuemPagou === 'outra_pessoa' && !formNotaQuemPagouOutro.trim()) {
      setErroNotaPagamento('Por favor, escreva o nome de quem pagou a nota.');
      return;
    }

    // Validação 3: Valor positivo
    const valorLimpo = formNotaValor.replace(/[^\d.,]/g, '').replace(',', '.');
    const valorNum = parseFloat(valorLimpo);

    if (isNaN(valorNum) || valorNum <= 0) {
      setErroNotaPagamento('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (!formNotaData) {
      setErroNotaPagamento('Selecione a data em que o pagamento foi realizado.');
      return;
    }

    setSalvandoNotaPagamento(true);
    try {
      const pagadorNome = formNotaQuemPagou === 'hospede'
        ? (estadiaLocal.titular || 'Hóspede')
        : formNotaQuemPagouOutro.trim();

      const { pedidoAtualizado } = await registrarPagamentoNotaPedido(
        notaParaReceber.anexo.pedido_id,
        notaParaReceber.anexo.id,
        {
          valor: valorNum,
          data: formNotaData,
          forma_pagamento: formNotaMetodo,
          observacao: formNotaObservacao,
          quem_pagou: formNotaQuemPagou,
          quem_pagou_nome: pagadorNome,
          quem_pagou_outro: formNotaQuemPagouOutro,
          comprovante_url: formNotaComprovante.url,
          comprovante_nome: formNotaComprovante.nome,
          comprovante_tipo: formNotaComprovante.tipo,
          comprovante_tamanho: formNotaComprovante.tamanho
        }
      );

      // Atualiza pedidos na memória local do modal
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoAtualizado.id ? { ...p, ...pedidoAtualizado } : p))
      );

      // Notifica o AdminDashboard
      if (onPedidoAtualizado) {
        onPedidoAtualizado(pedidoAtualizado);
      }

      setNotaParaReceber(null);
      exibirToast(`Pagamento de ${formatarMoeda(valorNum)} registrado na Nota com sucesso!`);
    } catch (err: any) {
      setErroNotaPagamento(err.message || 'Erro ao registrar pagamento na nota.');
    } finally {
      setSalvandoNotaPagamento(false);
    }
  };

  // Manipulador de upload de comprovante de pagamento
  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErroPagamento('O arquivo selecionado é muito grande. O limite máximo é de 15 MB.');
      return;
    }

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const tipo: 'imagem' | 'pdf' = isPdf ? 'pdf' : 'imagem';

      // Comprime a imagem inteligentemente para não estourar a cota de 5MB do navegador
      const { url: urlOtimizada, tamanhoFormatado } = await comprimirComprovanteParaUpload(file);

      setFormComprovante({
        url: urlOtimizada,
        nome: file.name,
        tipo,
        tamanho: tamanhoFormatado
      });
      setErroPagamento(null);
    } catch (err) {
      console.error('Erro ao ler comprovante:', err);
      setErroPagamento('Falha ao processar o arquivo selecionado.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Salvar recebimento de pagamento
  const handleSalvarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroPagamento(null);

    // Validação 1: Comprovante obrigatório!
    if (!formComprovante) {
      setErroPagamento('É obrigatório anexar o comprovante do pagamento (Foto ou PDF).');
      return;
    }

    // Validação 2: Quem pagou se for outra pessoa
    if (formQuemPagou === 'outra_pessoa' && !formQuemPagouOutro.trim()) {
      setErroPagamento('Por favor, informe quem foi a outra pessoa que realizou o pagamento.');
      return;
    }

    // Validação 3: Valor pago
    const valorLimpo = formValor.replace(/[^\d.,]/g, '').replace(',', '.');
    const valorNum = parseFloat(valorLimpo);

    if (isNaN(valorNum) || valorNum <= 0) {
      setErroPagamento('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (!formData) {
      setErroPagamento('Selecione a data em que o pagamento foi realizado.');
      return;
    }

    setSalvandoPagamento(true);
    try {
      const quemPagouNome = formQuemPagou === 'hospede'
        ? (estadiaLocal.titular || 'Hóspede Titular')
        : formQuemPagouOutro.trim();

      const estadiaAtualizada = await adicionarAdiantamentoEstadia(estadiaLocal.id, {
        valor: valorNum,
        data: formData,
        forma_pagamento: formMetodo,
        observacao: formObservacao,
        comprovante_url: formComprovante.url,
        comprovante_nome: formComprovante.nome,
        comprovante_tipo: formComprovante.tipo,
        comprovante_tamanho: formComprovante.tamanho,
        quem_pagou: formQuemPagou,
        quem_pagou_nome: quemPagouNome
      });

      setEstadiaLocal(estadiaAtualizada);
      if (onEstadiaAtualizada) onEstadiaAtualizada(estadiaAtualizada);

      setModalReceberPagamentoAberto(false);
      setFormValor('');
      setFormObservacao('');
      setFormMetodo('PIX');
      setFormQuemPagou('hospede');
      setFormQuemPagouOutro('');
      setFormComprovante(null);
      exibirToast(`Pagamento de ${formatarMoeda(valorNum)} recebido com sucesso!`);
    } catch (err: any) {
      setErroPagamento(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  // Remover pagamento recebido
  const handleRemoverSaldo = async (adiantamentoId: string, valor: number) => {
    if (!window.confirm(`Deseja realmente excluir este pagamento recebido de ${formatarMoeda(valor)}?`)) {
      return;
    }

    try {
      const estadiaAtualizada = await removerAdiantamentoEstadia(estadiaLocal.id, adiantamentoId);
      setEstadiaLocal(estadiaAtualizada);
      if (onEstadiaAtualizada) onEstadiaAtualizada(estadiaAtualizada);
      exibirToast('Registro de pagamento removido com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao remover pagamento.');
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        
        {/* ========================================================= */}
        {/* TOAST DE NOTIFICAÇÃO RÁPIDA                               */}
        {/* ========================================================= */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* CABEÇALHO DO MODAL                                        */}
        {/* ========================================================= */}
        <div className="bg-stone-900 text-white p-4 sm:p-6 shrink-0 border-b border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg text-stone-950 shrink-0">
                <CreditCard size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Gerenciamento de Pagamentos
                  </h2>
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Financeiro da Estadia
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs text-stone-300 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <Home size={13} className="text-amber-400" />
                    {estadiaLocal.casa}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User size={13} className="text-stone-400" />
                    Titular: <strong className="text-stone-100">{estadiaLocal.titular}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-stone-400" />
                    {formatarDataBr(estadiaLocal.entrada)} até {formatarDataBr(estadiaLocal.saida)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-stone-400" />
                    {estadiaLocal.hospedes} hóspedes
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    Resp: <strong className="text-stone-200">{estadiaLocal.funcionario}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Botões do topo */}
            <div className="flex items-center gap-2 self-end sm:self-auto print:hidden">
              <button
                type="button"
                onClick={handleImprimir}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir relatório financeiro desta estadia"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Imprimir Resumo</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CORPO COM SCROLL: 4 CARDS DE TOTAIS + CONTEÚDO PRINCIPAL  */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:overflow-visible print:h-auto">
          
          {/* ========================================================= */}
          {/* OS 4 CARDS DE INDICADORES FINANCEIROS                     */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* CARD 1: TOTAL GERAL GASTO */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-stone-300 transition-all">
              <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1">
                <span className="uppercase tracking-wider">Total Geral Gasto</span>
                <span className="p-1.5 rounded-xl bg-stone-200/70 text-stone-700">
                  <Receipt size={16} />
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900 tracking-tight my-1">
                {formatarMoeda(totalGasto)}
              </div>
              <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200/60 mt-1">
                <span>Todas as notas ({todasAsNotas.length})</span>
                <span className="font-semibold text-stone-700">Total Compras</span>
              </div>
            </div>

            {/* CARD 2: TOTAL PAGO PELO CLIENTE */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                <span className="uppercase tracking-wider">Pago pelo Cliente</span>
                <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <Wallet size={16} />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 tracking-tight my-1">
                {formatarMoeda(totalPagoPeloCliente)}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center justify-between pt-1 border-t border-emerald-200/60 mt-1">
                <span>Notas ({formatarMoeda(totalNotasQuitadasPeloHospede)})</span>
                <span className="font-bold">+ Saldos/Superávit ({formatarMoeda(totalCreditosCliente)})</span>
              </div>
            </div>

            {/* CARD 3: TOTAL PAGO POR OUTRAS PESSOAS */}
            <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between text-xs text-purple-800 font-bold mb-1">
                <span className="uppercase tracking-wider">Pago por Outros</span>
                <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                  <Users size={16} />
                </span>
              </div>
              <div className="text-2xl font-black text-purple-950 tracking-tight my-1">
                {formatarMoeda(totalPagoPorOutrasPessoas)}
              </div>
              <div className="text-[11px] text-purple-700 flex items-center justify-between pt-1 border-t border-purple-200/60 mt-1">
                <span>{notasPendentes.length} nota(s) pendente(s)</span>
                <span className="font-semibold">Concierge / Equipe</span>
              </div>
            </div>

            {/* CARD 4: SITUAÇÃO / DEVENDO OU SUPERÁVIT PELO CLIENTE */}
            <div
              className={`rounded-2xl p-4 border flex flex-col justify-between relative overflow-hidden shadow-xs transition-all ${
                isSuperavit
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : isDevendo
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="uppercase tracking-wider">
                  {isSuperavit
                    ? 'Superávit / Crédito do Cliente'
                    : isDevendo
                    ? 'Cliente Está Devendo'
                    : 'Situação Financeira'}
                </span>
                <span
                  className={`p-1.5 rounded-xl ${
                    isSuperavit
                      ? 'bg-blue-200 text-blue-900'
                      : isDevendo
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {isSuperavit ? (
                    <Sparkles size={16} />
                  ) : isDevendo ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </span>
              </div>

              <div
                className={`text-2xl font-black tracking-tight my-1 ${
                  isSuperavit
                    ? 'text-blue-700'
                    : isDevendo
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatarMoeda(isSuperavit ? saldoSituacao : (isDevendo ? totalDevendo : 0))}
              </div>

              <div className="text-[11px] flex items-center justify-between pt-1 border-t border-black/10 mt-1 font-semibold">
                {isSuperavit ? (
                  <>
                    <span className="text-blue-800">🟢 Crédito p/ Cliente</span>
                    <span className="text-blue-700 text-[10px] font-bold">Disponível p/ compras</span>
                  </>
                ) : isDevendo ? (
                  <>
                    <span className="text-amber-800">⚠️ Pendente Reembolso</span>
                    <span className="text-stone-600 text-[10px]">Aguardando pagamento</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-800">✓ Quitado / Em dia</span>
                    <span className="text-emerald-600 text-[10px]">100% Coberto</span>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* BANNER DE SUPERÁVIT DISPONÍVEL DO CLIENTE */}
          {saldoDisponivelCliente > 0.01 && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-blue-950 flex items-center gap-2">
                    <span>Superávit Disponível do Cliente:</span>
                    <span className="text-blue-700 font-mono text-sm">{formatarMoeda(saldoDisponivelCliente)}</span>
                  </p>
                  <p className="text-[11px] text-blue-800">
                    O cliente pagou a mais e possui este saldo disponível em crédito. Use o botão <strong>"Pagar com Saldo"</strong> em notas pendentes para abater automaticamente!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* BARRA DE AÇÃO PRINCIPAL: ADICIONAR SALDO & NAVEGAÇÃO      */}
          {/* ========================================================= */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tabs de alternância */}
            <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAbaAtiva('notas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'notas'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Receipt size={14} />
                <span>Notas Fiscais dos Pedidos</span>
                <span className="ml-1 bg-stone-200 text-stone-700 text-[10px] px-1.5 py-0.2 rounded-full">
                  {todasAsNotas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('adiantamentos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'adiantamentos'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign size={14} />
                <span>Pagamentos Recebidos</span>
                <span className="ml-1 bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {adiantamentos.length}
                </span>
              </button>
            </div>

            {/* Botão de Receber Pagamento */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormValor('');
                  setFormObservacao('');
                  setFormMetodo('PIX');
                  setFormQuemPagou('hospede');
                  setFormQuemPagouOutro('');
                  setFormComprovante(null);
                  setErroPagamento(null);
                  setModalReceberPagamentoAberto(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all tap-bounce cursor-pointer"
              >
                <DollarSign size={16} />
                <span>Receber Pagamento</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ABA 1: NOTAS FISCAIS DOS PEDIDOS                          */}
          {/* ========================================================= */}
          {abaAtiva === 'notas' && (
            <div className="space-y-4">
              
              {/* Barra de Filtros das Notas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFiltroNotas('todas')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      filtroNotas === 'todas'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Todas ({todasAsNotas.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroNotas('pendentes')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      filtroNotas === 'pendentes'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    <span>⚠️ Pendente Reembolso Hóspede ({notasPendentes.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroNotas('hospede')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      filtroNotas === 'hospede'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>✓ Pago pelo Hóspede ({notasQuitadas.length})</span>
                  </button>
                </div>

                {/* Busca rápida */}
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={buscaFornecedor}
                    onChange={(e) => setBuscaFornecedor(e.target.value)}
                    placeholder="Buscar fornecedor ou pagador..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                  {buscaFornecedor && (
                    <button
                      type="button"
                      onClick={() => setBuscaFornecedor('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Listagem das Notas */}
              {carregandoPedidos ? (
                <div className="text-center py-12 text-stone-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando comprovantes dos pedidos...</span>
                </div>
              ) : notasFiltradas.length === 0 ? (
                <div className="text-center py-12 bg-stone-50/70 border border-dashed border-stone-200 rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <Receipt size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-stone-700 mb-1">
                    Nenhum comprovante encontrado
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    {todasAsNotas.length === 0
                      ? 'Nenhum comprovante ou nota fiscal foi anexado aos pedidos desta estadia ainda. Conforme as compras forem feitas e as fotos/PDFs forem anexados nos pedidos em "Preparação e Entrega", as notas aparecerão aqui com os cálculos automáticos.'
                      : 'Nenhuma nota corresponde ao filtro ou busca selecionada.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {notasFiltradas.map((anexo) => {
                    const numeroNota = todasAsNotas.findIndex((n) => n.id === anexo.id) + 1;
                    const valorTotal = typeof anexo.valor_total === 'number' ? anexo.valor_total : 0;
                    
                    // Cálculo correto dos pagamentos do hóspede nesta nota
                    const pagoClienteNaNota = (anexo.pagamentos && anexo.pagamentos.length > 0)
                      ? anexo.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
                      : (anexo.quem_pagou === 'hospede' ? valorTotal : (Number(anexo.valor_pago) || 0));

                    const quitadoHospede = Math.min(valorTotal, pagoClienteNaNota);
                    const saldoDevedor = Math.max(0, valorTotal - pagoClienteNaNota);
                    const superavitNota = Math.max(0, pagoClienteNaNota - valorTotal);
                    const isTotalmentePago = saldoDevedor <= 0.01;
                    const isParcial = !isTotalmentePago && quitadoHospede > 0.01;
                    const isPendenteReembolso = !isTotalmentePago;

                    return (
                      <div
                        key={anexo.id}
                        className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all bg-white hover:shadow-md ${
                          superavitNota > 0.01
                            ? 'border-blue-300 hover:border-blue-400 bg-blue-50/10'
                            : isTotalmentePago
                            ? 'border-emerald-200 hover:border-emerald-300'
                            : isParcial
                            ? 'border-amber-300 hover:border-amber-400 bg-amber-50/15'
                            : 'border-rose-200 hover:border-rose-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Miniatura ou Ícone */}
                          {anexo.tipo === 'imagem' ? (
                            <div
                              onClick={() => setImagemZoom(anexo.url)}
                              className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-100 cursor-pointer relative group/img shadow-inner"
                              title="Clique para ampliar o comprovante"
                            >
                              <img
                                src={anexo.url}
                                alt={anexo.nome}
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute top-1 left-1 bg-stone-950/85 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                                Nota {numeroNota}
                              </div>
                              <div className="absolute inset-0 bg-stone-950/20 group-hover/img:bg-stone-950/40 flex items-center justify-center text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <Eye size={16} />
                              </div>
                            </div>
                          ) : (
                            <a
                              href={anexo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-16 h-16 rounded-xl shrink-0 border border-purple-200 bg-purple-50 text-purple-700 flex flex-col items-center justify-center gap-1 hover:bg-purple-100 transition-colors shadow-inner relative"
                              title="Abrir PDF em nova aba"
                            >
                              <div className="absolute top-1 left-1 bg-stone-950/85 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                                Nota {numeroNota}
                              </div>
                              <FileText size={20} className="mt-2" />
                              <span className="text-[10px] font-black uppercase">PDF</span>
                            </a>
                          )}

                          {/* Dados da Nota */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded">
                                  Nota {numeroNota}
                                </span>
                                <span className="text-xs font-bold text-stone-900 truncate">
                                  {anexo.fornecedor || 'Fornecedor não especificado'}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-black text-stone-900">
                                {formatarMoeda(valorTotal)}
                              </span>
                            </div>

                            {/* Badge de Quem Pagou / Pendência / Superávit */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {isTotalmentePago ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>Pago pelo Hóspede</span>
                                </span>
                              ) : isParcial ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-amber-600" />
                                  <span>Pendente Parcial: Cliente deve {formatarMoeda(saldoDevedor)}</span>
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-rose-600" />
                                  <span>Pendente de Pagamento pelo Cliente</span>
                                </span>
                              )}

                              {superavitNota > 0.01 && (
                                <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                  <Sparkles size={11} className="text-blue-600" />
                                  <span>💰 Superávit: + {formatarMoeda(superavitNota)} em crédito</span>
                                </span>
                              )}

                              {anexo.data_comprovante && (
                                <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                                  {formatarDataBr(anexo.data_comprovante)}
                                </span>
                              )}
                            </div>

                            {/* Detalhes de pagamento parcial */}
                            {isParcial && (
                              <div className="mt-1.5 text-[11px] bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                                <div className="flex items-center justify-between text-stone-600">
                                  <span>Valor total da nota:</span>
                                  <span className="font-semibold">{formatarMoeda(valorTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span>Já pago pelo cliente:</span>
                                  <span className="font-bold">{formatarMoeda(quitadoHospede)}</span>
                                </div>
                                <div className="flex items-center justify-between text-rose-700 font-black border-t border-amber-200/60 pt-0.5">
                                  <span>Restante a pagar:</span>
                                  <span>{formatarMoeda(saldoDevedor)}</span>
                                </div>
                                {anexo.quem_pagou_outro && (
                                  <div className="text-[10px] text-stone-500 pt-0.5">
                                    Originalmente pago por: <strong>{anexo.quem_pagou_outro}</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Detalhes de quem pagou se for outra pessoa e não parcial */}
                            {!isTotalmentePago && !isParcial && anexo.quem_pagou_outro && (
                              <div className="mt-1 text-[11px] text-rose-900 font-medium">
                                Pago por: <strong>{anexo.quem_pagou_outro}</strong>
                              </div>
                            )}

                            {/* Vínculo com o pedido */}
                            <div className="mt-1.5 text-[10px] text-stone-500 flex items-center justify-between gap-2 border-t border-stone-100 pt-1">
                              <span className="truncate">
                                Pedido #{anexo.pedido_numero} • {anexo.pedido_cozinheira}
                              </span>
                              <span className="text-stone-400">
                                Anexado por: {anexo.anexado_por_nome || 'Equipe'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação na Nota */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className="text-[10px] text-stone-400 truncate max-w-[150px]" title={anexo.nome}>
                            {anexo.nome} ({anexo.tamanho})
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Botão de Receber Pagamento desta nota específica */}
                            {isPendenteReembolso && (
                              <button
                                type="button"
                                onClick={() => handleAbrirModalReceberPagamentoNota(anexo, numeroNota)}
                                className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Registrar recebimento de pagamento desta nota com comprovante"
                              >
                                <DollarSign size={12} />
                                <span>Receber Pagamento</span>
                              </button>
                            )}

                            {/* Botão de Pagar com Saldo do Cliente (se houver saldo disponível) */}
                            {isPendenteReembolso && saldoDisponivelCliente > 0.01 && (
                              <button
                                type="button"
                                onClick={() => handleAbrirModalPagarComSaldo(anexo, numeroNota)}
                                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                title={`Usar saldo disponível do cliente (${formatarMoeda(saldoDisponivelCliente)}) para pagar esta nota`}
                              >
                                <Sparkles size={12} />
                                <span>Pagar com Saldo</span>
                              </button>
                            )}

                            {/* Se tiver comprovantes de pagamento registrados na nota */}
                            {anexo.pagamentos && anexo.pagamentos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalComprovantesNota({ anexo, numeroNota })}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 border border-blue-200"
                                title="Abrir todos os comprovantes anexados nesta nota"
                              >
                                <FileCheck size={11} />
                                <span>Comprovante PIX ({anexo.pagamentos.length})</span>
                              </button>
                            )}

                            {anexo.tipo === 'imagem' ? (
                              <button
                                type="button"
                                onClick={() => setImagemZoom(anexo.url)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye size={12} />
                                <span>Ampliar</span>
                              </button>
                            ) : (
                              <a
                                href={anexo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                <span>Abrir PDF</span>
                              </a>
                            )}

                            {onAbrirPedido && (
                              <button
                                type="button"
                                onClick={() => {
                                  const pedidoEncontrado = pedidos.find((p) => p.id === anexo.pedido_id);
                                  onAbrirPedido(anexo.pedido_id, pedidoEncontrado);
                                }}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center gap-1 hover:text-stone-900"
                                title="Ver pedido completo de compras"
                              >
                                <span>Ver Pedido #{anexo.pedido_numero}</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
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
          {/* ABA 2: PAGAMENTOS RECEBIDOS                               */}
          {/* ========================================================= */}
          {abaAtiva === 'adiantamentos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span>Pagamentos Recebidos da Estadia</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Comprovantes anexados, valores recebidos e identificação de quem pagou (hóspede ou outra pessoa).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormValor('');
                    setFormObservacao('');
                    setFormMetodo('PIX');
                    setFormQuemPagou('hospede');
                    setFormQuemPagouOutro('');
                    setFormComprovante(null);
                    setErroPagamento(null);
                    setModalReceberPagamentoAberto(true);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <DollarSign size={14} />
                  <span>Receber Pagamento</span>
                </button>
              </div>

              {/* Resumo de Superávits Gerados por Pagamentos em Notas */}
              {totalSuperavitNotas > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-blue-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      Superávit Gerado por Pagamento de Notas ({formatarMoeda(totalSuperavitNotas)})
                    </span>
                    <span className="bg-blue-200/80 text-blue-900 font-black text-[10px] px-2 py-0.5 rounded-full">
                      Crédito em Conta
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Valores pagos pelo cliente acima do valor das notas que foram convertidos em saldo a favor do cliente:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {todasAsNotas
                      .filter((n) => {
                        const vTotal = Number(n.valor_total) || 0;
                        const pagoHospede = (n.pagamentos && n.pagamentos.length > 0)
                          ? n.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
                          : (n.quem_pagou === 'hospede' ? vTotal : (Number(n.valor_pago) || 0));
                        return (pagoHospede - vTotal) > 0.01;
                      })
                      .map((n) => {
                        const num = todasAsNotas.findIndex((item) => item.id === n.id) + 1;
                        const vTotal = Number(n.valor_total) || 0;
                        const pagoHospede = (n.pagamentos && n.pagamentos.length > 0)
                          ? n.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
                          : (n.quem_pagou === 'hospede' ? vTotal : (Number(n.valor_pago) || 0));
                        const sup = pagoHospede - vTotal;
                        return (
                          <div
                            key={n.id}
                            className="bg-white border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-900 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                Nota #{num}
                              </span>
                              <span className="font-bold text-stone-900">{n.fornecedor || 'Fornecedor'}</span>
                              <span className="text-[11px] text-stone-500">
                                (Valor Nota: {formatarMoeda(vTotal)} • Pago: {formatarMoeda(pagoHospede)})
                              </span>
                            </div>
                            <span className="font-mono font-black text-blue-700">
                              + {formatarMoeda(sup)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {adiantamentos.length === 0 ? (
                <div className="text-center py-12 bg-stone-50/70 border border-dashed border-stone-200 rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                    <Wallet size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-stone-700 mb-1">
                    Nenhum pagamento registrado ainda
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                    Quando o hóspede ou outra pessoa efetuar um pagamento (PIX, TED, cartão), clique no botão abaixo para anexar o comprovante e salvar os dados da transação.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormValor('');
                      setFormObservacao('');
                      setFormMetodo('PIX');
                      setFormQuemPagou('hospede');
                      setFormQuemPagouOutro('');
                      setFormComprovante(null);
                      setErroPagamento(null);
                      setModalReceberPagamentoAberto(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <DollarSign size={15} />
                    <span>Receber Primeiro Pagamento</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {adiantamentos.map((item) => {
                    const isDebito = (Number(item.valor) || 0) < 0;
                    const isOutro = item.quem_pagou === 'outra_pessoa';

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all ${
                          isDebito
                            ? 'bg-indigo-50/20 border-indigo-200 hover:border-indigo-300'
                            : 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Miniatura do Comprovante ou Ícone de Débito */}
                          {isDebito ? (
                            <div className="w-16 h-16 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 font-black border border-indigo-200">
                              <Sparkles size={24} />
                            </div>
                          ) : item.comprovante_url ? (
                            item.comprovante_tipo === 'pdf' || item.comprovante_url.startsWith('data:application/pdf') ? (
                              <a
                                href={item.comprovante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 rounded-xl shrink-0 border border-purple-200 bg-purple-50 text-purple-700 flex flex-col items-center justify-center gap-0.5 hover:bg-purple-100 transition-colors shadow-inner cursor-pointer"
                                title="Abrir comprovante em PDF"
                              >
                                <FileText size={20} />
                                <span className="text-[9px] font-black uppercase">PDF</span>
                              </a>
                            ) : (
                              <div
                                onClick={() => setImagemZoom(item.comprovante_url || null)}
                                className="w-16 h-16 rounded-xl shrink-0 border border-stone-200 bg-stone-100 overflow-hidden relative group/img cursor-pointer shadow-inner"
                                title="Clique para ampliar o comprovante"
                              >
                                <img
                                  src={item.comprovante_url}
                                  alt={item.comprovante_nome || 'Comprovante'}
                                  className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-stone-950/20 group-hover/img:bg-stone-950/40 flex items-center justify-center text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                                  <Eye size={16} />
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black border border-emerald-200">
                              <DollarSign size={24} />
                            </div>
                          )}

                          {/* Dados do Pagamento */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-base font-black font-mono ${
                                  isDebito ? 'text-indigo-900' : 'text-emerald-950'
                                }`}
                              >
                                {isDebito
                                  ? `- ${formatarMoeda(Math.abs(item.valor))}`
                                  : formatarMoeda(item.valor)}
                              </span>

                              {/* Badge Quem Pagou ou Débito de Saldo */}
                              {isDebito ? (
                                <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Sparkles size={12} className="text-indigo-600" />
                                  <span>Débito de Saldo Utilizado</span>
                                </span>
                              ) : isOutro ? (
                                <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Users size={12} className="text-purple-700" />
                                  <span>Pago por: <strong>{item.quem_pagou_nome || 'Outra pessoa'}</strong></span>
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <User size={12} className="text-emerald-700" />
                                  <span>Pago pelo Hóspede {item.quem_pagou_nome ? `(${item.quem_pagou_nome})` : (estadiaLocal.titular ? `(${estadiaLocal.titular})` : '')}</span>
                                </span>
                              )}

                              <span className="bg-stone-100 text-stone-700 font-bold text-[11px] px-2 py-0.5 rounded-md border border-stone-200">
                                {item.forma_pagamento || 'PIX'}
                              </span>

                              <span className="text-xs text-stone-500 flex items-center gap-1">
                                <Calendar size={12} className="text-stone-400" />
                                {formatarDataBr(item.data)}
                              </span>
                            </div>

                            {item.observacao && (
                              <p className="text-xs text-stone-600 mt-1 italic">
                                "{item.observacao}"
                              </p>
                            )}

                            <div className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-2 flex-wrap">
                              {item.comprovante_nome && (
                                <>
                                  <span className="text-stone-600 font-medium truncate max-w-[220px]" title={item.comprovante_nome}>
                                    📎 {item.comprovante_nome} {item.comprovante_tamanho ? `(${item.comprovante_tamanho})` : ''}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span>Registrado por: <strong className="text-stone-600">{item.registrado_por_nome || 'Equipe'}</strong></span>
                              {item.registrado_em && (
                                <>
                                  <span>•</span>
                                  <span>{formatarDataHoraBahia(item.registrado_em)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {item.comprovante_url && (
                            item.comprovante_tipo === 'pdf' || item.comprovante_url.startsWith('data:application/pdf') ? (
                              <a
                                href={item.comprovante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <ExternalLink size={12} />
                                <span>Ver PDF</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setImagemZoom(item.comprovante_url || null)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye size={12} />
                                <span>Ampliar</span>
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoverSaldo(item.id, item.valor)}
                            className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Excluir este registro"
                          >
                            <Trash2 size={13} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* RODAPÉ DO MODAL: RESUMO FINAL & FECHAR                    */}
        {/* ========================================================= */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-stone-600">
            <span>Resumo: </span>
            <strong className="text-stone-900">{todasAsNotas.length} nota(s)</strong>
            <span> • </span>
            <strong className="text-stone-900">{adiantamentos.length} transação(ões)</strong>
            <span> • </span>
            <span>Situação: </span>
            {isSuperavit ? (
              <strong className="text-blue-700">Superávit de {formatarMoeda(saldoSituacao)} (Crédito do cliente)</strong>
            ) : isDevendo ? (
              <strong className="text-rose-700">Cliente devendo {formatarMoeda(totalDevendo)}</strong>
            ) : (
              <strong className="text-emerald-700">✓ Quitado (Em dia)</strong>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto print:hidden">
            <button
              type="button"
              onClick={handleImprimir}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Concluído / Fechar
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL / FORMULÁRIO: RECEBER PAGAMENTO                     */}
      {/* ========================================================= */}
      {modalReceberPagamentoAberto && (
        <div className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <DollarSign size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Receber Pagamento
                  </h3>
                  <p className="text-xs text-stone-400">
                    Estadia: <strong className="text-stone-200">{estadiaLocal.casa}</strong> • Titular: <strong className="text-stone-200">{estadiaLocal.titular}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalReceberPagamentoAberto(false);
                  setErroPagamento(null);
                }}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarPagamento} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {erroPagamento && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span className="font-semibold">{erroPagamento}</span>
                </div>
              )}

              {/* 1. ANEXAR COMPROVANTE (OBRIGATÓRIO) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                  <span>Comprovante de Pagamento (Foto ou PDF) *</span>
                  {formComprovante && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Anexado com sucesso
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleArquivoSelecionado}
                  accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
                  className="hidden"
                />

                {!formComprovante ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-2xl p-5 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-emerald-100 text-stone-400 group-hover:text-emerald-700 flex items-center justify-center mx-auto mb-2 transition-colors">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-xs font-bold text-stone-800 group-hover:text-emerald-900 mb-0.5">
                      Clique ou arraste para anexar o comprovante
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Formatos aceitos: JPG, PNG, WEBP ou documento PDF (máx. 15 MB)
                    </p>
                  </div>
                ) : (
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {formComprovante.tipo === 'imagem' ? (
                        <div
                          onClick={() => setImagemZoom(formComprovante.url)}
                          className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-emerald-200 shrink-0 cursor-pointer relative group/thumb"
                          title="Clique para visualizar em tela cheia"
                        >
                          <img
                            src={formComprovante.url}
                            alt={formComprovante.nome}
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-stone-950/20 group-hover/thumb:bg-stone-950/40 flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Eye size={14} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex flex-col items-center justify-center shrink-0">
                          <FileText size={20} />
                          <span className="text-[9px] font-black uppercase">PDF</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate" title={formComprovante.nome}>
                          {formComprovante.nome}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {formComprovante.tamanho} • {formComprovante.tipo === 'pdf' ? 'Documento PDF' : 'Imagem'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {formComprovante.tipo === 'imagem' ? (
                        <button
                          type="button"
                          onClick={() => setImagemZoom(formComprovante.url)}
                          className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-xl text-xs border border-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Ver</span>
                        </button>
                      ) : (
                        <a
                          href={formComprovante.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-purple-700 font-bold rounded-xl text-xs border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          <span>Ver PDF</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-xl text-xs border border-stone-200 transition-colors cursor-pointer"
                        title="Substituir por outro arquivo"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormComprovante(null)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Remover anexo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. QUEM PAGOU? (OBRIGATÓRIO) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Quem Pagou? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormQuemPagou('hospede')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                      formQuemPagou === 'hospede'
                        ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} className={formQuemPagou === 'hospede' ? 'text-purple-600' : 'text-stone-400'} />
                      <span className="text-xs font-bold">Hóspede</span>
                    </div>
                    {formQuemPagou === 'hospede' && (
                      <Check size={16} className="text-purple-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormQuemPagou('outra_pessoa')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                      formQuemPagou === 'outra_pessoa'
                        ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={16} className={formQuemPagou === 'outra_pessoa' ? 'text-purple-600' : 'text-stone-400'} />
                      <span className="text-xs font-bold">Outra pessoa</span>
                    </div>
                    {formQuemPagou === 'outra_pessoa' && (
                      <Check size={16} className="text-purple-600" />
                    )}
                  </button>
                </div>

                {/* Subinfo Hóspede ou Input Outra pessoa */}
                {formQuemPagou === 'hospede' ? (
                  <p className="mt-2 text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex items-center gap-2">
                    <User size={13} className="text-purple-600 shrink-0" />
                    <span>Pagamento efetuado pelo hóspede titular: <strong className="text-stone-800">{estadiaLocal.titular || 'Hóspede Titular'}</strong></span>
                  </p>
                ) : (
                  <div className="mt-3 p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-bold text-purple-950">
                      Quem foi a outra pessoa que pagou? *
                    </label>
                    <input
                      type="text"
                      required
                      value={formQuemPagouOutro}
                      onChange={(e) => setFormQuemPagouOutro(e.target.value)}
                      placeholder="Ex: Fernando, Esposa, Secretária..."
                      className="w-full px-3.5 py-2 text-xs bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-semibold"
                      autoFocus
                    />
                    <p className="text-[11px] text-purple-800 flex items-center gap-1.5 pt-0.5">
                      <span>💡</span>
                      <span>Esta informação será guardada para o acerto e relatório final da estadia.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 3. VALOR QUE FOI PAGO (R$) (OBRIGATÓRIO) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Valor que foi pago (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 text-base font-mono font-black border border-stone-300 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* 4. DATA DO PAGAMENTO & FORMA DE PAGAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formMetodo}
                    onChange={(e) => setFormMetodo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-medium"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência Bancária">Transferência Bancária (TED/DOC)</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro (Espécie)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* 5. OBSERVAÇÃO / DETALHES (OPCIONAL) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Observação / Finalidade (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Adiantamento para peixaria e carnes"
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalReceberPagamentoAberto(false);
                    setErroPagamento(null);
                  }}
                  disabled={salvandoPagamento}
                  className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPagamento}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer tap-bounce"
                >
                  {salvandoPagamento ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registrando Pagamento...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirmar Pagamento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL RECEBER PAGAMENTO DE UMA NOTA ESPECÍFICA            */}
      {/* ========================================================= */}
      {notaParaReceber && (() => {
        const nota = notaParaReceber.anexo;
        const numNota = notaParaReceber.numeroNota;
        const vTotal = Number(nota.valor_total) || 0;
        const jaPago = Math.min(vTotal, Number(nota.valor_pago) || 0);
        const saldoRestante = Math.max(0, vTotal - jaPago);
        const vDigitado = parseFloat(formNotaValor.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const quitaraTotal = vDigitado >= saldoRestante - 0.01;
        const saldoAposEstePagamento = Math.max(0, saldoRestante - vDigitado);

        return (
          <div className="fixed inset-0 z-65 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 space-y-4">
              
              {/* HEADER DO MODAL */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                      <span>Receber Pagamento</span>
                      <span className="text-xs bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                        Nota {numNota}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      {nota.fornecedor || 'Fornecedor'} • Pedido #{nota.pedido_numero}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNotaParaReceber(null);
                    setErroNotaPagamento(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CARD RESUMO DA NOTA */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">Valor da Nota</span>
                  <span className="text-xs font-black text-stone-900 font-mono">{formatarMoeda(vTotal)}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Já Pago</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">{formatarMoeda(jaPago)}</span>
                </div>
                <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Saldo a Pagar</span>
                  <span className="text-xs font-black text-rose-800 font-mono">{formatarMoeda(saldoRestante)}</span>
                </div>
              </div>

              {/* ERRO BANNER */}
              {erroNotaPagamento && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-800 animate-shake">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{erroNotaPagamento}</span>
                </div>
              )}

              {/* FORMULÁRIO */}
              <form onSubmit={handleSalvarPagamentoNota} className="space-y-4">
                
                {/* 1. COMPROVANTE OBRIGATÓRIO */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
                    <span>1. Comprovante de Pagamento * (Foto ou PDF)</span>
                    <span className="text-[10px] text-rose-600 font-black uppercase">Obrigatório</span>
                  </label>

                  <input
                    ref={fileInputNotaRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleArquivoNotaSelecionado}
                  />

                  {!formNotaComprovante ? (
                    <div
                      onClick={() => fileInputNotaRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud size={20} />
                      </div>
                      <p className="text-xs font-bold text-stone-800">
                        Clique para anexar o comprovante do pagamento
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Foto (JPG, PNG) ou PDF do comprovante bancário / recibo
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-300 rounded-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        {formNotaComprovante.tipo === 'imagem' ? (
                          <img
                            src={formNotaComprovante.url}
                            alt="Comprovante"
                            onClick={() => setImagemZoom(formNotaComprovante.url)}
                            className="w-12 h-12 object-cover rounded-xl border border-emerald-300 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            title="Clique para ampliar comprovante"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center border border-purple-300 shrink-0">
                            <FileText size={22} />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-stone-900 truncate" title={formNotaComprovante.nome}>
                            {formNotaComprovante.nome}
                          </p>
                          <p className="text-[11px] text-emerald-800 font-medium">
                            {formNotaComprovante.tamanho} • Comprovante anexado ✓
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {formNotaComprovante.tipo === 'imagem' && (
                          <button
                            type="button"
                            onClick={() => setImagemZoom(formNotaComprovante.url)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputNotaRef.current?.click()}
                          className="px-2.5 py-1 text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Trocar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. QUEM PAGOU (HÓSPEDE OU OUTRO TERCEIRO) */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    2. Quem pagou esta nota? *
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormNotaQuemPagou('hospede')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                        formNotaQuemPagou === 'hospede'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className={formNotaQuemPagou === 'hospede' ? 'text-emerald-600' : 'text-stone-400'} />
                        <span className="text-xs font-bold">Hóspede</span>
                      </div>
                      {formNotaQuemPagou === 'hospede' && (
                        <Check size={16} className="text-emerald-600" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormNotaQuemPagou('outra_pessoa')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                        formNotaQuemPagou === 'outra_pessoa'
                          ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className={formNotaQuemPagou === 'outra_pessoa' ? 'text-purple-600' : 'text-stone-400'} />
                        <span className="text-xs font-bold">Outro terceiro</span>
                      </div>
                      {formNotaQuemPagou === 'outra_pessoa' && (
                        <Check size={16} className="text-purple-600" />
                      )}
                    </button>
                  </div>

                  {/* Detalhe de acordo com quem pagou */}
                  {formNotaQuemPagou === 'hospede' ? (
                    <p className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
                      <User size={13} className="text-emerald-600 shrink-0" />
                      <span>Pago pelo cliente: <strong className="text-emerald-950">{estadiaLocal.titular || 'Hóspede Titular'}</strong>. O valor recebido abaterá da dívida do cliente!</span>
                    </p>
                  ) : (
                    <div className="mt-2 p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1.5 animate-in fade-in">
                      <label className="block text-xs font-bold text-purple-950">
                        Escreva quem realizou o pagamento *
                      </label>
                      <input
                        type="text"
                        required
                        value={formNotaQuemPagouOutro}
                        onChange={(e) => setFormNotaQuemPagouOutro(e.target.value)}
                        placeholder="Ex: Alexandre Pampolini, Concierge, Outro funcionário..."
                        className="w-full px-3.5 py-2 text-xs bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-semibold"
                        autoFocus
                      />
                      <p className="text-[11px] text-purple-800 flex items-center gap-1 pt-0.5">
                        <span>💡</span>
                        <span>A nota continuará pendente de reembolso pelo cliente, com o nome do terceiro atualizado.</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. VALOR RECEBIDO (R$) */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    3. Valor Recebido / Pago nesta Nota (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={formNotaValor}
                      onChange={(e) => setFormNotaValor(e.target.value)}
                      className="w-full pl-11 pr-3 py-2.5 text-base font-mono font-black border border-stone-300 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {/* Feedback dinâmico de quitação vs pagamento parcial vs SUPERÁVIT */}
                  {vDigitado > 0 && formNotaQuemPagou === 'hospede' && (
                    <div className="mt-2">
                      {vDigitado > saldoRestante + 0.001 ? (
                        <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-2xl text-xs text-blue-950 font-bold space-y-1">
                          <div className="flex items-center gap-2 text-blue-900">
                            <Sparkles size={16} className="text-blue-600 shrink-0" />
                            <span className="text-sm font-black">
                              ✓ Quitação Total + Superávit a Favor do Cliente!
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-800 font-medium">
                            A nota será 100% quitada ({formatarMoeda(saldoRestante)}) e o excedente de <strong className="text-blue-950 font-black">{formatarMoeda(vDigitado - saldoRestante)}</strong> ficará como <strong>Superávit / Crédito em Conta</strong> para o cliente abater em novas compras.
                          </p>
                        </div>
                      ) : quitaraTotal ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>✓ Quitação Total da Nota! A nota será marcada como "Pago pelo Hóspede".</span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <span>
                            ⚠️ Pagamento Parcial! Restará <strong>{formatarMoeda(saldoAposEstePagamento)}</strong> pendente de reembolso pelo cliente.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Atalho se o cliente já possui saldo disponível */}
                  {saldoDisponivelCliente > 0.01 && (
                    <div className="mt-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[11px] text-indigo-900 font-semibold flex items-center gap-1.5 min-w-0">
                        <Sparkles size={13} className="text-indigo-600 shrink-0" />
                        <span className="truncate">Cliente possui <strong>{formatarMoeda(saldoDisponivelCliente)}</strong> em saldo disponível.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const alvo = notaParaReceber;
                          setNotaParaReceber(null);
                          handleAbrirModalPagarComSaldo(alvo.anexo, alvo.numeroNota);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                      >
                        Pagar com Saldo
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. DATA & FORMA DE PAGAMENTO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Data do Pagamento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formNotaData}
                      onChange={(e) => setFormNotaData(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={formNotaMetodo}
                      onChange={(e) => setFormNotaMetodo(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-medium"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Transferência Bancária">Transferência Bancária (TED/DOC)</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro (Espécie)</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                {/* 5. OBSERVAÇÃO */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Comprovante enviado via WhatsApp pelo cliente"
                    value={formNotaObservacao}
                    onChange={(e) => setFormNotaObservacao(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>

                {/* FOOTER ACTIONS */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setNotaParaReceber(null);
                      setErroNotaPagamento(null);
                    }}
                    disabled={salvandoNotaPagamento}
                    className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoNotaPagamento}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer tap-bounce"
                  >
                    {salvandoNotaPagamento ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Salvando Pagamento...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Confirmar e Salvar Recebimento</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL COM TODOS OS COMPROVANTES DA NOTA                   */}
      {/* ========================================================= */}
      {modalComprovantesNota && (() => {
        const nota = modalComprovantesNota.anexo;
        const numNota = modalComprovantesNota.numeroNota;
        const pagamentos = nota.pagamentos || [];

        return (
          <div className="fixed inset-0 z-65 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 space-y-4 max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
                    <FileCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                      <span>Comprovantes e Pagamentos</span>
                      <span className="text-xs bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                        Nota {numNota}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      {nota.fornecedor || 'Fornecedor'} • Pedido #{nota.pedido_numero} • Valor: {formatarMoeda(Number(nota.valor_total) || 0)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalComprovantesNota(null)}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                
                {/* 1. Comprovante / Recibo da Compra Original */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Receipt size={14} className="text-stone-500" />
                      Nota Fiscal / Recibo de Compra Original
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {nota.data_comprovante ? formatarDataBr(nota.data_comprovante) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-3 min-w-0">
                      {nota.tipo === 'imagem' ? (
                        <div
                          onClick={() => setImagemZoom(nota.url)}
                          className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group/img shadow-inner"
                          title="Clique para ampliar"
                        >
                          <img
                            src={nota.url}
                            alt={nota.nome}
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-stone-950/20 group-hover/img:bg-stone-950/40 flex items-center justify-center text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <Eye size={16} />
                          </div>
                        </div>
                      ) : (
                        <a
                          href={nota.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-14 h-14 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex flex-col items-center justify-center shrink-0 hover:bg-purple-200 transition-colors"
                        >
                          <FileText size={20} />
                          <span className="text-[9px] font-black uppercase">PDF</span>
                        </a>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate" title={nota.nome}>
                          {nota.nome}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {nota.tamanho} • Anexado por {nota.anexado_por_nome || 'Equipe'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {nota.tipo === 'imagem' ? (
                        <button
                          type="button"
                          onClick={() => setImagemZoom(nota.url)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Ampliar</span>
                        </button>
                      ) : (
                        <a
                          href={nota.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>Abrir PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Lista de Comprovantes de Pagamento Registrados */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span className="flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-600" />
                      Comprovantes de Pagamento Recebidos ({pagamentos.length})
                    </span>
                    <span className="text-[11px] text-emerald-700 font-black">
                      Total Pago: {formatarMoeda(pagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0))}
                    </span>
                  </div>

                  {pagamentos.length === 0 ? (
                    <div className="p-6 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl text-xs text-stone-500">
                      Nenhum comprovante de pagamento adicional registrado nesta nota.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pagamentos.map((pag, idx) => (
                        <div
                          key={pag.id || idx}
                          className="bg-white border border-stone-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Miniatura do comprovante */}
                            {pag.comprovante_url ? (
                              pag.comprovante_tipo === 'pdf' || pag.comprovante_url.startsWith('data:application/pdf') ? (
                                <a
                                  href={pag.comprovante_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-14 h-14 rounded-xl shrink-0 border border-purple-200 bg-purple-50 text-purple-700 flex flex-col items-center justify-center gap-0.5 hover:bg-purple-100 transition-colors shadow-inner"
                                  title="Abrir comprovante em PDF"
                                >
                                  <FileText size={18} />
                                  <span className="text-[9px] font-black uppercase">PDF</span>
                                </a>
                              ) : (
                                <div
                                  onClick={() => setImagemZoom(pag.comprovante_url || null)}
                                  className="w-14 h-14 rounded-xl shrink-0 border border-stone-200 bg-stone-100 overflow-hidden relative group/img cursor-pointer shadow-inner"
                                  title="Clique para ampliar o comprovante"
                                >
                                  <img
                                    src={pag.comprovante_url}
                                    alt={pag.comprovante_nome || 'Comprovante'}
                                    className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-stone-950/20 group-hover/img:bg-stone-950/40 flex items-center justify-center text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <Eye size={14} />
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-black border border-blue-200">
                                <DollarSign size={20} />
                              </div>
                            )}

                            {/* Informações */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs bg-stone-100 text-stone-700 font-bold px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="text-sm font-black text-stone-900 font-mono">
                                  {formatarMoeda(pag.valor)}
                                </span>
                                <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {pag.forma_pagamento || 'PIX'}
                                </span>
                                {pag.data && (
                                  <span className="text-[11px] text-stone-500">
                                    {formatarDataBr(pag.data)}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-xs">
                                <span className="text-stone-600 font-medium">Pago por: </span>
                                <strong className="text-stone-900">
                                  {pag.quem_pagou_nome || (pag.quem_pagou === 'hospede' ? 'Hóspede' : 'Terceiro')}
                                </strong>
                              </div>

                              {pag.observacao && (
                                <p className="text-[11px] text-stone-500 italic mt-0.5">
                                  "{pag.observacao}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {pag.comprovante_url && (
                              pag.comprovante_tipo === 'pdf' || pag.comprovante_url.startsWith('data:application/pdf') ? (
                                <a
                                  href={pag.comprovante_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink size={12} />
                                  <span>Ver PDF</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setImagemZoom(pag.comprovante_url || null)}
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Eye size={12} />
                                  <span>Ampliar</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setModalComprovantesNota(null)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL: PAGAR NOTA COM SALDO DO CLIENTE (SUPERÁVIT)         */}
      {/* ========================================================= */}
      {modalPagarComSaldo && (() => {
        const nota = modalPagarComSaldo.anexo;
        const numNota = modalPagarComSaldo.numeroNota;
        const vTotal = Number(nota.valor_total) || 0;
        const pagoHospede = (nota.pagamentos && nota.pagamentos.length > 0)
          ? nota.pagamentos.filter((p) => p.quem_pagou === 'hospede').reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
          : (nota.quem_pagou === 'hospede' ? vTotal : (Number(nota.valor_pago) || 0));
        const saldoDevedor = Math.max(0, vTotal - pagoHospede);
        const valorDigitado = parseFloat(formValorSaldoDebitar.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const saldoRestanteCliente = Math.max(0, saldoDisponivelCliente - valorDigitado);
        const saldoRestanteNota = Math.max(0, saldoDevedor - valorDigitado);

        return (
          <div className="fixed inset-0 z-65 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 space-y-4">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 border border-indigo-200">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                      <span>Pagar com Saldo em Conta</span>
                      <span className="text-xs bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                        Nota {numNota}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      {nota.fornecedor || 'Fornecedor'} • Pedido #{nota.pedido_numero}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalPagarComSaldo(null)}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Informações de Saldo */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
                  <span className="text-[10px] text-indigo-700 uppercase font-black block">Saldo Disponível Cliente</span>
                  <span className="text-sm font-black text-indigo-950 font-mono">{formatarMoeda(saldoDisponivelCliente)}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <span className="text-[10px] text-rose-700 uppercase font-black block">Pendente nesta Nota</span>
                  <span className="text-sm font-black text-rose-900 font-mono">{formatarMoeda(saldoDevedor)}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-600 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600 shrink-0" />
                <span>
                  O valor será debitado do crédito existente do cliente (<strong className="text-stone-800">{estadiaLocal.titular}</strong>). Não é necessário anexar novo comprovante.
                </span>
              </div>

              <form onSubmit={handleConfirmarPagamentoComSaldo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Valor a Debitar do Saldo (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      value={formValorSaldoDebitar}
                      onChange={(e) => setFormValorSaldoDebitar(e.target.value)}
                      className="w-full pl-11 pr-3 py-2.5 text-base font-mono font-black border border-stone-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Previsão pós débito */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-[11px] space-y-1 text-stone-600">
                  <div className="flex items-center justify-between">
                    <span>Saldo restante do cliente após débito:</span>
                    <strong className="text-indigo-900">{formatarMoeda(saldoRestanteCliente)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Restante a pagar na nota:</span>
                    <strong className={saldoRestanteNota <= 0.01 ? 'text-emerald-700' : 'text-rose-700'}>
                      {saldoRestanteNota <= 0.01 ? '✓ Quitada' : formatarMoeda(saldoRestanteNota)}
                    </strong>
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setModalPagarComSaldo(null)}
                    disabled={salvandoPagamentoSaldo}
                    className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoPagamentoSaldo || valorDigitado <= 0 || valorDigitado > saldoDisponivelCliente + 0.01}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer tap-bounce"
                  >
                    {salvandoPagamentoSaldo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando débito...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Confirmar Pagamento com Saldo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* LIGHTBOX ZOOM DE COMPROVANTE                              */}
      {/* ========================================================= */}
      {imagemZoom && (
        <div
          onClick={() => setImagemZoom(null)}
          className="fixed inset-0 z-70 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
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
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
