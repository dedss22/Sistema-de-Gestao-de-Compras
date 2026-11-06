export interface PedidoParaEnvio {
  numero: number;
  finalizado_em: string;
  cozinheira: string;
  itens: any[];
}

export interface EstadiaParaEnvio {
  casa: string;
  entrada: string;
  saida: string;
  hospedes: number;
  codigo?: string;
  titular?: string;
  funcionario?: string;
}

export declare function enviarPedido(
  pedido: PedidoParaEnvio,
  estadia: EstadiaParaEnvio
): Promise<{ sucesso: boolean; mock: boolean; timestamp: string }>;
