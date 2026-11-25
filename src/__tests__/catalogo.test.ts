import { describe, it, expect } from 'vitest';
import catalogoJson from '../data/catalogo.json';
import { FORNECEDORES } from '../data/fornecedores';
import { KITS_PRONTOS } from '../data/kits';
import { FornecedorId, ItemCatalogo } from '../types';

const catalogo = catalogoJson as ItemCatalogo[];
const FORNECEDORES_VALIDOS = new Set<FornecedorId>(Object.keys(FORNECEDORES) as FornecedorId[]);
const KIT_TAGS_VALIDAS = new Set(['cafe_manha', 'churrasco', 'drinks', 'criancas', 'feijoada']);

describe('Integridade de catalogo.json e kits.ts', () => {
  it('catálogo possui itens carregados e não está vazio', () => {
    expect(Array.isArray(catalogo)).toBe(true);
    expect(catalogo.length).toBeGreaterThan(100);
  });

  it('todos os IDs do catálogo são únicos e não vazios (sem duplicatas)', () => {
    const vistos = new Set<string>();
    const duplicados: string[] = [];

    for (const item of catalogo) {
      expect(typeof item.id).toBe('string');
      expect(item.id.trim().length).toBeGreaterThan(0);

      if (vistos.has(item.id)) {
        duplicados.push(item.id);
      }
      vistos.add(item.id);
    }

    expect(duplicados).toEqual([]);
  });

  it('todos os itens possuem fornecedor válido e unidade preenchida', () => {
    for (const item of catalogo) {
      expect(
        FORNECEDORES_VALIDOS.has(item.fornecedor),
        `Item "${item.id}" possui fornecedor inválido: "${item.fornecedor}"`
      ).toBe(true);

      expect(typeof item.unidade).toBe('string');
      expect(
        item.unidade.trim().length,
        `Item "${item.id}" está sem unidade preenchida`
      ).toBeGreaterThan(0);
    }
  });

  it('todos os itens possuem estrutura obrigatória válida', () => {
    for (const item of catalogo) {
      expect(typeof item.nome, `Item "${item.id}" sem nome`).toBe('string');
      expect(item.nome.trim().length).toBeGreaterThan(0);

      expect(typeof item.subcategoria, `Item "${item.id}" sem subcategoria`).toBe('string');
      expect(item.subcategoria.trim().length).toBeGreaterThan(0);

      expect(typeof item.imagem, `Item "${item.id}" sem imagem`).toBe('string');
      expect(item.imagem.trim().length).toBeGreaterThan(0);

      expect(typeof item.ativo, `Item "${item.id}" com ativo não booleano`).toBe('boolean');

      if (item.quantidade_por_pessoa_dia !== undefined) {
        expect(typeof item.quantidade_por_pessoa_dia).toBe('number');
        expect(Number.isFinite(item.quantidade_por_pessoa_dia)).toBe(true);
        expect(item.quantidade_por_pessoa_dia).toBeGreaterThanOrEqual(0);
      }

      if (item.kit_tags !== undefined) {
        expect(Array.isArray(item.kit_tags)).toBe(true);
        for (const tag of item.kit_tags) {
          expect(KIT_TAGS_VALIDAS.has(tag), `Tag inválida "${tag}" em "${item.id}"`).toBe(true);
        }
      }
    }
  });

  it('todos os itemId referenciados em KITS_PRONTOS existem no catalogo.json e têm fator válido', () => {
    const idsCatalogo = new Set(catalogo.map((i) => i.id));
    expect(KITS_PRONTOS.length).toBeGreaterThan(0);

    for (const kit of KITS_PRONTOS) {
      expect(kit.id.trim().length).toBeGreaterThan(0);
      expect(kit.titulo.trim().length).toBeGreaterThan(0);
      expect(kit.itens.length).toBeGreaterThan(0);

      const idsNoKit = new Set<string>();
      for (const kitItem of kit.itens) {
        expect(
          idsCatalogo.has(kitItem.itemId),
          `Kit "${kit.id}" referencia itemId inexistente no catálogo: "${kitItem.itemId}"`
        ).toBe(true);

        expect(
          idsNoKit.has(kitItem.itemId),
          `Kit "${kit.id}" possui itemId duplicado: "${kitItem.itemId}"`
        ).toBe(false);
        idsNoKit.add(kitItem.itemId);

        const temFator =
          (kitItem.fatorQtdPessoaDia ?? 0) > 0 ||
          (kitItem.fatorQtdPessoa ?? 0) > 0 ||
          (kitItem.fatorQtdFixa ?? 0) > 0;
        expect(
          temFator,
          `Item "${kitItem.itemId}" no kit "${kit.id}" precisa de pelo menos um fator > 0`
        ).toBe(true);
      }
    }
  });
});
