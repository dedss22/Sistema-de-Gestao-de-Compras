import { describe, it, expect } from 'vitest';
import { verificarItensEssenciais } from '../utils/validation';
import { ItemCatalogo, ItemPedido, KitPronto } from '../types';
import { KITS_PRONTOS } from '../data/kits';
import catalogoJson from '../data/catalogo.json';

function makeItem(
  id: string,
  nome: string,
  quantidade = 1,
  unidade = 'un'
): ItemPedido {
  return {
    id,
    nome,
    fornecedor: 'mercado',
    unidade,
    quantidade,
    aceitaSubstituto: true,
  };
}

/**
 * Replica fiel da fórmula de sugestão exibida nos cards do catálogo (src/App.tsx)
 */
function calcularSugestaoItem(
  item: Pick<ItemCatalogo, 'unidade' | 'quantidade_por_pessoa_dia'>,
  numHospedes: number,
  numDias: number,
  isPrimeiroPedido: boolean
): number | undefined {
  if (!isPrimeiroPedido || !item.quantidade_por_pessoa_dia) {
    return undefined;
  }
  const isDecimal = item.unidade === 'kg' || item.unidade.toLowerCase().includes('litro');
  return isDecimal
    ? Number((Math.ceil(item.quantidade_por_pessoa_dia * numHospedes * numDias * 2) / 2).toFixed(1))
    : Math.max(1, Math.round(item.quantidade_por_pessoa_dia * numHospedes * numDias));
}

/**
 * Replica fiel do cálculo de quantidade automática de kits (src/App.tsx)
 */
function calcularQuantidadeKitItem(
  kitItem: KitPronto['itens'][number],
  unidade: string,
  numHospedes: number,
  numDias: number
): number {
  let qtdCalculada = 0;
  if (kitItem.fatorQtdPessoaDia) {
    qtdCalculada = kitItem.fatorQtdPessoaDia * numHospedes * numDias;
  } else if (kitItem.fatorQtdPessoa) {
    qtdCalculada = kitItem.fatorQtdPessoa * numHospedes;
  } else if (kitItem.fatorQtdFixa) {
    qtdCalculada = kitItem.fatorQtdFixa;
  }

  const isDecimal = unidade === 'kg' || unidade.toLowerCase().includes('litro');
  return isDecimal
    ? Number((Math.ceil(qtdCalculada * 2) / 2).toFixed(1))
    : Math.max(1, Math.round(qtdCalculada));
}

