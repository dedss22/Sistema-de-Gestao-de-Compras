import React from 'react';
import { FornecedorId } from '../types';
import { ArrowRight, ShoppingBag } from 'lucide-react';

interface BottomSummaryBarProps {
  itemCounts: Record<FornecedorId, number>;
  totalItens: number;
  onOpenReview: () => void;
}

export const BottomSummaryBar: React.FC<BottomSummaryBarProps> = ({
  itemCounts,
  totalItens,
  onOpenReview
}) => {
  if (totalItens === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-8px_30px_rgba(28,25,23,0.08)]">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2.5">
        {/* Pílulas de Totais por Aba */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 min-w-0">
          {itemCounts.peixaria > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-100 text-sky-900 text-xs font-bold tabular-nums whitespace-nowrap border border-sky-200/60">
              <span aria-hidden="true">🐟</span> {itemCounts.peixaria}
            </span>
          )}
          {itemCounts.acougue > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 text-red-900 text-xs font-bold tabular-nums whitespace-nowrap border border-red-200/60">
              <span aria-hidden="true">🥩</span> {itemCounts.acougue}
            </span>
          )}
          {itemCounts['frios-laticinios'] > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-bold tabular-nums whitespace-nowrap border border-amber-200/60">
              <span aria-hidden="true">🧀</span> {itemCounts['frios-laticinios']}
            </span>
          )}
          {itemCounts.hortifruti > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold tabular-nums whitespace-nowrap border border-emerald-200/60">
              <span aria-hidden="true">🥑</span> {itemCounts.hortifruti}
            </span>
          )}
          {itemCounts.bebidas > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-100 text-violet-900 text-xs font-bold tabular-nums whitespace-nowrap border border-violet-200/60">
              <span aria-hidden="true">🍷</span> {itemCounts.bebidas}
            </span>
          )}
          {itemCounts.mercado > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-bold tabular-nums whitespace-nowrap border border-amber-200/60">
              <span aria-hidden="true">🛒</span> {itemCounts.mercado}
            </span>
          )}
        </div>

        {/* Botão Gigante Revisar Lista */}
        <button
          type="button"
          onClick={onOpenReview}
          className="flex-1 sm:flex-initial min-h-[48px] flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm sm:text-base py-3 px-5 sm:px-6 rounded-2xl shadow-lg shadow-stone-900/20 active:scale-98 transition-all tap-bounce whitespace-nowrap tabular-nums cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <ShoppingBag size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>Revisar lista ({totalItens})</span>
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
