import React, { useState } from 'react';
import { formatarDataBr } from '../services/gerarPlanilha';
import { Home, Calendar, Users, ChefHat, ArrowRight, User, X } from 'lucide-react';

interface CozinheiraBoasVindasModalProps {
  casa: string;
  entrada: string;
  saida: string;
  hospedes: number;
  nomeInicial?: string;
  onConfirmar: (nome: string) => void;
}

export const CozinheiraBoasVindasModal: React.FC<CozinheiraBoasVindasModalProps> = ({
  casa,
  entrada,
  saida,
  hospedes,
  nomeInicial = '',
  onConfirmar
}) => {
  const [nome, setNome] = useState(nomeInicial);
  const [prevNomeInicial, setPrevNomeInicial] = useState(nomeInicial);
  const [erro, setErro] = useState<string | null>(null);

  if (nomeInicial !== prevNomeInicial) {
    setPrevNomeInicial(nomeInicial);
    if (nomeInicial && !nome) {
      setNome(nomeInicial);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) {
      setErro('Por favor, informe quem está fazendo o pedido.');
      return;
    }
    onConfirmar(nomeLimpo);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boas-vindas-title"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in zoom-in-95 duration-200 my-auto">
        {/* Ícone e Saudação */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
            <ChefHat size={34} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Novo Pedido de Compras
          </span>
          <h2 id="boas-vindas-title" className="text-2xl font-black text-stone-900 leading-tight">
            Quem está fazendo o pedido?
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Identifique-se para que a equipe saiba quem enviou a lista de compras para aprovação.
          </p>
        </div>

        {/* Resumo da Estadia (Travado) */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5 text-xs">
          <span className="font-bold text-[11px] text-stone-600 uppercase tracking-wider block">
            Resumo da Hospedagem
          </span>

          <div className="flex items-center gap-2.5 text-stone-800">
            <Home size={16} className="text-amber-700 shrink-0" aria-hidden="true" />
            <span className="font-bold text-sm text-stone-900">{casa}</span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 tabular-nums">
            <Calendar size={16} className="text-amber-700 shrink-0" aria-hidden="true" />
            <span>
              <strong>Período:</strong> {formatarDataBr(entrada)} até {formatarDataBr(saida)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 tabular-nums">
            <Users size={16} className="text-amber-700 shrink-0" aria-hidden="true" />
            <span>
              <strong>Hóspedes:</strong> {hospedes} pessoa{hospedes !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Formulário com Campo Obrigatório "Seu nome" */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cozinheira-nome-input" className="block text-xs font-extrabold text-stone-800">
                Seu nome *
              </label>
              {nome && (
                <button
                  type="button"
                  onClick={() => setNome('')}
                  aria-label="Limpar campo de nome"
                  className="min-h-[36px] px-2 text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer rounded-lg hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <X size={13} aria-hidden="true" />
                  <span>Limpar campo</span>
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <User size={18} aria-hidden="true" />
              </div>
              <input
                id="cozinheira-nome-input"
                type="text"
                required
                autoFocus
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (erro) setErro(null);
                }}
                placeholder="Ex: Fernanda, Maria, Carlos..."
                className="w-full min-h-[50px] pl-10 pr-4 py-3 rounded-2xl border-2 border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden text-base font-semibold text-stone-900 placeholder:text-stone-400 shadow-inner"
              />
            </div>

            {erro && (
              <p role="alert" className="text-xs text-red-700 font-bold mt-1.5 animate-in fade-in">
                {erro}
              </p>
            )}

            <p className="text-[11px] text-stone-600 mt-1.5">
              💡 Este nome ficará registrado no pedido, nos avisos da equipe e na planilha final.
            </p>
          </div>

          <button
            type="submit"
            className="w-full min-h-[52px] py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black rounded-2xl text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all tap-bounce cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <span>Iniciar Novo Pedido</span>
            <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};
