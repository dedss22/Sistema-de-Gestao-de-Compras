import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatarDataHoraBahia } from '../services/gerarPlanilha';
import { CheckCircle2, Plus, Sparkles, ChefHat } from 'lucide-react';

interface PedidoSucessoModalProps {
  numeroPedido: number;
  cozinheiraNome: string;
  casaNome: string;
  finalizadoEm: string;
  totalItens: number;
  onFazerNovoPedido: () => void;
}

export const PedidoSucessoModal: React.FC<PedidoSucessoModalProps> = ({
  numeroPedido,
  cozinheiraNome,
  casaNome,
  finalizadoEm,
  totalItens,
  onFazerNovoPedido
}) => {
  useEffect(() => {
    // Efeito de confetes comemorativos
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignora se indisponível
    }
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pedido-sucesso-title"
      className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 text-center space-y-5 animate-in zoom-in-95 duration-200 my-auto">
        {/* Ícone de Sucesso */}
        <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
          <CheckCircle2 size={44} strokeWidth={2.5} aria-hidden="true" />
        </div>

        {/* Título e Agradecimento */}
        <div className="space-y-1.5">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-900 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5 tabular-nums">
            <Sparkles size={13} aria-hidden="true" />
            Pedido #{numeroPedido} Registrado
          </span>

          <h2 id="pedido-sucesso-title" className="text-2xl font-black text-stone-900 pt-2 leading-tight tabular-nums">
            Pedido {numeroPedido} enviado!
          </h2>

          <p className="text-base font-bold text-amber-800">
            Obrigada, {cozinheiraNome}!
          </p>

          <p className="text-xs text-stone-600 pt-1 leading-relaxed">
            Seu pedido foi recebido e gravado com sucesso no sistema da equipe.
          </p>
        </div>

        {/* Detalhes do Pedido */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs text-stone-700 space-y-2 text-left">
          <div className="flex justify-between items-center gap-2 pb-2 border-b border-stone-200/70">
            <span className="text-stone-600 font-medium">Casa:</span>
            <span className="font-extrabold text-stone-900 text-right">{casaNome}</span>
          </div>

          <div className="flex justify-between items-center gap-2 pb-2 border-b border-stone-200/70">
            <span className="text-stone-600 font-medium">Cozinheira:</span>
            <span className="font-bold text-stone-900 flex items-center gap-1">
              <ChefHat size={14} className="text-amber-700 shrink-0" aria-hidden="true" />
              {cozinheiraNome}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2 pb-2 border-b border-stone-200/70">
            <span className="text-stone-600 font-medium">Total de Itens:</span>
            <span className="font-extrabold text-stone-900 tabular-nums">{totalItens} itens</span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-stone-600 font-medium">Data e Hora (Bahia):</span>
            <span className="font-semibold text-stone-900 tabular-nums text-right">
              {formatarDataHoraBahia(finalizadoEm)}
            </span>
          </div>
        </div>

        {/* Botão Fazer Novo Pedido */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onFazerNovoPedido}
            className="w-full min-h-[52px] py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black rounded-2xl text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all tap-bounce cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <Plus size={20} strokeWidth={2.8} aria-hidden="true" />
            <span>Fazer novo pedido</span>
          </button>
          <p className="text-[11px] text-stone-600 mt-2">
            Abre o cardápio vazio para esta estadia, mantendo seu nome salvo.
          </p>
        </div>
      </div>
    </div>
  );
};
