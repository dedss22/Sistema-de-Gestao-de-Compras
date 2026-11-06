import { FornecedorId, FornecedorInfo } from '../types';

export const FORNECEDORES: Record<FornecedorId, FornecedorInfo> = {
  peixaria: {
    id: 'peixaria',
    nome: 'Peixaria',
    subtitulo: 'Frutos do mar e peixes frescos',
    icone: 'Fish',
    corPrimaria: 'bg-sky-600',
    corClara: 'bg-sky-50 text-sky-800 border-sky-200',
    corBorda: 'border-sky-500',
    corTexto: 'text-sky-700'
  },
  acougue: {
    id: 'acougue',
    nome: 'Açougue',
    subtitulo: 'Cortes nobres e churrasco',
    icone: 'Beef',
    corPrimaria: 'bg-red-700',
    corClara: 'bg-red-50 text-red-900 border-red-200',
    corBorda: 'border-red-600',
    corTexto: 'text-red-700'
  },
  'frios-laticinios': {
    id: 'frios-laticinios',
    nome: 'Frios & Laticínios',
    subtitulo: 'Queijos nobres, frios fatiados e laticínios',
    icone: 'Sandwich',
    corPrimaria: 'bg-amber-500',
    corClara: 'bg-amber-50 text-amber-900 border-amber-200',
    corBorda: 'border-amber-500',
    corTexto: 'text-amber-700'
  },
  hortifruti: {
    id: 'hortifruti',
    nome: 'Hortifruti',
    subtitulo: 'Frutas tropicais e legumes frescos',
    icone: 'Apple',
    corPrimaria: 'bg-emerald-600',
    corClara: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    corBorda: 'border-emerald-600',
    corTexto: 'text-emerald-700'
  },
  bebidas: {
    id: 'bebidas',
    nome: 'Bebidas',
    subtitulo: 'Águas, refrigerantes, cervejas, drinks e gelo',
    icone: 'Wine',
    corPrimaria: 'bg-violet-600',
    corClara: 'bg-violet-50 text-violet-900 border-violet-200',
    corBorda: 'border-violet-600',
    corTexto: 'text-violet-700'
  },
  mercado: {
    id: 'mercado',
    nome: 'Mercado',
    subtitulo: 'Despensa, laticínios, café, carvão e limpeza',
    icone: 'ShoppingCart',
    corPrimaria: 'bg-amber-600',
    corClara: 'bg-amber-50 text-amber-900 border-amber-200',
    corBorda: 'border-amber-600',
    corTexto: 'text-amber-700'
  }
};

export const LISTA_FORNECEDORES = [
  FORNECEDORES.peixaria,
  FORNECEDORES.acougue,
  FORNECEDORES['frios-laticinios'],
  FORNECEDORES.hortifruti,
  FORNECEDORES.bebidas,
  FORNECEDORES.mercado
];
