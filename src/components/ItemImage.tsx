import React, { useState } from 'react';
import { FornecedorId } from '../types';

interface ItemImageProps {
  src: string;
  alt: string;
  fornecedor: FornecedorId;
  itemId?: string;
  fallbackEmoji?: string;
  className?: string;
}

const FORNECEDOR_FALLBACK_ICONS: Record<FornecedorId, string> = {
  peixaria: '🐟',
  acougue: '🥩',
  'frios-laticinios': '🧀',
  hortifruti: '🥑',
  bebidas: '🍷',
  mercado: '🛒'
};

const FORNECEDOR_BG: Record<FornecedorId, string> = {
  peixaria: 'from-sky-50 to-blue-100 text-sky-800',
  acougue: 'from-red-50 to-amber-100 text-red-900',
  'frios-laticinios': 'from-amber-50 to-yellow-100 text-amber-900',
  hortifruti: 'from-emerald-50 to-green-100 text-emerald-900',
  bebidas: 'from-violet-50 to-purple-100 text-violet-900',
  mercado: 'from-amber-50 to-orange-100 text-amber-900'
};

export const ItemImage: React.FC<ItemImageProps> = ({ 
  src, 
  alt, 
  fornecedor, 
  itemId,
  fallbackEmoji,
  className = '' 
}) => {
  const [loadStage, setLoadStage] = useState<'primary' | 'local_svg' | 'fallback'>('primary');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = () => {
    if (loadStage === 'primary' && itemId) {
      setLoadStage('local_svg');
    } else {
      setLoadStage('fallback');
    }
  };

  const rawSrc = loadStage === 'primary' 
    ? src 
    : `/assets/itens/${itemId}.svg`;

  // Evita cache persistente de imagens locais no navegador
  const currentSrc = rawSrc.startsWith('/assets/') && !rawSrc.includes('?') 
    ? `${rawSrc}?v=145` 
    : rawSrc;

  if (loadStage === 'fallback') {
    return (
      <div 
        className={`w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center p-3 bg-gradient-to-br ${FORNECEDOR_BG[fornecedor]} shadow-inner ${className}`}
      >
        <span className="text-4xl mb-1 select-none" role="img" aria-label={alt}>
          {fallbackEmoji || FORNECEDOR_FALLBACK_ICONS[fornecedor]}
        </span>
        <span className="text-[11px] font-bold text-center line-clamp-2 px-1 text-stone-700 leading-tight">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 shadow-sm border border-stone-200/80 relative group ${className}`}>
      {/* Shimmer de carregamento */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center text-stone-300">
          <span className="text-2xl">{fallbackEmoji || FORNECEDOR_FALLBACK_ICONS[fornecedor]}</span>
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        loading="lazy"
        className={`w-full h-full object-cover object-center transition-all duration-300 group-hover:scale-105 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
