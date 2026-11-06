export type FornecedorId = 'peixaria' | 'acougue' | 'frios-laticinios' | 'hortifruti' | 'bebidas' | 'mercado';

export interface FornecedorInfo {
  id: FornecedorId;
  nome: string;
  subtitulo: string;
  icone: string;
  corPrimaria: string;
  corClara: string;
  corBorda: string;
  corTexto: string;
}

export interface ItemCatalogo {
  id: string;
  nome: string;
  fornecedor: FornecedorId;
  subcategoria: string;
  unidade: 'kg' | 'un' | 'pacote' | 'litro' | 'Litros' | 'garrafa' | 'bandeja' | 'caixa' | 'vidro' | 'sache' | 'bisnaga' | 'frasco' | 'pote' | string;
  imagem: string;
  quantidade_por_pessoa_dia: number;
  ativo: boolean;
  favorito?: boolean;
  descricaoBreve?: string;
  kit_tags?: ('cafe_manha' | 'churrasco' | 'drinks' | 'criancas' | 'feijoada')[];
  emoji?: string;
}

export interface ItemPedido {
  id: string; // matches catalogo id or custom id
  nome: string;
  fornecedor: FornecedorId;
  subcategoria?: string;
  unidade: string;
  quantidade: number;
  observacao?: string;
  aceitaSubstituto: boolean;
  isCustom?: boolean;
}

export type StatusPedido = 
  | 'Rascunho' 
  | 'Aguardando aprovação' 
  | 'Correção solicitada' 
  | 'Aprovada' 
  | 'Enviada aos fornecedores';

export interface Pedido {
  id: string;
  casa: string;
  slugCasa: string;
  dataChegada: string;
  dataSaida: string;
  numHospedes: number;
  itens: Record<string, ItemPedido>;
  status: StatusPedido;
  dataCriacao: string;
  dataAtualizacao: string;
  observacaoAprovacao?: string;
}

export interface KitPronto {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
  itens: {
    itemId: string;
    fatorQtdPessoaDia?: number; // multiplica por hóspedes x dias
    fatorQtdPessoa?: number;    // multiplica por hóspedes
    fatorQtdFixa?: number;      // quantidade fixa base
  }[];
}
