import React, { useEffect } from 'react';
import { Pedido } from '../types';
import { CheckCircle, Share2, Home, ExternalLink, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { copiarTextoParaClipboard } from '../services/clipboard';

interface ConfirmationScreenProps {
  pedido: Pedido;
  onVoltarParaInicio: () => void;
  onVerComoCliente: (pedidoId: string) => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  pedido,
  onVoltarParaInicio,
  onVerComoCliente
}) => {
  useEffect(() => {
    // Dispara confetes comemorativos
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignora se indisponível
    }
  }, []);

  const totalItens = Object.values(pedido.itens).filter(i => i.quantidade > 0).length;

  const handleCompartilhar = async () => {
    const approvalUrl = `${window.location.origin}?aprovar=${pedido.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Lista de Compras - ${pedido.casa}`,
        text: `Olá! Segue a lista de compras para a estadia em ${pedido.casa}. Por favor aprove ou peça ajustes:`,
        url: approvalUrl
      }).catch(() => {});
    } else {
      const copiou = await copiarTextoParaClipboard(approvalUrl);
      if (copiou) {
        alert('Link de aprovação copiado para a área de transferência!');
      } else {
        window.prompt('Copie o link de aprovação com Ctrl+C:', approvalUrl);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 text-center space-y-5 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle size={44} strokeWidth={2.5} />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Aguardando aprovação
          </span>
          <h2 className="text-2xl font-black text-stone-900 mt-3">
            Lista enviada com sucesso!
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Sua lista para a <strong>{pedido.casa}</strong> foi salva e já está pronta para aprovação dos clientes ou da gerência.
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 text-left border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Casa:</span>
            <strong className="text-stone-900">{pedido.casa}</strong>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Total de itens:</span>
            <strong className="text-stone-900">{totalItens} produtos</strong>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Status atual:</span>
            <strong className="text-amber-700">{pedido.status}</strong>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Data e hora:</span>
            <strong className="text-stone-900">{new Date(pedido.dataAtualizacao).toLocaleString('pt-BR')}</strong>
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => onVerComoCliente(pedido.id)}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md tap-bounce"
          >
            <ExternalLink size={16} />
            <span>Ver página de aprovação do cliente</span>
          </button>

          <button
            onClick={handleCompartilhar}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm tap-bounce"
          >
            <Share2 size={16} />
            <span>Compartilhar link de aprovação</span>
          </button>

          <button
            onClick={onVoltarParaInicio}
            className="w-full py-3 px-4 text-stone-600 hover:text-stone-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao catálogo da casa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
