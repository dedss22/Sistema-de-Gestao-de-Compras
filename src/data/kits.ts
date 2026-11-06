import { KitPronto } from '../types';

export const KITS_PRONTOS: KitPronto[] = [
  {
    id: 'churrasco',
    titulo: 'Churrasco Completo',
    descricao: 'Picanha, costela, fraldinha, maminha, linguiça toscana, coração, queijo coalho, carvão e sal grosso.',
    icone: 'Flame',
    cor: 'rose',
    itens: [
      { itemId: 'picanha-prime', fatorQtdPessoa: 0.25 },
      { itemId: 'costela-bovina', fatorQtdPessoa: 0.25 },
      { itemId: 'fraldinha-red', fatorQtdPessoa: 0.15 },
      { itemId: 'maminha-grill', fatorQtdPessoa: 0.15 },
      { itemId: 'linguica-toscana', fatorQtdPessoa: 0.15 },
      { itemId: 'coracao-frango', fatorQtdPessoa: 0.08 },
      { itemId: 'queijo-coalho-espeto', fatorQtdPessoa: 0.20 },
      { itemId: 'carvao-vegetal', fatorQtdPessoa: 0.35 },
      { itemId: 'sal-grosso', fatorQtdFixa: 1 },
      { itemId: 'gelo-filtrado-5kg', fatorQtdPessoa: 0.40 },
      { itemId: 'pao-frances', fatorQtdPessoa: 1.5 },
      { itemId: 'farinha-mandioca', fatorQtdPessoa: 0.10 }
    ]
  },
  {
    id: 'feijoada',
    titulo: 'Feijoada de Domingo',
    descricao: 'Carne-seca, paio, calabresa, costelinha salgada, feijão preto, arroz, couve e laranja para suco.',
    icone: 'Soup',
    cor: 'amber',
    itens: [
      { itemId: 'carne-seca-charque', fatorQtdPessoa: 0.20 },
      { itemId: 'costelinha-salgada', fatorQtdPessoa: 0.15 },
      { itemId: 'calabresa', fatorQtdPessoa: 0.15 },
      { itemId: 'paio', fatorQtdPessoa: 0.10 },
      { itemId: 'feijao-preto', fatorQtdPessoa: 0.12 },
      { itemId: 'arroz-branco', fatorQtdPessoa: 0.12 },
      { itemId: 'couve-manteiga', fatorQtdPessoa: 0.25 },
      { itemId: 'laranja-suco', fatorQtdPessoa: 0.40 },
      { itemId: 'farinha-mandioca', fatorQtdPessoa: 0.10 }
    ]
  },
  {
    id: 'cafe_manha',
    titulo: 'Café da Manhã',
    descricao: 'Tapioca, pão de queijo, pão de forma, ovos caipiras, frutas, queijos, manteiga e café baiano.',
    icone: 'Coffee',
    cor: 'amber',
    itens: [
      { itemId: 'pao-forma', fatorQtdPessoaDia: 0.10 },
      { itemId: 'pao-queijo-congelado', fatorQtdPessoaDia: 0.15 },
      { itemId: 'goma-tapioca', fatorQtdPessoaDia: 0.10 },
      { itemId: 'ovos-frescos', fatorQtdPessoaDia: 0.35 },
      { itemId: 'leite-integral', fatorQtdPessoaDia: 0.25 },
      { itemId: 'cafe-po', fatorQtdPessoaDia: 0.08 },
      { itemId: 'manteiga-sal', fatorQtdPessoaDia: 0.05 },
      { itemId: 'queijo-mussarela', fatorQtdPessoaDia: 0.10 },
      { itemId: 'queijo-prato', fatorQtdPessoaDia: 0.08 },
      { itemId: 'requeijao-cremoso', fatorQtdPessoaDia: 0.05 },
      { itemId: 'banana-terra', fatorQtdPessoaDia: 0.25 },
      { itemId: 'mamao-formosa', fatorQtdPessoaDia: 0.25 },
      { itemId: 'melancia', fatorQtdPessoaDia: 0.25 }
    ]
  },
  {
    id: 'drinks',
    titulo: 'Bebidas & Bar Tropical',
    descricao: 'Água mineral, água de coco, refrigerantes, Red Bull tropical, água tônica, limão, hortelã e gelo.',
    icone: 'GlassWater',
    cor: 'emerald',
    itens: [
      { itemId: 'agua-mineral-sem-gas', fatorQtdPessoaDia: 2.0 },
      { itemId: 'agua-mineral-com-gas', fatorQtdPessoaDia: 1.0 },
      { itemId: 'agua-coco-natural', fatorQtdPessoaDia: 0.30 },
      { itemId: 'coca-cola-original', fatorQtdPessoaDia: 1.0 },
      { itemId: 'coca-cola-zero', fatorQtdPessoaDia: 1.0 },
      { itemId: 'red-bull-tropical', fatorQtdPessoa: 2.0 },
      { itemId: 'agua-tonica', fatorQtdPessoa: 2.0 },
      { itemId: 'limao-taiti', fatorQtdPessoa: 0.25 },
      { itemId: 'hortela', fatorQtdFixa: 2 },
      { itemId: 'gelo-filtrado-5kg', fatorQtdPessoa: 0.40 },
      { itemId: 'acucar-refinado', fatorQtdFixa: 1 }
    ]
  },
  {
    id: 'criancas',
    titulo: 'Kids & Sobremesa',
    descricao: 'Filé de frango, carne moída, batata frita, macarrão, sorvete de creme, Nutella e achocolatado.',
    icone: 'Smile',
    cor: 'sky',
    itens: [
      { itemId: 'file-frango', fatorQtdPessoaDia: 0.15 },
      { itemId: 'carne-moida', fatorQtdPessoaDia: 0.15 },
      { itemId: 'file-tilapia', fatorQtdPessoaDia: 0.12 },
      { itemId: 'batata-pre-frita', fatorQtdPessoaDia: 0.15 },
      { itemId: 'macarrao-espaguete', fatorQtdPessoaDia: 0.10 },
      { itemId: 'leite-integral', fatorQtdPessoaDia: 0.25 },
      { itemId: 'achocolatado-po', fatorQtdFixa: 1 },
      { itemId: 'nutella', fatorQtdFixa: 1 },
      { itemId: 'sorvete-creme', fatorQtdFixa: 2 }
    ]
  }
];
