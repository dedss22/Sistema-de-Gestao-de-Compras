import React from 'react';
import { KITS_PRONTOS } from '../data/kits';
import { KitPronto } from '../types';
import { Coffee, Flame, GlassWater, Smile, Soup, CheckCircle2, Zap } from 'lucide-react';

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
    <section aria-label="Kits prontos" className="px-4 py-2 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
        <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
          <Zap size={15} className="text-amber-600 shrink-0" aria-hidden="true" />
          <span>Kits Prontos com 1 Toque</span>
        </h2>
        <span className="text-[11px] font-semibold text-stone-600 tabular-nums">
          Calculado p/ {numHospedes} hóspedes ({numDias} {numDias === 1 ? 'dia' : 'dias'})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 items-stretch">
        {KITS_PRONTOS.map((kit) => (
          <button
            key={kit.id}
            type="button"
            onClick={() => onAplicarKit(kit)}
            aria-label={`Aplicar kit ${kit.titulo}, ${kit.itens.length} itens`}
            className={`h-full min-h-[44px] flex flex-col justify-between text-left p-3 rounded-2xl border-2 transition-all tap-bounce relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${getCardBg(
              kit.cor
            )}`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="p-1.5 rounded-xl bg-white shadow-xs shrink-0">
                  {getIcon(kit.icone)}
                </div>
                <span className="text-[11px] font-bold text-stone-700 bg-white/90 px-2 py-0.5 rounded-full border border-stone-200 whitespace-nowrap">
                  + Adicionar
                </span>
              </div>

              <span className="block font-extrabold text-stone-900 text-xs sm:text-sm leading-tight mb-1">
                {kit.titulo}
              </span>
              <span className="block text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                {kit.descricao}
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] font-semibold text-stone-600 tabular-nums">
              <span>{kit.itens.length} itens</span>
              <CheckCircle2 size={13} className="text-stone-500 group-hover:text-stone-900 transition-colors" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
