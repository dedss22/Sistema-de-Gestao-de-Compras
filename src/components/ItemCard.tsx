import React, { useState } from 'react';
import { ItemCatalogo, ItemPedido } from '../types';
import { ItemImage } from './ItemImage';
import { Plus, Minus, Check, MessageSquare, Sparkles, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface ItemCardProps {
  item: ItemCatalogo;
  itemPedido?: ItemPedido;
  onUpdateQuantidade: (item: ItemCatalogo, novaQtd: number) => void;
  onUpdateOpcoes: (itemId: string, observacao: string, aceitaSubstituto: boolean) => void;
  sugestaoQtd?: number;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  itemPedido,
  onUpdateQuantidade,
  onUpdateOpcoes,
  sugestaoQtd
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const quantidade = itemPedido?.quantidade || 0;
  const isSelected = quantidade > 0;
  const isDecimal = item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro');
  const step = isDecimal ? 0.1 : 1;

  const handleIncrement = () => {
    const proxima = Number((quantidade + step).toFixed(2));
    onUpdateQuantidade(item, proxima);
  };

  const handleDecrement = () => {
    if (quantidade <= 0) return;
    const proxima = Number(Math.max(0, quantidade - step).toFixed(2));
    onUpdateQuantidade(item, proxima);
  };

  const handleStartEdit = () => {
    setInputValue(quantidade > 0 ? String(quantidade) : '');
    setIsEditing(true);
  };

  const handleCommitEdit = () => {
    setIsEditing(false);
    const cleanStr = inputValue.trim().replace(',', '.');
    if (cleanStr === '') {
      return;
    }
    const parsed = parseFloat(cleanStr);
    if (!isNaN(parsed) && parsed >= 0) {
      const finalVal = Number(parsed.toFixed(2));
      onUpdateQuantidade(item, finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleAplicarSugestao = () => {
    if (sugestaoQtd && sugestaoQtd > 0) {
      onUpdateQuantidade(item, sugestaoQtd);
    }
  };

  return (
    <article
      className={`relative h-full flex flex-col justify-between bg-white rounded-3xl p-2.5 sm:p-3.5 transition-all duration-200 border-2 ${
        isSelected
          ? 'border-stone-900 shadow-lg shadow-stone-900/10 ring-2 ring-amber-400/40 bg-gradient-to-b from-white to-amber-50/25'
          : 'border-stone-200/90 shadow-xs hover:border-stone-300 hover:shadow-sm'
      }`}
    >
      {/* Imagem Ilustrativa Grande */}
      <div className="relative mb-2.5">
        <ItemImage
          src={item.imagem}
          alt={item.nome}
          fornecedor={item.fornecedor}
          itemId={item.id}
          fallbackEmoji={item.emoji}
          className="rounded-2xl"
        />

        {item.favorito && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-400 text-stone-950 text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm border border-amber-500/30">
            <Star size={11} className="fill-stone-950 text-stone-950 shrink-0" aria-hidden="true" />
            <span>Mais Pedido</span>
          </span>
        )}

        {isSelected && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 bg-stone-900 text-white p-1.5 rounded-full shadow-md ring-2 ring-white"
          >
            <Check size={13} strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Título e Unidade */}
      <div className="flex-1 mb-3 min-w-0">
        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug mb-1">
          {item.nome}
        </h3>
        {item.descricaoBreve && (
          <p className="text-xs text-stone-600 line-clamp-2 mb-2 leading-relaxed font-normal">
            {item.descricaoBreve}
          </p>
        )}
        <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/70 text-stone-700 text-[11px] font-semibold">
          Unidade: {item.unidade}
        </div>
      </div>

      <div>
        {/* Sugestão Rápida para o período (se não tiver selecionado) */}
        {!isSelected && sugestaoQtd && sugestaoQtd > 0 && (
          <button
            type="button"
            onClick={handleAplicarSugestao}
            className="mb-2.5 w-full min-h-[44px] py-1.5 px-2 bg-amber-50 hover:bg-amber-100/80 text-amber-950 rounded-xl text-[11px] sm:text-xs font-medium border border-amber-200 flex items-center justify-center gap-1.5 tap-bounce cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Sparkles size={13} className="text-amber-600 shrink-0" aria-hidden="true" />
            <span className="tabular-nums leading-tight">
              Sugerido: <strong>{sugestaoQtd} {item.unidade}</strong>
            </span>
          </button>
        )}

        {/* Controle de Quantidade - Alvos confortáveis >= 44px no mobile */}
        <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-1 border border-stone-200">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantidade <= 0}
            aria-label={`Diminuir quantidade de ${item.nome}`}
            className={`shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all tap-bounce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              quantidade > 0
                ? 'bg-white text-stone-900 shadow-sm border border-stone-300 active:bg-stone-100 cursor-pointer'
                : 'text-stone-300 cursor-not-allowed bg-transparent'
            }`}
          >
            <Minus size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>

          <div className="flex-1 min-w-0 flex items-center justify-center">
            {isEditing ? (
              <div className="flex flex-col items-center justify-center px-1 py-0.5 w-full bg-white rounded-xl ring-2 ring-amber-500 shadow-xs">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={inputValue}
                  placeholder={String(quantidade)}
                  aria-label={`Quantidade de ${item.nome}`}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleCommitEdit}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => e.target.select()}
                  className="w-full max-w-[64px] text-center text-lg sm:text-xl font-black tabular-nums text-stone-950 bg-transparent outline-none p-0 m-0 border-b-2 border-stone-800"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 select-none truncate max-w-full">
                  {item.unidade}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Clique para digitar o valor"
                aria-label={`Editar quantidade de ${item.nome}, atual ${quantidade} ${item.unidade}`}
                className="w-full min-h-[44px] flex flex-col items-center justify-center px-1 py-0.5 cursor-pointer rounded-xl transition-colors hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span className={`text-lg sm:text-xl font-black tabular-nums leading-none ${quantidade > 0 ? 'text-stone-950' : 'text-stone-500'}`}>
                  {quantidade}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 select-none truncate max-w-full mt-0.5">
                  {item.unidade}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            aria-label={`Aumentar quantidade de ${item.nome}`}
            className="shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shadow-md active:bg-stone-800 transition-all tap-bounce cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
          >
            <Plus size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>

        {/* Opções extras (Observação e Substituto) ao adicionar */}
        {isSelected && (
          <div className="mt-2.5 pt-2.5 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              aria-expanded={showOptions}
              className="w-full min-h-[44px] text-xs font-bold text-stone-700 flex items-center justify-between gap-1.5 py-2 px-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <MessageSquare size={14} className="shrink-0 text-stone-500" aria-hidden="true" />
                <span className="truncate whitespace-nowrap">
                  {itemPedido?.observacao ? 'Obs. adicionada' : 'Observação'}
                </span>
              </span>
              {showOptions ? (
                <ChevronUp size={15} className="shrink-0 text-stone-500" aria-hidden="true" />
              ) : (
                <ChevronDown size={15} className="shrink-0 text-stone-500" aria-hidden="true" />
              )}
            </button>

            {showOptions && (
              <div className="mt-2 space-y-2.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Observação para o fornecedor:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: bem maduro, em postas grossas..."
                    value={itemPedido?.observacao || ''}
                    onChange={(e) =>
                      onUpdateOpcoes(item.id, e.target.value, itemPedido?.aceitaSubstituto ?? true)
                    }
                    className="w-full min-h-[40px] text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Interruptor Aceita Substituto */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-semibold text-stone-700">
                    Aceita similar se faltar?
                  </span>
                  <button
                    type="button"
                    aria-pressed={itemPedido?.aceitaSubstituto ?? true}
                    onClick={() =>
                      onUpdateOpcoes(
                        item.id,
                        itemPedido?.observacao || '',
                        !(itemPedido?.aceitaSubstituto ?? true)
                      )
                    }
                    className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      (itemPedido?.aceitaSubstituto ?? true)
                        ? 'bg-emerald-700 text-white'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {(itemPedido?.aceitaSubstituto ?? true) ? 'Sim, aceito' : 'Não, só este'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
