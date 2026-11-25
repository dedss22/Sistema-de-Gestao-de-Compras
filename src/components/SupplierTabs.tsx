import React from 'react';
import { FornecedorId } from '../types';
import { LISTA_FORNECEDORES } from '../data/fornecedores';
import { Fish, Beef, Apple, Wine, ShoppingCart, Sandwich } from 'lucide-react';

interface SupplierTabsProps {
  activeTab: FornecedorId;
  onSelectTab: (id: FornecedorId) => void;
  itemCounts: Record<FornecedorId, number>;
}

export const SupplierTabs: React.FC<SupplierTabsProps> = ({
  activeTab,
  onSelectTab,
  itemCounts
}) => {
  const getIcon = (id: FornecedorId, isActive: boolean) => {
    const size = 20;
    const strokeWidth = isActive ? 2.5 : 2;
    switch (id) {
      case 'peixaria':
        return <Fish size={size} strokeWidth={strokeWidth} />;
      case 'acougue':
        return <Beef size={size} strokeWidth={strokeWidth} />;
      case 'frios-laticinios':
        return <Sandwich size={size} strokeWidth={strokeWidth} />;
      case 'hortifruti':
        return <Apple size={size} strokeWidth={strokeWidth} />;
      case 'bebidas':
        return <Wine size={size} strokeWidth={strokeWidth} />;
      case 'mercado':
        return <ShoppingCart size={size} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-[#faf7f2]/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs py-2">
      <div
        role="tablist"
        aria-label="Fornecedores"
        className="max-w-2xl mx-auto flex sm:grid sm:grid-cols-6 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory px-3 sm:px-4"
      >
        {LISTA_FORNECEDORES.map((forn) => {
          const isActive = activeTab === forn.id;
          const count = itemCounts[forn.id] || 0;
          const isLightActive = forn.id === 'frios-laticinios';

          // Distinct active colors per supplier (WCAG AA compliant contrast)
          const activeStyles: Record<FornecedorId, string> = {
            peixaria: 'bg-sky-700 text-white shadow-md shadow-sky-700/25 ring-2 ring-sky-600/20',
            acougue: 'bg-red-700 text-white shadow-md shadow-red-700/25 ring-2 ring-red-600/20',
            'frios-laticinios': 'bg-amber-400 text-stone-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30',
            hortifruti: 'bg-emerald-700 text-white shadow-md shadow-emerald-700/25 ring-2 ring-emerald-600/20',
            bebidas: 'bg-violet-600 text-white shadow-md shadow-violet-600/25 ring-2 ring-violet-500/20',
            mercado: 'bg-amber-700 text-white shadow-md shadow-amber-700/25 ring-2 ring-amber-600/20'
          };

          const inactiveStyles = 'bg-white/95 text-stone-700 border border-stone-200/90 hover:bg-stone-50 hover:border-stone-300';

          return (
            <button
              key={forn.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${forn.nome}${count > 0 ? `, ${count} ${count === 1 ? 'item selecionado' : 'itens selecionados'}` : ''}`}
              onClick={() => onSelectTab(forn.id)}
              className={`relative shrink-0 snap-start min-w-[76px] sm:min-w-0 min-h-[52px] sm:min-h-[58px] flex flex-col items-center justify-center py-2 px-3 sm:px-1.5 rounded-2xl transition-all duration-200 tap-bounce select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                isActive ? activeStyles[forn.id] : inactiveStyles
              }`}
            >
              <div className="relative flex items-center justify-center">
                {getIcon(forn.id, isActive)}
                {count > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[10px] font-extrabold tabular-nums px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none shadow-sm ${
                      isActive
                        ? isLightActive
                          ? 'bg-stone-950 text-white'
                          : 'bg-white text-stone-900'
                        : 'bg-stone-900 text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight mt-1.5 whitespace-nowrap sm:whitespace-normal leading-tight text-center ${
                  isActive
                    ? isLightActive
                      ? 'text-stone-950'
                      : 'text-white'
                    : 'text-stone-700'
                }`}
              >
                {forn.nome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
