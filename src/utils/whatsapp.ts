import { Pedido, FornecedorId, ItemPedido } from '../types';
import { FORNECEDORES } from '../data/fornecedores';

export function formatarDataBr(isoString: string): string {
  if (!isoString) return '';
  const [ano, mes, dia] = isoString.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function gerarTextoWhatsAppFornecedor(pedido: Pedido, fornecedorId: FornecedorId): string {
  const fornecedor = FORNECEDORES[fornecedorId];
  const itensDoFornecedor = Object.values(pedido.itens).filter(
    (item: ItemPedido) => item.fornecedor === fornecedorId && item.quantidade > 0
  );

  if (itensDoFornecedor.length === 0) {
    return '';
  }

  const dataEntregaFormatada = formatarDataBr(pedido.dataChegada);
  const dataSaidaFormatada = formatarDataBr(pedido.dataSaida);

  let texto = `*PEDIDO DE COMPRAS - ${pedido.casa.toUpperCase()}*\n`;
  texto += `📍 *Fornecedor:* ${fornecedor.nome.toUpperCase()}\n`;
  texto += `🗓️ *Data de Entrega desejada:* ${dataEntregaFormatada} (Chegada dos hóspedes)\n`;
  if (dataSaidaFormatada) {
    texto += `🗓️ *Período da Estadia:* ${dataEntregaFormatada} até ${dataSaidaFormatada}\n`;
  }
  texto += `👥 *Hóspedes na casa:* ${pedido.numHospedes} pessoas\n\n`;
  texto += `📋 *ITENS SOLICITADOS:*\n`;

  itensDoFornecedor.forEach((item, idx) => {
    texto += `${idx + 1}. *${item.nome}*: ${item.quantidade} ${item.unidade}`;
    if (item.observacao && item.observacao.trim()) {
      texto += ` _(Obs: ${item.observacao.trim()})_`;
    }
    if (!item.aceitaSubstituto) {
      texto += ` ⚠️ _(Não aceita substituto)_`;
    }
    texto += `\n`;
  });

  texto += `\n💬 _Por favor, confirme o recebimento e o horário previsto para entrega na casa. Muito obrigado!_`;

  return texto;
}

export function abrirWhatsApp(telefone: string, texto: string): void {
  const telLimpo = telefone.replace(/\D/g, '');
  const textoCodificado = encodeURIComponent(texto);
  const url = telLimpo 
    ? `https://wa.me/${telLimpo}?text=${textoCodificado}`
    : `https://wa.me/?text=${textoCodificado}`;
  window.open(url, '_blank');
}
