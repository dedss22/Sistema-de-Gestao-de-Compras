import React, { useState } from 'react';
import { ItemPedido, FornecedorId } from '../types';
import { FORNECEDORES, LISTA_FORNECEDORES } from '../data/fornecedores';
import { verificarItensEssenciais, AlertaItemEssencial } from '../utils/validation';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Send, 
  PlusCircle, 
  Check, 
  HelpCircle 
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
        className="w-14 text-center text-sm font-black text-stone-900 bg-white border border-stone-400 rounded-lg py-0.5 px-0.5 outline-none ring-2 ring-stone-900"
      />
    );
  }

  return (
    <span
      onClick={() => {
        setVal(String(quantidade));
        setIsEditing(true);
      }}
      title="Clique para digitar o valor"
      className="text-sm font-black min-w-[36px] text-center text-stone-900 cursor-pointer hover:bg-stone-200/60 px-1 py-0.5 rounded-md transition-colors"
    >
      {quantidade}
    </span>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-[#faf7f2] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Topo do Modal */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <span>📋 Revisão da Lista de Compras</span>
            </h2>
            <p className="text-xs text-stone-400">
              Total de {itensList.length} itens selecionados
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-bounce"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Identificação de quem está fazendo o pedido */}
          {cozinheiraNome && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">👩‍🍳</span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    Pedido realizado por:
                  </span>
                  <span className="font-extrabold text-stone-900 text-sm">
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
                  className="px-2.5 py-1 bg-white hover:bg-stone-50 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
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
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm">
                      Atenção: Notamos falta de itens essenciais!
                    </h3>
                    <p className="text-xs text-amber-800">
                      Para uma estadia com {numHospedes} pessoas, recomendamos incluir:
                    </p>
                  </div>
                </div>
                {alertasEssenciais.length > 1 && (
                  <button
                    type="button"
                    onClick={() => alertasEssenciais.forEach((alerta) => onAdicionarEssencialSugerido(alerta))}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0 tap-bounce transition-colors"
                  >
                    Adicionar todos ({alertasEssenciais.length})
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1 max-h-64 overflow-y-auto pr-1">
                {alertasEssenciais.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between bg-white/90 p-2.5 rounded-xl border border-amber-200 text-xs"
                  >
                    <div className="pr-2">
                      <span className="font-bold text-stone-900">{alerta.nome}</span>
                      <p className="text-[11px] text-stone-600 leading-tight">
                        {alerta.motivo}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdicionarEssencialSugerido(alerta)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs tap-bounce shrink-0 ml-2"
                    >
                      <Plus size={14} />
                      <span>+ {alerta.quantidadeSugerida} {alerta.unidade}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista Organizada por Fornecedor */}
          {itensList.length === 0 ? (
            <div className="text-center py-10 text-stone-500">
              <p className="text-base font-bold">Nenhum item adicionado ainda.</p>
              <p className="text-xs mt-1">Toque no botão + dos itens para começar sua lista.</p>
            </div>
          ) : (
            LISTA_FORNECEDORES.map((forn) => {
              const itensDoForn = itensList.filter((i) => i.fornecedor === forn.id);
              if (itensDoForn.length === 0) return null;

              return (
                <div key={forn.id} className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
                  {/* Cabeçalho do Fornecedor */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${forn.corPrimaria}`} />
                      <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
                        {forn.nome}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {itensDoForn.length} {itensDoForn.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Itens do Fornecedor */}
                  <div className="divide-y divide-stone-100">
                    {itensDoForn.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex-1 pr-2">
                          <h4 className="font-bold text-stone-900 text-sm leading-tight">
                            {item.nome}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                              {item.quantidade} {item.unidade}
                            </span>
                            {!item.aceitaSubstituto && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Não aceita substituto
                              </span>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-xs text-amber-900 italic mt-1 bg-amber-50/70 px-2 py-0.5 rounded">
                              Obs: "{item.observacao}"
                            </p>
                          )}
                        </div>

                        {/* Botões de Ajuste Rápido */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const step = (item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro')) ? 0.1 : 1;
                              const nova = Number(Math.max(0, item.quantidade - step).toFixed(2));
                              if (nova === 0) {
                                onRemoverItem(item.id);
                              } else {
                                onUpdateQuantidade(item.id, nova);
                              }
                            }}
                            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center tap-bounce font-bold"
                          >
                            <Minus size={16} />
                          </button>

                          <ReviewItemEditableQty
                            quantidade={item.quantidade}
                            onUpdate={(nova) => onUpdateQuantidade(item.id, nova)}
                            onRemove={() => onRemoverItem(item.id)}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const step = (item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro')) ? 0.1 : 1;
                              const nova = Number((item.quantidade + step).toFixed(2));
                              onUpdateQuantidade(item.id, nova);
                            }}
                            className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center tap-bounce font-bold shadow-xs"
                          >
                            <Plus size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoverItem(item.id)}
                            title="Remover item"
                            className="w-9 h-9 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors ml-1"
                          >
                            <Trash2 size={16} />
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
                className="w-full py-2.5 flex items-center justify-center gap-2 text-stone-800 font-bold text-xs sm:text-sm tap-bounce"
              >
                <PlusCircle size={18} className="text-amber-600" />
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
                    className="text-stone-400 text-xs hover:text-stone-700"
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
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
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
                      className="w-full text-xs p-2 rounded-xl border border-stone-300 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Unidade:
                    </label>
                    <select
                      value={customUnidade}
                      onChange={(e) => setCustomUnidade(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-stone-300 bg-stone-50"
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
                      className="w-full text-xs p-2 rounded-xl border border-stone-300 bg-stone-50 font-semibold"
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
                    className="w-full text-xs p-2 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-stone-900 text-white font-bold text-xs rounded-xl tap-bounce"
                >
                  Salvar este item na lista
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Rodapé com Botão Finalizar Pedido */}
        <div className="p-4 bg-white border-t border-stone-200 space-y-2">
          {showWarningBypass && (
            <div className="p-3 bg-amber-100 rounded-xl text-xs text-amber-950 flex items-center justify-between">
              <span>Tem certeza que deseja enviar sem os itens essenciais alertados?</span>
              <button
                type="button"
                onClick={() => {
                  setShowWarningBypass(false);
                  setShowConfirmacaoFinalizacao(true);
                }}
                className="ml-2 px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg shrink-0 transition-colors"
              >
                Sim, avançar
              </button>
            </div>
          )}

          <button
            onClick={handleTentativaEnvio}
            disabled={itensList.length === 0}
            className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all tap-bounce cursor-pointer ${
              itensList.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-98'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Send size={18} strokeWidth={2.5} />
            <span>Finalizar pedido</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação Obrigatória: "Depois de enviar não será possível alterar este pedido" */}
      {showConfirmacaoFinalizacao && (
        <div className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-stone-900 text-base">
                Finalizar e Enviar Pedido?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                O pedido será registrado em nome de <strong className="text-stone-900">{cozinheiraNome || 'Cozinheira'}</strong> e enviado para aprovação da equipe.
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2 font-medium">
                ⚠️ Depois de enviar, a lista é encaminhada para aprovação e não poderá ser alterada aqui.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmacaoFinalizacao(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors"
              >
                Voltar e revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmacaoFinalizacao(false);
                  onEnviarParaAprovacao();
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl text-xs shadow-md transition-all tap-bounce"
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
