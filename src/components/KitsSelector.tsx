import React from 'react';
import { KITS_PRONTOS } from '../data/kits';
import { KitPronto } from '../types';
import { Coffee, Flame, GlassWater, Smile, Soup, CheckCircle2 } from 'lucide-react';

interface KitsSelectorProps {
  onAplicarKit: (kit: KitPronto) => void;
  numHospedes: number;
  numDias: number;
}

export const KitsSelector: React.FC<KitsSelectorProps> = ({
  onAplicarKit,
  numHospedes,
  numDias
}) => {
  const getIcon = (icone: string) => {
    switch (icone) {
      case 'Coffee':
        return <Coffee size={20} className="text-amber-700" />;
      case 'Flame':
        return <Flame size={20} className="text-rose-700" />;
      case 'Soup':
        return <Soup size={20} className="text-amber-800" />;
      case 'GlassWater':
        return <GlassWater size={20} className="text-emerald-700" />;
      case 'Smile':
        return <Smile size={20} className="text-sky-700" />;
      default:
        return <Coffee size={20} />;
    }
  };

  const getCardBg = (cor: string) => {
    switch (cor) {
      case 'amber':
        return 'bg-amber-50 border-amber-200 hover:border-amber-400';
      case 'rose':
        return 'bg-rose-50 border-rose-200 hover:border-rose-400';
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 hover:border-emerald-400';
      case 'sky':
        return 'bg-sky-50 border-sky-200 hover:border-sky-400';
      default:
        return 'bg-stone-50 border-stone-200';
    }
  };

  return (
    <div className="px-4 py-2 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <span>⚡ Kits Prontos com 1 Toque</span>
        </h2>
        <span className="text-[11px] font-semibold text-stone-500">
          Calculado p/ {numHospedes} hóspedes ({numDias} {numDias === 1 ? 'dia' : 'dias'})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {KITS_PRONTOS.map((kit) => (
          <button
            key={kit.id}
            onClick={() => onAplicarKit(kit)}
            className={`flex flex-col text-left p-3 rounded-2xl border-2 transition-all tap-bounce relative group ${getCardBg(
              kit.cor
            )}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 rounded-xl bg-white shadow-xs">
                {getIcon(kit.icone)}
              </div>
              <span className="text-[10px] font-bold text-stone-600 bg-white/80 px-2 py-0.5 rounded-full border border-stone-200">
                + Adicionar
              </span>
            </div>

            <span className="font-extrabold text-stone-900 text-xs sm:text-sm leading-tight mb-1">
              {kit.titulo}
            </span>
            <span className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
              {kit.descricao}
            </span>

            <div className="mt-2 pt-2 border-t border-stone-200/50 flex items-center justify-between text-[10px] font-semibold text-stone-600">
              <span>{kit.itens.length} itens</span>
              <CheckCircle2 size={12} className="text-stone-400 group-hover:text-stone-800" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
