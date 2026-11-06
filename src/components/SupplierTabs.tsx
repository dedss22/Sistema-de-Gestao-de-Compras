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
    <div className="sticky top-0 z-30 bg-[#faf7f2]/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs px-1 sm:px-2 pt-2 pb-1.5">
      <div className="max-w-xl mx-auto grid grid-cols-6 gap-1 sm:gap-1.5">
        {LISTA_FORNECEDORES.map((forn) => {
          const isActive = activeTab === forn.id;
          const count = itemCounts[forn.id] || 0;

          // Distinct active colors per supplier
          const activeStyles: Record<FornecedorId, string> = {
            peixaria: 'bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-500/20',
            acougue: 'bg-red-700 text-white shadow-md shadow-red-700/25 ring-2 ring-red-600/20',
            'frios-laticinios': 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/20',
            hortifruti: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20',
            bebidas: 'bg-violet-600 text-white shadow-md shadow-violet-600/25 ring-2 ring-violet-500/20',
            mercado: 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
          };

          const inactiveStyles = 'bg-white/90 text-stone-600 border border-stone-200/90 hover:bg-stone-50';

          return (
            <button
              key={forn.id}
              onClick={() => onSelectTab(forn.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-0.5 sm:py-2.5 sm:px-1 rounded-2xl transition-all duration-200 tap-bounce select-none ${
                isActive ? activeStyles[forn.id] : inactiveStyles
              }`}
            >
              <div className="relative flex items-center justify-center">
                {getIcon(forn.id, isActive)}
                {count > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[10px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full leading-none shadow-sm ${
                      isActive
                        ? 'bg-white text-stone-900'
                        : 'bg-stone-900 text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-tight mt-1 truncate max-w-full ${isActive ? 'text-white' : 'text-stone-700'}`}>
                {forn.nome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
