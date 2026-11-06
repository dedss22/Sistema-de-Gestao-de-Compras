import { Pedido, StatusPedido, ItemPedido } from '../types';

const STORAGE_KEY_PREFIX = 'lista_compras_';
const DRAFT_KEY = `${STORAGE_KEY_PREFIX}draft_`;
const ORDERS_KEY = `${STORAGE_KEY_PREFIX}all_orders`;
const SETTINGS_KEY = `${STORAGE_KEY_PREFIX}settings`;

export interface AppSettings {
  adminPin: string;
  googleSheetsWebhookUrl?: string;
  firebaseConfig?: {
    apiKey: string;
    projectId: string;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  adminPin: '1234',
  googleSheetsWebhookUrl: ''
};

// Obter configurações
export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Salvar configurações
export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// Salvar Rascunho da Casa
export function saveDraft(slugCasa: string, data: {
  casa: string;
  dataChegada: string;
  dataSaida: string;
  numHospedes: number;
  itens: Record<string, ItemPedido>;
}): void {
  try {
    localStorage.setItem(`${DRAFT_KEY}${slugCasa}`, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Erro ao salvar rascunho:', e);
  }
}

// Carregar Rascunho da Casa
export function loadDraft(slugCasa: string) {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}${slugCasa}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Erro ao carregar rascunho:', e);
    return null;
  }
}

// Limpar rascunho da casa
export function clearDraft(slugCasa: string): void {
  localStorage.removeItem(`${DRAFT_KEY}${slugCasa}`);
}

// Obter todos os pedidos salvos (para Admin e Compartilhamento)
export function getAllOrders(): Pedido[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      // Criar alguns pedidos de exemplo realistas se for o primeiro acesso
      const initialOrders: Pedido[] = [
        {
          id: 'ped-villa-bahia-01',
          casa: 'Villa Trancoso Alto',
          slugCasa: 'villa-trancoso',
          dataChegada: '2026-11-10',
          dataSaida: '2026-11-17',
          numHospedes: 8,
          status: 'Aguardando aprovação',
          dataCriacao: new Date(Date.now() - 3600000 * 4).toISOString(),
          dataAtualizacao: new Date(Date.now() - 3600000 * 4).toISOString(),
          itens: {
            'peixe-branco-postas': {
              id: 'peixe-branco-postas',
              nome: 'Peixe Branco em Postas (Robalo / Badejo / Dourado)',
              fornecedor: 'peixaria',
              unidade: 'kg',
              quantidade: 4,
              observacao: 'Cortado em postas bem grossas',
              aceitaSubstituto: true
            },
            'camarao-vg': {
              id: 'camarao-vg',
              nome: 'Camarão Rosa VG Limpo',
              fornecedor: 'peixaria',
              unidade: 'kg',
              quantidade: 3,
              observacao: 'Manter rabinho para a grelha',
              aceitaSubstituto: false
            },
            'picanha-prime': {
              id: 'picanha-prime',
              nome: 'Picanha Bovina Especial',
              fornecedor: 'acougue',
              unidade: 'kg',
              quantidade: 4,
              observacao: 'Capa de gordura uniforme',
              aceitaSubstituto: true
            },
            'costela-bovina': {
              id: 'costela-bovina',
              nome: 'Costela Bovina para Assar',
              fornecedor: 'acougue',
              unidade: 'kg',
              quantidade: 4,
              aceitaSubstituto: true
            },
            'queijo-coalho-espeto': {
              id: 'queijo-coalho-espeto',
              nome: 'Queijo Coalho no Espeto',
              fornecedor: 'acougue',
              unidade: 'pacote',
              quantidade: 3,
              aceitaSubstituto: true
            },
            'coco-verde': {
              id: 'coco-verde',
              nome: 'Coco Verde Fresco (Água)',
              fornecedor: 'hortifruti',
              unidade: 'un',
              quantidade: 20,
              observacao: 'Bem geladinho se possível',
              aceitaSubstituto: true
            },
            'manga-palmer': {
              id: 'manga-palmer',
              nome: 'Manga Palmer / Espada Doce',
              fornecedor: 'hortifruti',
              unidade: 'un',
              quantidade: 4,
              observacao: 'No ponto para comer hoje e amanhã',
              aceitaSubstituto: true
            },
            'agua-mineral-sem-gas': {
              id: 'agua-mineral-sem-gas',
              nome: 'Água Mineral Sem Gás 500ml (Fardo)',
              fornecedor: 'bebidas',
              unidade: 'pacote',
              quantidade: 10,
              aceitaSubstituto: true
            },
            'gelo-filtrado-5kg': {
              id: 'gelo-filtrado-5kg',
              nome: 'Gelo Filtrado em Cubos 5kg',
              fornecedor: 'bebidas',
              unidade: 'pacote',
              quantidade: 4,
              aceitaSubstituto: true
            },
            'carvao-vegetal': {
              id: 'carvao-vegetal',
              nome: 'Carvão Vegetal Graúdo 4kg',
              fornecedor: 'mercado',
              unidade: 'pacote',
              quantidade: 3,
              aceitaSubstituto: true
            }
          }
        }
      ];
      localStorage.setItem(ORDERS_KEY, JSON.stringify(initialOrders));
      return initialOrders;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler pedidos:', e);
    return [];
  }
}

// Salvar / Criar Pedido
export async function saveOrder(order: Pedido): Promise<Pedido> {
  const orders = getAllOrders();
  const existingIndex = orders.findIndex(o => o.id === order.id);

  if (existingIndex >= 0) {
    orders[existingIndex] = { ...order, dataAtualizacao: new Date().toISOString() };
  } else {
    orders.unshift(order);
  }

  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  // Tentar sincronizar em nuvem (Google Sheets / Webhook) se configurado
  const settings = getSettings();
  if (settings.googleSheetsWebhookUrl) {
    try {
      await fetch(settings.googleSheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(order)
      });
    } catch (err) {
      console.warn('Falha no envio para webhook externo (salvo localmente):', err);
    }
  }

  return order;
}

// Buscar Pedido por ID (para cliente aprovar ou admin)
export function getOrderById(id: string): Pedido | null {
  const orders = getAllOrders();
  return orders.find(o => o.id === id) || null;
}

// Atualizar Status do Pedido
export async function updateOrderStatus(
  orderId: string, 
  status: StatusPedido, 
  observacao?: string
): Promise<Pedido | null> {
  const orders = getAllOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) return null;

  orders[index].status = status;
  orders[index].dataAtualizacao = new Date().toISOString();
  if (observacao !== undefined) {
    orders[index].observacaoAprovacao = observacao;
  }

  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  // Sincroniza webhook
  const settings = getSettings();
  if (settings.googleSheetsWebhookUrl) {
    try {
      await fetch(settings.googleSheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(orders[index])
      });
    } catch (err) {
      console.warn('Falha no webhook ao atualizar status:', err);
    }
  }

  return orders[index];
}
