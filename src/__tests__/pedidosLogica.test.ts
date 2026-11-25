import { describe, it, expect, beforeEach, vi } from 'vitest';

async function carregarDbLimpo() {
  vi.resetModules();
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  return await import('../services/db');
}

describe('db.js - Lógica de pedidos e fluxos locais', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('calcularDiferencasItensPedido', () => {
    it('detecta itens adicionados, removidos, alteração de quantidade, unidade, observação, substituto e fornecedor', async () => {
      const { calcularDiferencasItensPedido } = await carregarDbLimpo();

      const anteriores = [
        {
          id: 'picanha-prime',
          item: 'Picanha Bovina',
          fornecedor: 'acougue',
          unidade: 'kg',
          quantidade: 4,
          observacao: 'Peça inteira',
          aceitaSubstituto: true,
        },
        {
          id: 'leite-integral',
          item: 'Leite Integral',
          fornecedor: 'mercado',
          unidade: 'litro',
          quantidade: 2,
          observacao: '',
          aceitaSubstituto: true,
        },
        {
          id: 'suco-laranja',
          item: 'Suco de Laranja',
          fornecedor: 'bebidas',
          unidade: 'litro',
          quantidade: 3,
          observacao: 'Natural',
          aceitaSubstituto: true,
        },
      ];

      const novos = [
        {
          id: 'picanha-prime',
          item: 'Picanha Bovina',
          fornecedor: 'acougue',
          unidade: 'kg',
          quantidade: 6, // quantidade alterada
          observacao: 'Fatiada em bifes grossos', // observação alterada
          aceitaSubstituto: false, // substituto alterado
        },
        {
          id: 'leite-integral',
          item: 'Leite Integral',
          fornecedor: 'frios-laticinios', // fornecedor alterado
          unidade: 'Litros', // unidade alterada mantendo mesma quantidade
          quantidade: 2,
          observacao: 'Desnatado ou integral', // observação adicionada
          aceitaSubstituto: true,
        },
        {
          id: 'carvao-vegetal',
          item: 'Carvão Vegetal',
          fornecedor: 'mercado',
          unidade: 'pacote',
          quantidade: 4,
          aceitaSubstituto: true,
        },
      ];

      const { alteracoes, alteracoesDetalhadas } = calcularDiferencasItensPedido(anteriores, novos);

      expect(alteracoesDetalhadas.map((a) => a.tipo)).toEqual([
        'alterado',
        'alterado',
        'removido',
        'adicionado',
      ]);

      const picanhaDiff = alteracoesDetalhadas[0];
      expect(picanhaDiff.mudancas).toContain('Quantidade alterada de 4 kg para 6 kg');
      expect(picanhaDiff.mudancas).toContain('Substituto: Não aceita mais substituto');
      expect(picanhaDiff.mudancas).toContain(
        'Observação alterada: de "Peça inteira" para "Fatiada em bifes grossos"'
      );

      const leiteDiff = alteracoesDetalhadas[1];
      expect(leiteDiff.mudancas).toContain('Unidade alterada de "litro" para "Litros"');
      expect(leiteDiff.mudancas).toContain('Observação adicionada: "Desnatado ou integral"');
      expect(leiteDiff.mudancas).toContain('Fornecedor alterado de "mercado" para "frios-laticinios"');

      expect(alteracoes.some((a) => a.includes('Removido item: "Suco de Laranja" (3 litro)'))).toBe(true);
      expect(alteracoes.some((a) => a.includes('Adicionado item: "Carvão Vegetal" (4 pacote)'))).toBe(true);
    });

    it('detecta remoção de observação, volta a aceitar substituto e casamento por nome quando sem ID', async () => {
      const { calcularDiferencasItensPedido } = await carregarDbLimpo();

      const anteriores = [
        {
          item: 'Tomate Italiano',
          fornecedor: 'hortifruti',
          unidade: 'kg',
          quantidade: 2,
          observacao: 'Bem maduros',
          aceitaSubstituto: false,
        },
      ];
      const novos = [
        {
          item: '  tomate italiano ',
          fornecedor: 'hortifruti',
          unidade: 'kg',
          quantidade: 2,
          observacao: '',
          aceitaSubstituto: true,
        },
      ];

      const { alteracoesDetalhadas } = calcularDiferencasItensPedido(anteriores, novos);
      expect(alteracoesDetalhadas).toHaveLength(1);
      expect(alteracoesDetalhadas[0].tipo).toBe('alterado');
      expect(alteracoesDetalhadas[0].mudancas).toContain('Substituto: Agora aceita substituto');
      expect(alteracoesDetalhadas[0].mudancas).toContain('Observação removida (era "Bem maduros")');
    });

    it('retorna listas vazias quando os itens são idênticos', async () => {
      const { calcularDiferencasItensPedido } = await carregarDbLimpo();

      const itens = [
        {
          id: 'cafe-po',
          item: 'Café Moído',
          fornecedor: 'mercado',
          unidade: 'pacote',
          quantidade: 2,
          aceitaSubstituto: true,
        },
      ];

      const resultado = calcularDiferencasItensPedido(itens, [...itens]);
      expect(resultado.alteracoes).toEqual([]);
      expect(resultado.alteracoesDetalhadas).toEqual([]);
    });
  });

  describe('Fluxo local completo: estadia, pedido, status e pagamentos de nota', () => {
    it('cria estadia, gera pedido, transita status e registra logs locais', async () => {
      const db = await carregarDbLimpo();

      expect(db.isSupabaseConfigured()).toBe(false);

      await db.loginEquipe('alexandre', 'paralelo17');

      const estadia = await db.criarEstadia({
        casa: '  Casa Praia Bela  ',
        entrada: '2026-12-10',
        saida: '2026-12-15',
        hospedes: 6,
        titular: '  Marina Costa  ',
        funcionario: '  André Balbino  ',
      });

      expect(estadia.id).toMatch(/^estadia-/);
      expect(estadia.codigo).toHaveLength(10);
      expect(estadia.casa).toBe('Casa Praia Bela');
      expect(estadia.titular).toBe('Marina Costa');
      expect(estadia.status).toBe('ativa');

      const estadiaPublica = await db.obterEstadiaPorCodigo(estadia.codigo);
      expect(estadiaPublica).toEqual({
        status: 'ativa',
        casa: 'Casa Praia Bela',
        entrada: '2026-12-10',
        saida: '2026-12-15',
        hospedes: 6,
        total_pedidos: 0,
      });

      const pedidoCriado = await db.criarPedido({
        codigo: estadia.codigo,
        cozinheira: 'Dona Maria',
        itens: [
          {
            fornecedor: 'acougue',
            categoria: 'Cortes',
            item: 'Picanha Bovina',
            quantidade: 3,
            unidade: 'kg',
            aceitaSubstituto: true,
          },
          {
            fornecedor: 'mercado',
            categoria: 'Café',
            item: 'Café Moído',
            quantidade: 2,
            unidade: 'pacote',
            aceitaSubstituto: false,
          },
        ],
      });

      expect(pedidoCriado.numero).toBe(1);

      const pedidosEstadia = await db.listarPedidosPorEstadia(estadia.id);
      expect(pedidosEstadia).toHaveLength(1);
      const pedido = pedidosEstadia[0];
      expect(pedido.status).toBe('em_aprovacao');
      expect(pedido.cozinheira).toBe('Dona Maria');

      const aprovado = await db.alterarStatusPedido(pedido.id, 'enviar_fornecedores');
      expect(aprovado.status).toBe('enviar_fornecedores');
      expect(aprovado.aprovado_por_nome).toBe('Alexandre Pampolini');
      expect(aprovado.aprovado_em).toBeTruthy();

      const emPreparacao = await db.alterarStatusPedido(pedido.id, 'preparacao_entrega');
      expect(emPreparacao.status).toBe('preparacao_entrega');
      expect(emPreparacao.enviado_fornecedor_por_nome).toBe('Alexandre Pampolini');

      const finalizado = await db.alterarStatusPedido(pedido.id, 'finalizado');
      expect(finalizado.status).toBe('finalizado');
      expect(finalizado.concluido_por_nome).toBe('Alexandre Pampolini');

      // Rejeição e reabertura
      const rejeitado = await db.alterarStatusPedido(pedido.id, 'rejeitado');
      expect(rejeitado.status).toBe('rejeitado');
      expect(rejeitado.rejeitado_por_nome).toBe('Alexandre Pampolini');

      const reaberto = await db.alterarStatusPedido(pedido.id, 'em_aprovacao');
      expect(reaberto.status).toBe('em_aprovacao');
      expect(reaberto.reaberto_por_nome).toBe('Alexandre Pampolini');
    });

    it('impede criação de pedido para estadia inexistente ou finalizada', async () => {
      const db = await carregarDbLimpo();

      await expect(
        db.criarPedido({
          codigo: 'inexistente',
          cozinheira: 'Maria',
          itens: [
            {
              fornecedor: 'mercado',
              categoria: 'Geral',
              item: 'Sal',
              quantidade: 1,
              unidade: 'kg',
              aceitaSubstituto: true,
            },
          ],
        })
      ).rejects.toThrow('Estadia não encontrada');

      const estadia = await db.criarEstadia({
        casa: 'Casa Sul',
        entrada: '2026-12-01',
        saida: '2026-12-05',
        hospedes: 4,
        titular: 'Carlos',
        funcionario: 'Lorena',
      });

      await db.alterarStatusEstadia(estadia.id, 'finalizada');

      await expect(
        db.criarPedido({
          codigo: estadia.codigo,
          cozinheira: 'Maria',
          itens: [
            {
              fornecedor: 'mercado',
              categoria: 'Geral',
              item: 'Sal',
              quantidade: 1,
              unidade: 'kg',
              aceitaSubstituto: true,
            },
          ],
        })
      ).rejects.toThrow('não está ativa');
    });

    it('registra pagamento parcial, quitação total e superávit em nota de pedido', async () => {
      const db = await carregarDbLimpo();
      await db.loginEquipe('andre', 'Qwe*775533');

      const estadia = await db.criarEstadia({
        casa: 'Villa Espelho',
        entrada: '2026-12-10',
        saida: '2026-12-16',
        hospedes: 8,
        titular: 'Fernanda',
        funcionario: 'André Balbino',
      });

      await db.criarPedido({
        codigo: estadia.codigo,
        cozinheira: 'Cozinheira Ana',
        itens: [
          {
            fornecedor: 'acougue',
            categoria: 'Carnes',
            item: 'Picanha',
            quantidade: 5,
            unidade: 'kg',
            aceitaSubstituto: true,
          },
        ],
      });

      const [pedido] = await db.listarPedidosPorEstadia(estadia.id);

      const pedidoComAnexo = await db.adicionarAnexosPedido(pedido.id, [
        {
          id: 'nota-acougue-1',
          nome: 'NF Açougue.pdf',
          tipo: 'pdf',
          tamanho: '120 KB',
          url: 'https://exemplo.local/nf.pdf',
          fornecedor: 'Açougue Boi Nobre',
          valor_total: 500,
          quem_pagou: 'outra_pessoa',
          quem_pagou_outro: 'Concierge André',
        },
      ]);

      expect(pedidoComAnexo.anexos).toHaveLength(1);

      // 1. Pagamento parcial: R$ 200 de R$ 500
      const aposParcial = await db.registrarPagamentoNotaPedido(pedido.id, 'nota-acougue-1', {
        valor: 200,
        quem_pagou: 'hospede',
        quem_pagou_nome: 'Fernanda',
        forma_pagamento: 'PIX',
      });

      expect(aposParcial.anexoAtualizado.valor_pago).toBe(200);
      expect(aposParcial.anexoAtualizado.valor_restante).toBe(300);
      expect(aposParcial.anexoAtualizado.status_pagamento).toBe('parcial');
      expect(aposParcial.anexoAtualizado.quem_pagou).toBe('outra_pessoa');
      expect(aposParcial.anexoAtualizado.pagamentos).toHaveLength(1);

      // 2. Quitação total: mais R$ 300 -> total R$ 500
      const aposQuitacao = await db.registrarPagamentoNotaPedido(pedido.id, 'nota-acougue-1', {
        valor: 'R$ 300,00',
        quem_pagou: 'hospede',
        quem_pagou_nome: 'Fernanda',
        forma_pagamento: 'Cartão',
      });

      expect(aposQuitacao.anexoAtualizado.valor_pago).toBe(500);
      expect(aposQuitacao.anexoAtualizado.valor_restante).toBe(0);
      expect(aposQuitacao.anexoAtualizado.status_pagamento).toBe('pago');
      expect(aposQuitacao.anexoAtualizado.quem_pagou).toBe('hospede');
      expect(aposQuitacao.anexoAtualizado.quem_pagou_outro).toBe('');
      expect(aposQuitacao.anexoAtualizado.pagamentos).toHaveLength(2);

      // 3. Superávit: pagamento adicional de R$ 150 além dos R$ 500 (total pago R$ 650)
      const aposSuperavit = await db.registrarPagamentoNotaPedido(pedido.id, 'nota-acougue-1', {
        valor: 150,
        quem_pagou: 'hospede',
        quem_pagou_nome: 'Fernanda',
        forma_pagamento: 'PIX',
      });

      expect(aposSuperavit.anexoAtualizado.valor_pago).toBe(650);
      expect(aposSuperavit.anexoAtualizado.valor_restante).toBe(0);
      expect(aposSuperavit.anexoAtualizado.status_pagamento).toBe('pago');
      expect(aposSuperavit.anexoAtualizado.pagamentos).toHaveLength(3);

      const logs = await db.listarLogsAuditoria({ tipo: 'PAGAMENTO_NOTA_RECEBIDO' });
      expect(logs.length).toBeGreaterThanOrEqual(3);
      expect(logs[0].descricao).toMatch(/Superávit de R\$\s*150,00 a favor do cliente/);
    });

    it('rejeita pagamento com valor inválido ou negativo', async () => {
      const db = await carregarDbLimpo();

      await expect(
        db.registrarPagamentoNotaPedido('pedido-qualquer', 'anexo-qualquer', {
          valor: 0,
          quem_pagou: 'hospede',
        })
      ).rejects.toThrow('positivo');

      await expect(
        db.registrarPagamentoNotaPedido('pedido-qualquer', 'anexo-qualquer', {
          valor: -50,
          quem_pagou: 'hospede',
        })
      ).rejects.toThrow('positivo');
    });
  });
});
