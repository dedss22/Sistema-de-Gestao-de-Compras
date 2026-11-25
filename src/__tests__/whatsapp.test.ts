import { describe, it, expect, vi } from 'vitest';
import { formatarDataBr, gerarTextoWhatsAppFornecedor, abrirWhatsApp } from '../utils/whatsapp';
import { Pedido, ItemPedido } from '../types';

function criarPedidoBase(itens: Record<string, ItemPedido>): Pedido {
  return {
    id: 'ped-1',
    casa: 'Villa Trancoso',
    slugCasa: 'villa-trancoso',
    dataChegada: '2026-12-20',
    dataSaida: '2026-12-27',
    numHospedes: 10,
    itens,
    status: 'Aprovada',
    dataCriacao: '2026-12-18T10:00:00.000Z',
    dataAtualizacao: '2026-12-18T10:00:00.000Z',
  };
}

describe('whatsapp.ts', () => {
  describe('formatarDataBr', () => {
    it('formata uma data ISO YYYY-MM-DD para DD/MM/YYYY', () => {
      expect(formatarDataBr('2026-11-25')).toBe('25/11/2026');
      expect(formatarDataBr('2026-01-05')).toBe('05/01/2026');
    });

    it('retorna string vazia quando recebe string vazia', () => {
      expect(formatarDataBr('')).toBe('');
    });
  });

  describe('gerarTextoWhatsAppFornecedor', () => {
    it('retorna string vazia quando não há itens com quantidade > 0 para o fornecedor', () => {
      const pedido = criarPedidoBase({
        'picanha-prime': {
          id: 'picanha-prime',
          nome: 'Picanha Bovina Especial',
          fornecedor: 'acougue',
          unidade: 'kg',
          quantidade: 0,
          aceitaSubstituto: true,
        },
        'robalo': {
          id: 'robalo',
          nome: 'Filé de Robalo',
          fornecedor: 'peixaria',
          unidade: 'kg',
          quantidade: 3,
          aceitaSubstituto: true,
        },
      });

      expect(gerarTextoWhatsAppFornecedor(pedido, 'acougue')).toBe('');
      expect(gerarTextoWhatsAppFornecedor(pedido, 'bebidas')).toBe('');
    });

    it('filtra apenas os itens do fornecedor solicitado em pedidos com múltiplos fornecedores', () => {
      const pedido = criarPedidoBase({
        'picanha-prime': {
          id: 'picanha-prime',
          nome: 'Picanha Bovina Especial',
          fornecedor: 'acougue',
          unidade: 'kg',
          quantidade: 4,
          aceitaSubstituto: true,
        },
        'costela-bovina': {
          id: 'costela-bovina',
          nome: 'Costela Bovina para Assar',
          fornecedor: 'acougue',
          unidade: 'kg',
          quantidade: 3,
          aceitaSubstituto: true,
        },
        'camarao-vg': {
          id: 'camarao-vg',
          nome: 'Camarão Rosa VG Limpo',
          fornecedor: 'peixaria',
          unidade: 'kg',
          quantidade: 2,
          aceitaSubstituto: true,
        },
        'coca-cola': {
          id: 'coca-cola',
          nome: 'Coca-Cola Original',
          fornecedor: 'bebidas',
          unidade: 'un',
          quantidade: 24,
          aceitaSubstituto: true,
        },
      });

      const textoAcougue = gerarTextoWhatsAppFornecedor(pedido, 'acougue');
      expect(textoAcougue).toContain('*PEDIDO DE COMPRAS - VILLA TRANCOSO*');
      expect(textoAcougue).toContain('📍 *Fornecedor:* AÇOUGUE');
      expect(textoAcougue).toContain('🗓️ *Data de Entrega desejada:* 20/12/2026 (Chegada dos hóspedes)');
      expect(textoAcougue).toContain('🗓️ *Período da Estadia:* 20/12/2026 até 27/12/2026');
      expect(textoAcougue).toContain('👥 *Hóspedes na casa:* 10 pessoas');
      expect(textoAcougue).toContain('1. *Picanha Bovina Especial*: 4 kg');
      expect(textoAcougue).toContain('2. *Costela Bovina para Assar*: 3 kg');
      expect(textoAcougue).not.toContain('Camarão Rosa VG Limpo');
      expect(textoAcougue).not.toContain('Coca-Cola Original');

      const textoPeixaria = gerarTextoWhatsAppFornecedor(pedido, 'peixaria');
      expect(textoPeixaria).toContain('📍 *Fornecedor:* PEIXARIA');
      expect(textoPeixaria).toContain('1. *Camarão Rosa VG Limpo*: 2 kg');
      expect(textoPeixaria).not.toContain('Picanha Bovina Especial');
    });

    it('inclui observação aparada e aviso de não aceita substituto corretamente', () => {
      const pedido = criarPedidoBase({
        'camarao-vg': {
          id: 'camarao-vg',
          nome: 'Camarão Rosa VG Limpo',
          fornecedor: 'peixaria',
          unidade: 'kg',
          quantidade: 2.5,
          observacao: '  Manter rabinho para grelha  ',
          aceitaSubstituto: false,
        },
        'peixe-branco': {
          id: 'peixe-branco',
          nome: 'Peixe Branco em Postas',
          fornecedor: 'peixaria',
          unidade: 'kg',
          quantidade: 4,
          observacao: '   ',
          aceitaSubstituto: true,
        },
      });

      const texto = gerarTextoWhatsAppFornecedor(pedido, 'peixaria');
      expect(texto).toContain(
        '1. *Camarão Rosa VG Limpo*: 2.5 kg _(Obs: Manter rabinho para grelha)_ ⚠️ _(Não aceita substituto)_'
      );
      expect(texto).toContain('2. *Peixe Branco em Postas*: 4 kg\n');
      expect(texto).not.toContain('2. *Peixe Branco em Postas*: 4 kg _(Obs:');
    });

    it('omite o período da estadia quando dataSaida está vazia', () => {
      const pedido = {
        ...criarPedidoBase({
          'cafe-po': {
            id: 'cafe-po',
            nome: 'Café Moído',
            fornecedor: 'mercado',
            unidade: 'pacote',
            quantidade: 2,
            aceitaSubstituto: true,
          },
        }),
        dataSaida: '',
      };

      const texto = gerarTextoWhatsAppFornecedor(pedido, 'mercado');
      expect(texto).toContain('🗓️ *Data de Entrega desejada:* 20/12/2026');
      expect(texto).not.toContain('Período da Estadia');
    });
  });

  describe('abrirWhatsApp', () => {
    it('monta URL wa.me com telefone sanitizado e mensagem codificada', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      abrirWhatsApp('(73) 99999-1234', 'Olá, pedido #1');
      expect(openSpy).toHaveBeenCalledWith(
        'https://wa.me/73999991234?text=Ol%C3%A1%2C%20pedido%20%231',
        '_blank'
      );

      abrirWhatsApp('', 'Sem telefone');
      expect(openSpy).toHaveBeenCalledWith(
        'https://wa.me/?text=Sem%20telefone',
        '_blank'
      );
    });
  });
});
