import React, { useState } from 'react';
import { ItemPedido, FornecedorId } from '../types';
import { LISTA_FORNECEDORES } from '../data/fornecedores';
import { verificarItensEssenciais, AlertaItemEssencial } from '../utils/validation';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Send, 
  PlusCircle,
  ClipboardList
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  itens: Record<string, ItemPedido>;
  numHospedes: number;
  numDias: number;
  isPrimeiroPedido?: boolean;
  cozinheiraNome?: string;
  onAlterarCozinheira?: () => void;
  onUpdateQuantidade: (itemId: string, novaQtd: number) => void;
  onRemoverItem: (itemId: string) => void;
  onAdicionarItemCustom: (item: ItemPedido) => void;
  onAdicionarEssencialSugerido: (alerta: AlertaItemEssencial) => void;
  onEnviarParaAprovacao: () => void;
}

const ReviewItemEditableQty: React.FC<{
  quantidade: number;
  onUpdate: (nova: number) => void;
  onRemove: () => void;
}> = ({ quantidade, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(String(quantidade));

  const commit = () => {
    setIsEditing(false);
    const clean = val.trim().replace(',', '.');
    if (clean === '') return;
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      if (parsed <= 0) onRemove();
      else onUpdate(Number(parsed.toFixed(2)));
    } else {
      setVal(String(quantidade));
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={val}
        aria-label="Editar quantidade"
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setVal(String(quantidade));
            setIsEditing(false);
          }
        }}
        onFocus={(e) => e.target.select()}
        className="w-14 min-h-[44px] text-center text-sm font-black tabular-nums text-stone-900 bg-white border border-stone-400 rounded-xl py-1 px-1 outline-none ring-2 ring-amber-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setVal(String(quantidade));
        setIsEditing(true);
      }}
      title="Clique para digitar o valor"
      aria-label={`Editar quantidade (${quantidade})`}
      className="text-sm font-black tabular-nums min-w-[40px] min-h-[44px] flex items-center justify-center text-stone-900 cursor-pointer hover:bg-stone-200/60 px-1.5 py-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {quantidade}
    </button>
  );
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  itens,
  numHospedes,
  numDias,
  isPrimeiroPedido = true,
  cozinheiraNome,
  onAlterarCozinheira,
  onUpdateQuantidade,
  onRemoverItem,
  onAdicionarItemCustom,
  onAdicionarEssencialSugerido,
  onEnviarParaAprovacao
}) => {
  // Estado para adicionar item que não está na lista
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customNome, setCustomNome] = useState('');
  const [customQtd, setCustomQtd] = useState<number>(1);
  const [customUnidade, setCustomUnidade] = useState('kg');
  const [customFornecedor, setCustomFornecedor] = useState<FornecedorId>('mercado');
  const [customObs, setCustomObs] = useState('');

  // Confirmação com alertas pendentes
  const [showWarningBypass, setShowWarningBypass] = useState(false);
  const [showConfirmacaoFinalizacao, setShowConfirmacaoFinalizacao] = useState(false);

  if (!isOpen) return null;

  const itensList = Object.values(itens).filter((i) => i.quantidade > 0);
  // Alertas de itens essenciais aparecem APENAS no 1º pedido da estadia
  const alertasEssenciais = isPrimeiroPedido ? verificarItensEssenciais(itens, numHospedes, numDias) : [];

  const handleSalvarItemCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNome.trim() || customQtd <= 0) return;

    const novoItem: ItemPedido = {
      id: `custom-${Date.now()}`,
      nome: customNome.trim(),
      fornecedor: customFornecedor,
      unidade: customUnidade,
      quantidade: customQtd,
      observacao: customObs.trim() || undefined,
      aceitaSubstituto: true,
      isCustom: true
    };

    onAdicionarItemCustom(novoItem);
    setCustomNome('');
    setCustomQtd(1);
    setCustomObs('');
    setShowCustomForm(false);
  };

  const handleTentativaEnvio = () => {
    if (alertasEssenciais.length > 0 && !showWarningBypass) {
      setShowWarningBypass(true);
      return;
    }
    setShowConfirmacaoFinalizacao(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/65 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-[#faf7f2] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 border border-stone-200/60">
        {/* Topo do Modal */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between gap-3 border-b border-stone-800">
          <div className="min-w-0">
            <h2 id="review-modal-title" className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <ClipboardList size={20} className="text-amber-400 shrink-0" aria-hidden="true" />
              <span>Revisão da Lista de Compras</span>
            </h2>
            <p className="text-xs text-stone-300 tabular-nums mt-0.5">
              Total de {itensList.length} {itensList.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar revisão da lista"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-bounce cursor-pointer shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Identificação de quem está fazendo o pedido */}
          {cozinheiraNome && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0" aria-hidden="true">👩‍🍳</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 block">
                    Pedido realizado por:
                  </span>
                  <span className="font-extrabold text-stone-900 text-sm truncate block">
                    {cozinheiraNome}
                  </span>
                </div>
              </div>
              {onAlterarCozinheira && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAlterarCozinheira();
                  }}
                  className="min-h-[44px] px-3 py-2 bg-white hover:bg-stone-50 text-amber-950 border border-amber-300 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Trocar nome
                </button>
              )}
            </div>
          )}

          {/* Alerta de Itens Essenciais */}
          {alertasEssenciais.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} aria-hidden="true" />
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm">
                      Atenção: Notamos falta de itens essenciais!
                    </h3>
                    <p className="text-xs text-amber-900 tabular-nums">
                      Para uma estadia com {numHospedes} pessoas, recomendamos incluir:
                    </p>
                  </div>
                </div>
                {alertasEssenciais.length > 1 && (
                  <button
                    type="button"
                    onClick={() => alertasEssenciais.forEach((alerta) => onAdicionarEssencialSugerido(alerta))}
                    className="min-h-[44px] px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shrink-0 tap-bounce transition-colors tabular-nums cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  >
                    Adicionar todos ({alertasEssenciais.length})
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1 max-h-64 overflow-y-auto pr-1">
                {alertasEssenciais.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between bg-white/95 p-2.5 rounded-xl border border-amber-200 text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-stone-900">{alerta.nome}</span>
                      <p className="text-[11px] text-stone-600 leading-tight mt-0.5">
                        {alerta.motivo}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdicionarEssencialSugerido(alerta)}
                      className="min-h-[44px] px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs tap-bounce shrink-0 tabular-nums cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>+ {alerta.quantidadeSugerida} {alerta.unidade}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista Organizada por Fornecedor */}
          {itensList.length === 0 ? (
            <div className="text-center py-10 text-stone-600">
              <p className="text-base font-bold text-stone-800">Nenhum item adicionado ainda.</p>
              <p className="text-xs mt-1">Toque no botão + dos itens para começar sua lista.</p>
            </div>
          ) : (
            LISTA_FORNECEDORES.map((forn) => {
              const itensDoForn = itensList.filter((i) => i.fornecedor === forn.id);
              if (itensDoForn.length === 0) return null;

              return (
                <div key={forn.id} className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
                  {/* Cabeçalho do Fornecedor */}
                  <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${forn.corPrimaria}`} aria-hidden="true" />
                      <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
                        {forn.nome}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {itensDoForn.length} {itensDoForn.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Itens do Fornecedor */}
                  <div className="divide-y divide-stone-100">
                    {itensDoForn.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-bold text-stone-900 text-sm leading-snug">
                            {item.nome}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-semibold tabular-nums text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                              {item.quantidade} {item.unidade}
                            </span>
                            {!item.aceitaSubstituto && (
                              <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Não aceita substituto
                              </span>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-xs text-amber-950 italic mt-1 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60">
                              Obs: "{item.observacao}"
                            </p>
                          )}
                        </div>

                        {/* Botões de Ajuste Rápido */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Diminuir quantidade de ${item.nome}`}
                            onClick={() => {
                              const step = (item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro')) ? 0.1 : 1;
                              const nova = Number(Math.max(0, item.quantidade - step).toFixed(2));
                              if (nova === 0) {
                                onRemoverItem(item.id);
                              } else {
                                onUpdateQuantidade(item.id, nova);
                              }
                            }}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 sm:min-w-[40px] sm:min-h-[40px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center tap-bounce font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            <Minus size={16} aria-hidden="true" />
                          </button>

                          <ReviewItemEditableQty
                            quantidade={item.quantidade}
                            onUpdate={(nova) => onUpdateQuantidade(item.id, nova)}
                            onRemove={() => onRemoverItem(item.id)}
                          />

                          <button
                            type="button"
                            aria-label={`Aumentar quantidade de ${item.nome}`}
                            onClick={() => {
                              const step = (item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro')) ? 0.1 : 1;
                              const nova = Number((item.quantidade + step).toFixed(2));
                              onUpdateQuantidade(item.id, nova);
                            }}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 sm:min-w-[40px] sm:min-h-[40px] rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center tap-bounce font-bold shadow-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            <Plus size={16} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoverItem(item.id)}
                            title="Remover item"
                            aria-label={`Remover ${item.nome} da lista`}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 sm:min-w-[40px] sm:min-h-[40px] rounded-xl text-stone-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Seção "Item que não está na lista" */}
          <div className="bg-white rounded-2xl p-4 border border-dashed border-stone-300">
            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full min-h-[44px] py-2.5 flex items-center justify-center gap-2 text-stone-800 hover:text-stone-950 font-bold text-xs sm:text-sm tap-bounce cursor-pointer rounded-xl hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <PlusCircle size={18} className="text-amber-600 shrink-0" aria-hidden="true" />
                <span>+ Adicionar item que não está no catálogo</span>
              </button>
            ) : (
              <form onSubmit={handleSalvarItemCustom} className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <h4 className="font-extrabold text-stone-900 text-xs uppercase">
                    Adicionar item manualmente
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    aria-label="Cancelar adição de item manual"
                    className="min-h-[44px] px-2 text-stone-600 font-semibold text-xs hover:text-stone-900 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Nome do Item:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Queijo brie especial, carvão ecológico..."
                    value={customNome}
                    onChange={(e) => setCustomNome(e.target.value)}
                    className="w-full min-h-[44px] text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Quantidade:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={customQtd}
                      onChange={(e) => setCustomQtd(parseFloat(e.target.value) || 1)}
                      className="w-full min-h-[44px] text-xs sm:text-sm p-2 rounded-xl border border-stone-300 bg-stone-50 tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Unidade:
                    </label>
                    <select
                      value={customUnidade}
                      onChange={(e) => setCustomUnidade(e.target.value)}
                      className="w-full min-h-[44px] text-xs sm:text-sm p-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="kg">kg</option>
                      <option value="un">un</option>
                      <option value="pacote">pacote</option>
                      <option value="litro">litro</option>
                      <option value="garrafa">garrafa</option>
                      <option value="bandeja">bandeja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Fornecedor:
                    </label>
                    <select
                      value={customFornecedor}
                      onChange={(e) => setCustomFornecedor(e.target.value as FornecedorId)}
                      className="w-full min-h-[44px] text-xs sm:text-sm p-2 rounded-xl border border-stone-300 bg-stone-50 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="mercado">Mercado</option>
                      <option value="bebidas">Bebidas</option>
                      <option value="peixaria">Peixaria</option>
                      <option value="acougue">Açougue</option>
                      <option value="frios-laticinios">Frios & Laticínios</option>
                      <option value="hortifruti">Hortifruti</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Observação opcional:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Marca específica, preferência..."
                    value={customObs}
                    onChange={(e) => setCustomObs(e.target.value)}
                    className="w-full min-h-[44px] text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm rounded-xl tap-bounce cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Salvar este item na lista
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Rodapé com Botão Finalizar Pedido */}
        <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-md border-t border-stone-200 space-y-2.5">
          {showWarningBypass && (
            <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2">
              <span className="font-medium">Tem certeza que deseja enviar sem os itens essenciais alertados?</span>
              <button
                type="button"
                onClick={() => {
                  setShowWarningBypass(false);
                  setShowConfirmacaoFinalizacao(true);
                }}
                className="min-h-[44px] px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Sim, avançar
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleTentativaEnvio}
            disabled={itensList.length === 0}
            className={`w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all tap-bounce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              itensList.length > 0
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/25 active:scale-98 cursor-pointer'
                : 'bg-stone-300 text-stone-600 cursor-not-allowed'
            }`}
          >
            <Send size={18} strokeWidth={2.5} aria-hidden="true" />
            <span>Finalizar pedido</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação Obrigatória: "Depois de enviar não será possível alterar este pedido" */}
      {showConfirmacaoFinalizacao && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
          className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={28} aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h3 id="confirm-send-title" className="font-extrabold text-stone-900 text-base">
                Finalizar e Enviar Pedido?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                O pedido será registrado em nome de <strong className="text-stone-900">{cozinheiraNome || 'Cozinheira'}</strong> e enviado para aprovação da equipe.
              </p>
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/70 rounded-xl p-2.5 font-medium flex items-start gap-1.5 text-left">
                <AlertTriangle size={14} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Depois de enviar, a lista é encaminhada para aprovação e não poderá ser alterada aqui.</span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmacaoFinalizacao(false)}
                className="flex-1 min-h-[48px] py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Voltar e revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmacaoFinalizacao(false);
                  onEnviarParaAprovacao();
                }}
                className="flex-1 min-h-[48px] py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white font-bold rounded-xl text-xs shadow-md transition-all tap-bounce cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Sim, enviar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
