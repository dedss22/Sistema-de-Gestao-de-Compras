/**
 * PONTO DE INTEGRAÇÃO COM E-MAIL (FASE B5)
 *
 * Esta função centraliza o disparo de e-mail ao finalizar um pedido.
 * Por enquanto, registra os dados estruturados no console para conferência.
 * Na próxima etapa, aqui será plugado o envio real (ex: Resend, SendGrid ou Edge Function).
 *
 * @param {Object} pedido - Dados do pedido finalizado
 * @param {number} pedido.numero - Número sequencial do pedido (1, 2, 3...)
 * @param {string} pedido.finalizado_em - Data/hora ISO de finalização
 * @param {string} pedido.cozinheira - Nome da cozinheira
 * @param {Array} pedido.itens - Lista de itens do pedido
 * @param {Object} estadia - Dados da estadia
 * @param {string} estadia.casa - Nome da casa
 * @param {string} estadia.entrada - Data de entrada
 * @param {string} estadia.saida - Data de saída
 * @param {number} estadia.hospedes - Quantidade de hóspedes
 * @param {string} [estadia.codigo] - Código de acesso da estadia
 */
export async function enviarPedido(pedido, estadia) {
  console.group('📧 [INTEGRAÇÃO E-MAIL] Pedido Finalizado para Notificação');
  console.log('Dados da Estadia:', {
    casa: estadia.casa,
    periodo: `${estadia.entrada} a ${estadia.saida}`,
    hospedes: estadia.hospedes,
    codigo: estadia.codigo
  });
  console.log('Dados do Pedido:', {
    numero: pedido.numero,
    cozinheira: pedido.cozinheira,
    finalizado_em: pedido.finalizado_em,
    total_itens: pedido.itens?.length || 0
  });
  console.log('Itens Solicitados:', pedido.itens);
  console.groupEnd();

  // Retorna sucesso mock para encadeamento
  return {
    sucesso: true,
    mock: true,
    timestamp: new Date().toISOString()
  };
}
