/**
 * anexoStorage.ts - Armazenamento de alta capacidade para fotos de notas fiscais e comprovantes.
 * 
 * Utiliza IndexedDB (capacidade de Gigabytes) para armazenar imagens e arquivos pesados,
 * impedindo que o localStorage (que tem teto estrito de apenas 5MB no navegador) estoure a cota.
 */

const DB_NAME = 'ListaComprasArquivosDB';
const DB_VERSION = 2;
const STORE_NAME = 'comprovantes_midia';
const STORE_PEDIDOS = 'pedidos_store';

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PEDIDOS)) {
        db.createObjectStore(STORE_PEDIDOS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva a imagem/documento em alta resolução no IndexedDB (sem limite de 5MB).
 */
export async function salvarMidiaIndexedDB(id: string, dataUrl: string): Promise<void> {
  if (!id || !dataUrl) return;
  try {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, dataUrl, salvoEm: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Aviso: Não foi possível gravar mídia no IndexedDB:', err);
  }
}

/**
 * Recupera a imagem/documento do IndexedDB.
 */
export async function obterMidiaIndexedDB(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await abrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.dataUrl : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove a mídia do IndexedDB quando o comprovante for excluído.
 */
export async function removerMidiaIndexedDB(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await abrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignora se falhar
  }
}

/**
 * Salva um snapshot de backup completo dos pedidos no IndexedDB.
 */
export async function salvarPedidosIndexedDB(pedidos: any[]): Promise<void> {
  if (!Array.isArray(pedidos)) return;
  try {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PEDIDOS, 'readwrite');
      const store = tx.objectStore(STORE_PEDIDOS);
      const req = store.put({
        id: '__pedidos_snapshot__',
        lista: pedidos,
        atualizadoEm: new Date().toISOString()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Aviso: Falha ao gravar backup de pedidos no IndexedDB:', err);
  }
}

/**
 * Recupera o snapshot de pedidos do IndexedDB se o localStorage estiver vazio.
 */
export async function obterPedidosIndexedDB(): Promise<any[] | null> {
  try {
    const db = await abrirDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PEDIDOS, 'readonly');
      const store = tx.objectStore(STORE_PEDIDOS);
      const req = store.get('__pedidos_snapshot__');
      req.onsuccess = () => {
        resolve(req.result && Array.isArray(req.result.lista) ? req.result.lista : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Hidrata pedidos injetando as imagens em alta resolução do IndexedDB nos anexos.
 * Transforma `indexeddb:id` ou anexos truncados de volta em `dataUrl` funcional.
 */
export async function hidratarAnexosComMidia(pedidos: any[]): Promise<any[]> {
  if (!Array.isArray(pedidos)) return [];

  const promessas = pedidos.map(async (p) => {
    if (!p || !Array.isArray(p.anexos) || p.anexos.length === 0) {
      return p;
    }

    const anexosHidratados = await Promise.all(
      p.anexos.map(async (anexo: any) => {
        if (!anexo) return anexo;

        // Se já tem URL válida, completa e funcional (> 500 chars se dataUrl)
        const temUrlCompleta =
          typeof anexo.url === 'string' &&
          (anexo.url.startsWith('http://') ||
            anexo.url.startsWith('https://') ||
            anexo.url.startsWith('blob:') ||
            (anexo.url.startsWith('data:') && anexo.url.length > 500));

        if (temUrlCompleta && !anexo.url.startsWith('indexeddb:')) {
          return anexo;
        }

        let urlFinal = anexo.url;
        // Se a url está como indexeddb:xxx ou truncada/vazia, busca no IndexedDB
        if (!temUrlCompleta || anexo.url?.startsWith('indexeddb:')) {
          if (anexo.id) {
            try {
              const midia = await obterMidiaIndexedDB(anexo.id);
              if (midia) {
                urlFinal = midia;
              }
            } catch (e) {
              console.warn(`Erro ao hidratar anexo ${anexo.id} do IndexedDB:`, e);
            }
          }
        }

        // Hidrata pagamentos vinculados à nota se houver
        let pagamentosHidratados = anexo.pagamentos;
        if (Array.isArray(anexo.pagamentos) && anexo.pagamentos.length > 0) {
          pagamentosHidratados = await Promise.all(
            anexo.pagamentos.map(async (pg: any) => {
              if (pg && pg.id && (!pg.comprovante_url || pg.comprovante_url.startsWith('indexeddb:'))) {
                try {
                  const midiaPg = await obterMidiaIndexedDB(pg.id);
                  if (midiaPg) return { ...pg, comprovante_url: midiaPg };
                } catch {
                  // ignora
                }
              }
              return pg;
            })
          );
        }

        return {
          ...anexo,
          url: urlFinal,
          pagamentos: pagamentosHidratados
        };
      })
    );

    return {
      ...p,
      anexos: anexosHidratados
    };
  });

  return Promise.all(promessas);
}

/**
 * Hidrata um único pedido com suas imagens do IndexedDB.
 */
export async function hidratarPedidoComMidia(pedido: any): Promise<any> {
  if (!pedido) return pedido;
  const [hidratado] = await hidratarAnexosComMidia([pedido]);
  return hidratado || pedido;
}

/**
 * Comprime inteligentemente fotos e imagens de comprovantes antes do upload.
 * Reduz arquivos de 800KB - 5MB para ~35KB - 65KB mantendo todos os números e textos 100% nítidos.
 */
export async function comprimirComprovanteParaUpload(
  file: File,
  maxDimensao = 1280,
  qualidade = 0.75
): Promise<{ url: string; tamanhoFormatado: string }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // Se for PDF, lê direto como DataURL
  if (isPdf) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const tamanhoFormatado =
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    return { url: base64, tamanhoFormatado };
  }

  // Se for imagem (PNG, JPG, HEIC, JFIF, WEBP), comprime via Canvas
  return new Promise<{ url: string; tamanhoFormatado: string }>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let largura = img.width;
        let altura = img.height;

        // Mantém proporção com teto máximo de 1280px (ideal para tela e impressão sem estourar cota)
        if (largura > maxDimensao || altura > maxDimensao) {
          if (largura > altura) {
            altura = Math.round((altura * maxDimensao) / largura);
            largura = maxDimensao;
          } else {
            largura = Math.round((largura * maxDimensao) / altura);
            altura = maxDimensao;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = e.target?.result as string;
          resolve({ url: raw, tamanhoFormatado: `${Math.round(file.size / 1024)} KB` });
          return;
        }

        // Fundo branco sólido para garantir que PNGs com transparência não fiquem pretos
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);

        // Gera JPEG otimizado
        const compressedDataUrl = canvas.toDataURL('image/jpeg', qualidade);

        // Calcula tamanho aproximado em KB
        const bytesAprox = Math.round((compressedDataUrl.length * 3) / 4);
        const tamanhoFormatado = `${Math.round(bytesAprox / 1024)} KB`;

        resolve({ url: compressedDataUrl, tamanhoFormatado });
      };

      img.onerror = () => {
        const raw = e.target?.result as string;
        resolve({ url: raw, tamanhoFormatado: `${Math.round(file.size / 1024)} KB` });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ url: '', tamanhoFormatado: '0 KB' });
    };

    reader.readAsDataURL(file);
  });
}
