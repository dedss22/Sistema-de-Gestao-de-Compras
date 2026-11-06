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
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-xl">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        {/* Pílulas de Totais por Aba */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {itemCounts.peixaria > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold whitespace-nowrap">
              <span>🐟</span> {itemCounts.peixaria}
            </span>
          )}
          {itemCounts.acougue > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 text-red-900 text-xs font-bold whitespace-nowrap">
              <span>🥩</span> {itemCounts.acougue}
            </span>
          )}
          {itemCounts['frios-laticinios'] > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold whitespace-nowrap">
              <span>🧀</span> {itemCounts['frios-laticinios']}
            </span>
          )}
          {itemCounts.hortifruti > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold whitespace-nowrap">
              <span>🥑</span> {itemCounts.hortifruti}
            </span>
          )}
          {itemCounts.bebidas > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-100 text-violet-900 text-xs font-bold whitespace-nowrap">
              <span>🍷</span> {itemCounts.bebidas}
            </span>
          )}
          {itemCounts.mercado > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold whitespace-nowrap">
              <span>🛒</span> {itemCounts.mercado}
            </span>
          )}
        </div>

        {/* Botão Gigante Revisar Lista */}
        <button
          onClick={onOpenReview}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-stone-900/20 active:scale-98 transition-all tap-bounce whitespace-nowrap"
        >
          <ShoppingBag size={18} strokeWidth={2.5} />
          <span>Revisar lista ({totalItens})</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