describe('validation.ts e cálculo de sugestões', () => {
  describe('verificarItensEssenciais', () => {
    it('retorna todos os 26 alertas base quando o pedido está vazio (sem carnes de churrasco)', () => {
      const alertas = verificarItensEssenciais({}, 8, 5);
      expect(alertas).toHaveLength(26);

      const ids = alertas.map((a) => a.id);
      expect(ids).toContain('cafe');
      expect(ids).toContain('leite');
      expect(ids).toContain('saco-lixo');
      expect(ids).toContain('azeite-dende');
      expect(ids).toContain('azeite-oliva-extra');
      expect(ids).not.toContain('carvao');
    });

    it('ignora itens com quantidade zero ou negativa', () => {
      const itens: Record<string, ItemPedido> = {
        'cafe-po': makeItem('cafe-po', 'Café Moído', 0, 'pacote'),
        'leite-integral': makeItem('leite-integral', 'Leite Integral', -1, 'litro'),
      };

      const alertas = verificarItensEssenciais(itens, 6, 4);
      const ids = alertas.map((a) => a.id);
      expect(ids).toContain('cafe');
      expect(ids).toContain('leite');
    });

    it('não confunde derivados com itens essenciais distintos (leite de coco, leite condensado, dendê)', () => {
      const itens: Record<string, ItemPedido> = {
        'leite-coco': makeItem('leite-coco', 'Leite de Coco', 2, 'Litros'),
        'leite-condensado': makeItem('leite-condensado', 'Leite Condensado', 2, 'un'),
        'creme-leite': makeItem('creme-leite', 'Creme de Leite', 2, 'un'),
        'azeite-dende': makeItem('azeite-dende', 'Azeite de Dendê', 1, 'garrafa'),
      };

      const alertas = verificarItensEssenciais(itens, 6, 4);
      const ids = alertas.map((a) => a.id);

      // Leite integral e azeite de oliva continuam ausentes
      expect(ids).toContain('leite');
      expect(ids).toContain('azeite-oliva-extra');
      // Os informados foram reconhecidos
      expect(ids).not.toContain('leite-coco');
      expect(ids).not.toContain('leite-condensado');
      expect(ids).not.toContain('creme-leite');
      expect(ids).not.toContain('azeite-dende');
    });

    it('alerta falta de carvão quando há carne de churrasco e calcula quantidade sugerida proporcional aos hóspedes', () => {
      const comPicanha = {
        'picanha-prime': {
          ...makeItem('picanha-prime', 'Picanha Bovina Especial', 3, 'kg'),
          fornecedor: 'acougue' as const,
        },
      };

      // Mínimo 2 pacotes (4 * 0.3 = 1.2 -> Math.round = 1 -> Math.max(2, 1) = 2)
      const alertas4Hospedes = verificarItensEssenciais(comPicanha, 4, 3);
      const alertaCarvao4 = alertas4Hospedes.find((a) => a.id === 'carvao');
      expect(alertaCarvao4).toBeDefined();
      expect(alertaCarvao4?.quantidadeSugerida).toBe(2);
      expect(alertaCarvao4?.itemIdSugerido).toBe('carvao-vegetal');

      // 12 * 0.3 = 3.6 -> Math.round = 4
      const alertas12Hospedes = verificarItensEssenciais(comPicanha, 12, 3);
      const alertaCarvao12 = alertas12Hospedes.find((a) => a.id === 'carvao');
      expect(alertaCarvao12?.quantidadeSugerida).toBe(4);

      // Com carvão já adicionado, o alerta desaparece
      const comCarvao = {
        ...comPicanha,
        'carvao-vegetal': makeItem('carvao-vegetal', 'Carvão Vegetal', 3, 'pacote'),
      };
      const alertasComCarvao = verificarItensEssenciais(comCarvao, 12, 3);
      expect(alertasComCarvao.find((a) => a.id === 'carvao')).toBeUndefined();
    });

    it('retorna lista vazia quando todos os 26 itens essenciais base estão presentes', () => {
      const todosBase = verificarItensEssenciais({}, 8, 5);
      const pedidoCompleto: Record<string, ItemPedido> = {};
      for (const alerta of todosBase) {
        pedidoCompleto[alerta.itemIdSugerido] = makeItem(
          alerta.itemIdSugerido,
          alerta.nome,
          alerta.quantidadeSugerida,
          alerta.unidade
        );
      }

      expect(verificarItensEssenciais(pedidoCompleto, 8, 5)).toEqual([]);
    });

    it('todos os itens sugeridos nos alertas existem no catálogo oficial com a mesma unidade', () => {
      const catalogo = catalogoJson as ItemCatalogo[];
      const mapaCatalogo = new Map(catalogo.map((c) => [c.id, c]));

      const alertas = verificarItensEssenciais(
        { 'picanha-prime': makeItem('picanha-prime', 'Picanha', 2, 'kg') },
        8,
        5
      );
      expect(alertas).toHaveLength(27);

      for (const alerta of alertas) {
        const itemCat = mapaCatalogo.get(alerta.itemIdSugerido);
        expect(itemCat, `Item ${alerta.itemIdSugerido} deve existir no catálogo`).toBeDefined();
        expect(itemCat?.unidade).toBe(alerta.unidade);
      }
    });
  });

  describe('Cálculo de sugestões de quantidade', () => {
    it('arredonda para cima em múltiplos de 0.5 para itens em kg ou litros no 1º pedido', () => {
      // 0.16 * 8 * 5 = 6.4 -> ceil(6.4 * 2) / 2 = 6.5
      expect(calcularSugestaoItem({ unidade: 'kg', quantidade_por_pessoa_dia: 0.16 }, 8, 5, true)).toBe(6.5);
      // 0.25 * 4 * 3 = 3.0 -> 3
      expect(calcularSugestaoItem({ unidade: 'Litros', quantidade_por_pessoa_dia: 0.25 }, 4, 3, true)).toBe(3);
      // 0.1 * 2 * 1 = 0.2 -> ceil(0.4) / 2 = 0.5
      expect(calcularSugestaoItem({ unidade: 'litro', quantidade_por_pessoa_dia: 0.1 }, 2, 1, true)).toBe(0.5);
    });

    it('arredonda para inteiro com mínimo 1 para itens não decimais', () => {
      // 0.05 * 2 * 2 = 0.2 -> round = 0 -> max(1, 0) = 1
      expect(calcularSugestaoItem({ unidade: 'pacote', quantidade_por_pessoa_dia: 0.05 }, 2, 2, true)).toBe(1);
      // 1.5 * 8 * 3 = 36
      expect(calcularSugestaoItem({ unidade: 'un', quantidade_por_pessoa_dia: 1.5 }, 8, 3, true)).toBe(36);
    });

    it('não gera sugestão para pedidos subsequentes ou itens sem taxa por pessoa/dia', () => {
      expect(calcularSugestaoItem({ unidade: 'kg', quantidade_por_pessoa_dia: 0.2 }, 8, 5, false)).toBeUndefined();
      expect(calcularSugestaoItem({ unidade: 'un', quantidade_por_pessoa_dia: 0 }, 8, 5, true)).toBeUndefined();
    });

    it('calcula corretamente as quantidades dos kits para os 3 tipos de fator (pessoa/dia, pessoa, fixa)', () => {
      const catalogoMap = new Map((catalogoJson as ItemCatalogo[]).map((i) => [i.id, i]));
      const kitChurrasco = KITS_PRONTOS.find((k) => k.id === 'churrasco')!;
      const kitCafe = KITS_PRONTOS.find((k) => k.id === 'cafe_manha')!;

      // fatorQtdPessoa: picanha-prime (0.25) * 9 hóspedes = 2.25 kg -> 2.5 kg
      const picanhaKit = kitChurrasco.itens.find((i) => i.itemId === 'picanha-prime')!;
      expect(
        calcularQuantidadeKitItem(picanhaKit, catalogoMap.get('picanha-prime')!.unidade, 9, 5)
      ).toBe(2.5);

      // fatorQtdFixa: sal-grosso (1)
      const salKit = kitChurrasco.itens.find((i) => i.itemId === 'sal-grosso')!;
      expect(
        calcularQuantidadeKitItem(salKit, catalogoMap.get('sal-grosso')!.unidade, 9, 5)
      ).toBe(1);

      // fatorQtdPessoaDia: leite-integral (0.25) * 6 hóspedes * 4 dias = 6 litros
      const leiteKit = kitCafe.itens.find((i) => i.itemId === 'leite-integral')!;
      expect(
        calcularQuantidadeKitItem(leiteKit, catalogoMap.get('leite-integral')!.unidade, 6, 4)
      ).toBe(6);
    });
  });
});
