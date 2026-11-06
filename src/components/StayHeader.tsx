import React, { useState } from 'react';
import { Calendar, Users, Home, Edit3, Check } from 'lucide-react';
import { formatarDataBr } from '../utils/whatsapp';

interface StayHeaderProps {
  casaNome: string;
  dataChegada: string;
  dataSaida: string;
  numHospedes: number;
  onUpdateStay: (data: {
    casaNome: string;
    dataChegada: string;
    dataSaida: string;
    numHospedes: number;
  }) => void;
  onOpenAdmin: () => void;
  cozinheiraNome?: string;
  onAlterarCozinheira?: () => void;
  isModoCozinheira?: boolean;
}

export const StayHeader: React.FC<StayHeaderProps> = ({
  casaNome,
  dataChegada,
  dataSaida,
  numHospedes,
  onUpdateStay,
  onOpenAdmin,
  cozinheiraNome,
  onAlterarCozinheira,
  isModoCozinheira = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempCasa, setTempCasa] = useState(casaNome);
  const [tempChegada, setTempChegada] = useState(dataChegada);
  const [tempSaida, setTempSaida] = useState(dataSaida);
  const [tempHospedes, setTempHospedes] = useState(numHospedes);

  const handleSave = () => {
    onUpdateStay({
      casaNome: tempCasa,
      dataChegada: tempChegada,
      dataSaida: tempSaida,
      numHospedes: Math.max(1, tempHospedes)
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-stone-900 text-white px-4 pt-3 pb-4 rounded-b-3xl shadow-md mb-2">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10 text-amber-300">
              <Home size={18} />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block leading-tight">
                Lista de Compras
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                {casaNome}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isModoCozinheira ? (
              cozinheiraNome && (
                <div className="flex items-center gap-1 text-xs text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <span>👩‍🍳 {cozinheiraNome}</span>
                  {onAlterarCozinheira && (
                    <button
                      type="button"
                      onClick={onAlterarCozinheira}
                      className="underline text-[10px] text-amber-200 hover:text-white ml-1 cursor-pointer"
                    >
                      (trocar)
                    </button>
                  )}
                </div>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-semibold flex items-center gap-1 tap-bounce cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>{isEditing ? 'Fechar' : 'Editar Estadia'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAdmin}
                  title="Acesso da Gerência"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-xs tap-bounce cursor-pointer"
                >
                  ⚙️
                </button>
              </>
            )}
          </div>
        </div>

        {/* Resumo da estadia em pílulas */}
        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300 pt-1">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <Calendar size={13} className="text-amber-300" />
              <span>
                Chegada: <strong>{formatarDataBr(dataChegada) || 'A definir'}</strong>
              </span>
            </div>

            {dataSaida && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <span>
                  Saída: <strong>{formatarDataBr(dataSaida)}</strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <Users size={13} className="text-amber-300" />
              <span>
                <strong>{numHospedes}</strong> {numHospedes === 1 ? 'hóspede' : 'hóspedes'}
              </span>
            </div>
          </div>
        ) : (
          /* Formulário de Edição da Estadia */
          <div className="mt-3 bg-stone-800 p-3.5 rounded-2xl border border-stone-700 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                Nome da Casa:
              </label>
              <input
                type="text"
                value={tempCasa}
                onChange={(e) => setTempCasa(e.target.value)}
                className="w-full text-xs p-2 rounded-xl bg-stone-900 border border-stone-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                  Data de Chegada:
                </label>
                <input
                  type="date"
                  value={tempChegada}
                  onChange={(e) => setTempChegada(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-stone-900 border border-stone-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                  Data de Saída:
                </label>
                <input
                  type="date"
                  value={tempSaida}
                  onChange={(e) => setTempSaida(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-stone-900 border border-stone-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                Número de Hóspedes:
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTempHospedes(Math.max(1, tempHospedes - 1))}
                  className="w-10 h-10 rounded-xl bg-stone-700 text-white font-bold text-lg flex items-center justify-center tap-bounce"
                >
                  -
                </button>
                <span className="text-lg font-black min-w-[40px] text-center">
                  {tempHospedes}
                </span>
                <button
                  type="button"
                  onClick={() => setTempHospedes(tempHospedes + 1)}
                  className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 font-bold text-lg flex items-center justify-center tap-bounce"
                >
                  +
                </button>
                <span className="text-xs text-stone-400">pessoas na estadia</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md tap-bounce"
            >
              <Check size={16} strokeWidth={3} />
              <span>Salvar Dados da Estadia</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
