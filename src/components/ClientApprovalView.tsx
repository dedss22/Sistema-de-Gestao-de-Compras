import React, { useState } from 'react';
import { Pedido } from '../types';
import { LISTA_FORNECEDORES } from '../data/fornecedores';
import { formatarDataBr } from '../utils/whatsapp';
import { updateOrderStatus } from '../services/storage';
import { 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Calendar, 
  Users, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientApprovalViewProps {
  pedido: Pedido;
  onStatusUpdated: (updatedPedido: Pedido) => void;
  onVoltarParaApp: () => void;
}

export const ClientApprovalView: React.FC<ClientApprovalViewProps> = ({
  pedido,
  onStatusUpdated,
  onVoltarParaApp
}) => {
  const [showAjusteInput, setShowAjusteInput] = useState(false);
  const [observacaoAjuste, setObservacaoAjuste] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const itensList = Object.values(pedido.itens).filter(i => i.quantidade > 0);

  const handleAprovar = async () => {
    setIsSubmitting(true);
    try {
      const atualizado = await updateOrderStatus(pedido.id, 'Aprovada');
      if (atualizado) {
        onStatusUpdated(atualizado);
        setMensagemSucesso('Lista de compras aprovada com sucesso! A equipe da casa já foi notificada.');
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSolicitarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observacaoAjuste.trim()) return;

    setIsSubmitting(true);
    try {
      const atualizado = await updateOrderStatus(
        pedido.id, 
        'Correção solicitada', 
        observacaoAjuste.trim()
      );
      if (atualizado) {
        onStatusUpdated(atualizado);
        setMensagemSucesso('Seu pedido de ajuste foi enviado para a cozinheira e equipe da casa!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cores de status
  const getStatusBadge = () => {
    switch (pedido.status) {
      case 'Aprovada':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Correção solicitada':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'Enviada aos fornecedores':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-amber-100 text-amber-900 border-amber-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-16">
      {/* Header Hóspede */}
      <div className="bg-stone-900 text-white p-5 rounded-b-3xl shadow-md">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onVoltarParaApp}
              className="text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl tap-bounce"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao App</span>
            </button>

            <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getStatusBadge()}`}>
              {pedido.status}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold block">
              Aprovação de Compras
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {pedido.casa}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300 pt-1">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <Calendar size={13} className="text-amber-300" />
              <span>Chegada: {formatarDataBr(pedido.dataChegada) || 'A definir'}</span>
            </div>
            {pedido.dataSaida && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <span>Saída: {formatarDataBr(pedido.dataSaida)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <Users size={13} className="text-amber-300" />
              <span>{pedido.numHospedes} hóspedes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-xl mx-auto p-4 space-y-5 mt-2">
        {mensagemSucesso && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-bold text-sm">Status Atualizado!</strong>
              {mensagemSucesso}
            </div>
          </div>
        )}

        {pedido.observacaoAprovacao && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1">
            <span className="font-bold text-amber-950 flex items-center gap-1">
              <AlertCircle size={14} /> Observação de ajuste registrada:
            </span>
            <p className="text-amber-900 italic font-medium">
              "{pedido.observacaoAprovacao}"
            </p>
          </div>
        )}

        {/* Itens Organizados por Fornecedor (somente leitura) */}
        <div className="space-y-4">
          {LISTA_FORNECEDORES.map((forn) => {
            const itensDoForn = itensList.filter(i => i.fornecedor === forn.id);
            if (itensDoForn.length === 0) return null;

            return (
              <div key={forn.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${forn.corPrimaria}`} />
                    <h3 className="font-black text-stone-900 text-sm uppercase">
                      {forn.nome}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-stone-500">
                    {itensDoForn.length} itens
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {itensDoForn.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-stone-900 text-sm block">
                          {item.nome}
                        </span>
                        {item.observacao && (
                          <span className="text-stone-500 italic block mt-0.5">
                            Obs: {item.observacao}
                          </span>
                        )}
                        {!item.aceitaSubstituto && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block mt-1">
                            Sem substituto
                          </span>
                        )}
                      </div>

                      <div className="font-black text-sm text-stone-900 bg-stone-100 px-2.5 py-1 rounded-xl shrink-0">
                        {item.quantidade} {item.unidade}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Painel de Ações do Cliente */}
        {pedido.status !== 'Aprovada' && (
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-md space-y-4">
            <div className="text-center">
              <h3 className="font-black text-stone-900 text-base">
                Esta lista está de acordo com a sua estadia?
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Você pode aprovar imediatamente ou solicitar ajustes à cozinheira da casa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAprovar}
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 tap-bounce"
              >
                <ShieldCheck size={20} strokeWidth={2.5} />
                <span>Aprovar Lista</span>
              </button>

              <button
                onClick={() => setShowAjusteInput(!showAjusteInput)}
                className="w-full py-4 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-black text-sm rounded-2xl flex items-center justify-center gap-2 border border-stone-300 tap-bounce"
              >
                <MessageSquare size={18} />
                <span>{showAjusteInput ? 'Fechar Ajuste' : 'Pedir Ajuste'}</span>
              </button>
            </div>

            {showAjusteInput && (
              <form onSubmit={handleSolicitarAjuste} className="space-y-3 pt-3 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-800">
                  O que você gostaria de alterar ou acrescentar?
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Por favor incluir mais água com gás e trocar a picanha por fraldinha..."
                  value={observacaoAjuste}
                  onChange={(e) => setObservacaoAjuste(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !observacaoAjuste.trim()}
                  className="w-full py-3 bg-stone-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 tap-bounce"
                >
                  <Send size={15} />
                  <span>Enviar Ajuste para a Casa</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
