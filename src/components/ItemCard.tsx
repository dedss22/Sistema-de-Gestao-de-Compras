import React, { useState } from 'react';
import { ItemCatalogo, ItemPedido } from '../types';
import { ItemImage } from './ItemImage';
import { Plus, Minus, Check, MessageSquare, Sparkles } from 'lucide-react';

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
    <div
      className={`relative flex flex-col justify-between bg-white rounded-3xl p-3.5 transition-all duration-200 border-2 shadow-xs ${
        isSelected
          ? 'border-stone-800 shadow-md ring-1 ring-stone-900/10'
          : 'border-stone-200/90 hover:border-stone-300'
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
          <span className="absolute top-2 left-2 bg-amber-500 text-stone-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            Mais Pedido ⭐
          </span>
        )}

        {isSelected && (
          <span className="absolute top-2 right-2 bg-stone-900 text-white p-1 rounded-full shadow-sm">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Título e Unidade */}
      <div className="flex-1 mb-3">
        <h3 className="font-extrabold text-stone-900 text-base sm:text-lg leading-tight mb-1">
          {item.nome}
        </h3>
        {item.descricaoBreve && (
          <p className="text-xs text-stone-500 line-clamp-2 mb-1.5 font-normal">
            {item.descricaoBreve}
          </p>
        )}
        <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold">
          Unidade: {item.unidade}
        </div>
      </div>

      {/* Sugestão Rápida para o período (se não tiver selecionado) */}
      {!isSelected && sugestaoQtd && sugestaoQtd > 0 && (
        <button
          onClick={handleAplicarSugestao}
          className="mb-3 w-full py-1.5 px-2 bg-amber-50 text-amber-900 rounded-xl text-xs font-medium border border-amber-200 flex items-center justify-center gap-1.5 tap-bounce"
        >
          <Sparkles size={13} className="text-amber-600" />
          <span>Sugerido p/ estadia: <strong>{sugestaoQtd} {item.unidade}</strong></span>
        </button>
      )}

      {/* Controle de Quantidade - BOTÕES GIGANTES */}
      <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-1.5 border border-stone-200">
        <button
          onClick={handleDecrement}
          disabled={quantidade <= 0}
          aria-label="Diminuir quantidade"
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all tap-bounce ${
            quantidade > 0
              ? 'bg-white text-stone-900 shadow-sm border border-stone-300 active:bg-stone-100'
              : 'text-stone-300 cursor-not-allowed bg-transparent'
          }`}
        >
          <Minus size={24} strokeWidth={2.8} />
        </button>

        <div
          onClick={!isEditing ? handleStartEdit : undefined}
          title="Clique para digitar o valor"
          className={`flex flex-col items-center justify-center px-2 min-w-[76px] cursor-pointer rounded-xl transition-all py-1 ${
            isEditing 
              ? 'bg-white ring-2 ring-stone-900 shadow-sm' 
              : 'hover:bg-stone-200/60'
          }`}
        >
          {isEditing ? (
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={inputValue}
              placeholder={String(quantidade)}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.target.select()}
              className="w-20 text-center text-xl sm:text-2xl font-black text-stone-950 bg-transparent outline-none p-0 m-0 border-b-2 border-stone-800"
            />
          ) : (
            <span className={`text-xl sm:text-2xl font-black ${quantidade > 0 ? 'text-stone-950' : 'text-stone-400'}`}>
              {quantidade}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 select-none">
            {item.unidade}
          </span>
        </div>

        <button
          onClick={handleIncrement}
          aria-label="Aumentar quantidade"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-md active:bg-stone-800 transition-all tap-bounce"
        >
          <Plus size={24} strokeWidth={2.8} />
        </button>
      </div>

      {/* Opções extras (Observação e Substituto) ao adicionar */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="w-full text-xs font-bold text-stone-600 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare size={13} />
              {itemPedido?.observacao ? 'Observação adicionada ✍️' : 'Adicionar observação'}
            </span>
            <span className="text-stone-400">{showOptions ? '▲ Fechar' : '▼ Ajustar'}</span>
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
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Interruptor Aceita Substituto */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-stone-700">
                  Aceita similar se faltar?
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOpcoes(
                      item.id,
                      itemPedido?.observacao || '',
                      !(itemPedido?.aceitaSubstituto ?? true)
                    )
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                    (itemPedido?.aceitaSubstituto ?? true)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
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
  );
};
