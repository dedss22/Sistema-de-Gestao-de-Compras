import type { SupabaseClient } from '@supabase/supabase-js';
import { obterMidiaIndexedDB } from './anexoStorage';

export const COMPROVANTE_BUCKET = 'comprovantes';
export const STORAGE_URI_PREFIX = `storage://${COMPROVANTE_BUCKET}/`;

const SIGNED_URL_EXPIRY_SECONDS = 3600;
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000;
const BUCKET_UNAVAILABLE_COOLDOWN_MS = 5 * 60 * 1000;

interface SignedUrlCacheEntry {
  url: string;
  expiraEm: number;
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
let bucketIndisponivelAte = 0;

export interface UploadComprovanteParams {
  pasta: string;
  arquivoId: string;
  dataUrl: string;
  nomeArquivo?: string;
}

export interface UploadComprovanteResult {
  sucesso: boolean;
  storagePath?: string;
  storageUri?: string;
  signedUrl?: string;
  urlFinal: string;
  motivoFallback?: string;
}

export interface PagamentoStorageLike {
  id: string;
  comprovante_url?: string;
  comprovante_storage_path?: string;
  comprovante_nome?: string;
}

export interface AnexoStorageLike {
  id: string;
  url?: string;
  storage_path?: string;
  nome?: string;
  pagamentos?: PagamentoStorageLike[];
}

export interface AdiantamentoStorageLike {
  id: string;
  comprovante_url?: string;
  comprovante_storage_path?: string;
  comprovante_nome?: string;
}

/**
 * Limpa caches em memória do Storage (útil após criação do bucket ou em testes).
 */
export function resetarCacheSupabaseStorage(): void {
  bucketIndisponivelAte = 0;
  signedUrlCache.clear();
}

/**
 * Indica se a URL informada é uma referência interna ao bucket `comprovantes`.
 */
export function isStorageUri(url?: string | null): boolean {
  return typeof url === 'string' && url.startsWith(STORAGE_URI_PREFIX);
}

/**
 * Monta a URI lógica salva no Postgres para evitar gravar Base64 ou tokens expirados.
 */
export function montarStorageUri(storagePath: string): string {
  return `${STORAGE_URI_PREFIX}${storagePath.replace(/^\/+/, '')}`;
}

/**
 * Extrai o caminho relativo no bucket a partir de uma URI `storage://comprovantes/...` ou path relativo.
 */
export function extrairStoragePath(uriOuPath?: string | null): string | null {
  if (!uriOuPath || typeof uriOuPath !== 'string') return null;

  if (uriOuPath.startsWith(STORAGE_URI_PREFIX)) {
    const caminho = uriOuPath.slice(STORAGE_URI_PREFIX.length).replace(/^\/+/, '');
    return caminho || null;
  }

  if (
    !uriOuPath.includes('://') &&
    !uriOuPath.startsWith('data:') &&
    !uriOuPath.startsWith('blob:') &&
    !uriOuPath.startsWith('indexeddb:')
  ) {
    const caminho = uriOuPath.replace(/^\/+/, '');
    return caminho || null;
  }

  return null;
}

function sanitizarSegmento(valor: string): string {
  const limpo = String(valor || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return limpo || 'arquivo';
}

function extensaoPorMime(mime: string, nomeArquivo?: string): string {
  const mimeNorm = (mime || '').toLowerCase();
  if (mimeNorm.includes('jpeg') || mimeNorm.includes('jpg')) return 'jpg';
  if (mimeNorm.includes('png')) return 'png';
  if (mimeNorm.includes('webp')) return 'webp';
  if (mimeNorm.includes('gif')) return 'gif';
  if (mimeNorm.includes('pdf')) return 'pdf';

  if (nomeArquivo) {
    const match = nomeArquivo.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    if (match && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(match[1])) {
      return match[1] === 'jpeg' ? 'jpg' : match[1];
    }
  }

  return 'bin';
}

async function dataUrlParaBlob(
  dataUrl: string,
  nomeArquivo?: string
): Promise<{ blob: Blob; contentType: string; extensao: string } | null> {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  if (dataUrl.startsWith('data:')) {
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;

    const contentType = match[1] || 'application/octet-stream';
    const isBase64 = Boolean(match[2]);
    const payload = match[3] || '';

    let bytes: Uint8Array<ArrayBuffer>;
    if (isBase64) {
      const binStr = atob(payload);
      const buffer = new ArrayBuffer(binStr.length);
      bytes = new Uint8Array(buffer);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
    } else {
      const texto = decodeURIComponent(payload);
      const encoded = new TextEncoder().encode(texto);
      const buffer = new ArrayBuffer(encoded.byteLength);
      bytes = new Uint8Array(buffer);
      bytes.set(encoded);
    }

    const blob = new Blob([bytes], { type: contentType });
    return {
      blob,
      contentType,
      extensao: extensaoPorMime(contentType, nomeArquivo)
    };
  }

  if (dataUrl.startsWith('blob:')) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const contentType = blob.type || 'application/octet-stream';
      return {
        blob,
        contentType,
        extensao: extensaoPorMime(contentType, nomeArquivo)
      };
    } catch {
      return null;
    }
  }

  return null;
}

function isErroBucketOuPermissao(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { statusCode?: string | number; status?: number; message?: string };
  const status = String(errObj.statusCode ?? errObj.status ?? '');
  const msg = String(errObj.message ?? '');
  return (
    status === '404' ||
    status === '400' ||
    status === '403' ||
    /bucket not found|not found|does not exist|row-level security|permission denied|unauthorized/i.test(msg)
  );
}

/**
 * Tenta enviar um comprovante (DataURL ou Blob URL) para o bucket privado `comprovantes`.
 * Caso o bucket ainda não exista ou falhe por permissão/rede, retorna fallback seguro com o DataURL original.
 */
export async function uploadComprovanteStorage(
  supabase: SupabaseClient | null | undefined,
  params: UploadComprovanteParams
): Promise<UploadComprovanteResult> {
  const { pasta, arquivoId, dataUrl, nomeArquivo } = params;

  if (!supabase || !dataUrl || (!dataUrl.startsWith('data:') && !dataUrl.startsWith('blob:'))) {
    return {
      sucesso: false,
      urlFinal: dataUrl,
      motivoFallback: 'origem_nao_elegivel'
    };
  }

  if (Date.now() < bucketIndisponivelAte) {
    return {
      sucesso: false,
      urlFinal: dataUrl,
      motivoFallback: 'bucket_indisponivel_cache'
    };
  }

  const convertido = await dataUrlParaBlob(dataUrl, nomeArquivo);
  if (!convertido) {
    return {
      sucesso: false,
      urlFinal: dataUrl,
      motivoFallback: 'conversao_blob_falhou'
    };
  }

  const pastaLimpa = pasta
    .split('/')
    .map(sanitizarSegmento)
    .filter(Boolean)
    .join('/');
  const idLimpo = sanitizarSegmento(arquivoId);
  const storagePath = `${pastaLimpa}/${idLimpo}.${convertido.extensao}`;

  try {
    const { error } = await supabase.storage
      .from(COMPROVANTE_BUCKET)
      .upload(storagePath, convertido.blob, {
        contentType: convertido.contentType,
        upsert: true,
        cacheControl: String(SIGNED_URL_EXPIRY_SECONDS)
      });

    if (error) {
      if (isErroBucketOuPermissao(error)) {
        bucketIndisponivelAte = Date.now() + BUCKET_UNAVAILABLE_COOLDOWN_MS;
        console.info(
          `[Supabase Storage] Bucket "${COMPROVANTE_BUCKET}" indisponível (${error.message}). Usando fallback automático em Base64/IndexedDB.`
        );
      } else {
        console.warn('[Supabase Storage] Falha ao enviar comprovante, mantendo fallback:', error.message);
      }
      return {
        sucesso: false,
        urlFinal: dataUrl,
        motivoFallback: error.message
      };
    }

    const storageUri = montarStorageUri(storagePath);
    const assinadas = await resolverUrlsAssinadasStorage(supabase, [storagePath]);
    const signedUrl = assinadas.get(storagePath);

    return {
      sucesso: true,
      storagePath,
      storageUri,
      signedUrl,
      urlFinal: signedUrl || dataUrl
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro_desconhecido';
    console.warn('[Supabase Storage] Erro inesperado no upload, usando fallback:', msg);
    return {
      sucesso: false,
      urlFinal: dataUrl,
      motivoFallback: msg
    };
  }
}

/**
 * Gera URLs assinadas temporárias em lote para os caminhos do bucket `comprovantes`, usando cache em memória.
 */
export async function resolverUrlsAssinadasStorage(
  supabase: SupabaseClient | null | undefined,
  paths: string[]
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  if (!supabase || !Array.isArray(paths) || paths.length === 0) return resultado;

  const agora = Date.now();
  const pendentes: string[] = [];

  for (const rawPath of paths) {
    const path = extrairStoragePath(rawPath);
    if (!path) continue;

    const cached = signedUrlCache.get(path);
    if (cached && cached.expiraEm > agora) {
      resultado.set(path, cached.url);
    } else if (!pendentes.includes(path)) {
      pendentes.push(path);
    }
  }

  if (pendentes.length === 0 || Date.now() < bucketIndisponivelAte) {
    return resultado;
  }

  try {
    const { data, error } = await supabase.storage
      .from(COMPROVANTE_BUCKET)
      .createSignedUrls(pendentes, SIGNED_URL_EXPIRY_SECONDS);

    if (!error && Array.isArray(data)) {
      for (const item of data) {
        if (item?.path && item?.signedUrl) {
          signedUrlCache.set(item.path, {
            url: item.signedUrl,
            expiraEm: agora + SIGNED_URL_CACHE_MS
          });
          resultado.set(item.path, item.signedUrl);
        }
      }
      return resultado;
    }

    if (error && isErroBucketOuPermissao(error)) {
      bucketIndisponivelAte = Date.now() + BUCKET_UNAVAILABLE_COOLDOWN_MS;
      return resultado;
    }
  } catch {
    // Tenta fallback individual abaixo
  }

  for (const path of pendentes) {
    if (resultado.has(path)) continue;
    try {
      const { data, error } = await supabase.storage
        .from(COMPROVANTE_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

      if (!error && data?.signedUrl) {
        signedUrlCache.set(path, {
          url: data.signedUrl,
          expiraEm: agora + SIGNED_URL_CACHE_MS
        });
        resultado.set(path, data.signedUrl);
      }
    } catch {
      // ignora item isolado
    }
  }

  return resultado;
}

/**
 * Remove arquivos do bucket `comprovantes` sem interromper o fluxo principal em caso de erro.
 */
export async function removerArquivosStorage(
  supabase: SupabaseClient | null | undefined,
  paths: Array<string | null | undefined>
): Promise<void> {
  if (!supabase || !Array.isArray(paths) || paths.length === 0) return;

  const validPaths = Array.from(
    new Set(paths.map((p) => extrairStoragePath(p)).filter((p): p is string => Boolean(p)))
  );

  if (validPaths.length === 0) return;

  for (const p of validPaths) {
    signedUrlCache.delete(p);
  }

  try {
    const { error } = await supabase.storage.from(COMPROVANTE_BUCKET).remove(validPaths);
    if (error && !isErroBucketOuPermissao(error)) {
      console.warn('[Supabase Storage] Aviso ao remover arquivo(s):', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Storage] Falha ao remover arquivo(s):', err);
  }
}

/**
 * Prepara um anexo de pedido para persistência no Postgres (com Storage) e uso imediato na UI.
 */
export async function prepararAnexoParaStorage<T extends AnexoStorageLike>(
  supabase: SupabaseClient | null | undefined,
  pedidoId: string,
  anexo: T
): Promise<{ paraBanco: T; paraMemoria: T }> {
  if (!anexo?.url || (!anexo.url.startsWith('data:') && !anexo.url.startsWith('blob:'))) {
    return { paraBanco: anexo, paraMemoria: anexo };
  }

  const upload = await uploadComprovanteStorage(supabase, {
    pasta: `pedidos/${pedidoId}`,
    arquivoId: anexo.id,
    dataUrl: anexo.url,
    nomeArquivo: anexo.nome
  });

  if (!upload.sucesso || !upload.storagePath || !upload.storageUri) {
    return { paraBanco: anexo, paraMemoria: anexo };
  }

  return {
    paraBanco: {
      ...anexo,
      url: upload.storageUri,
      storage_path: upload.storagePath
    },
    paraMemoria: {
      ...anexo,
      url: upload.urlFinal,
      storage_path: upload.storagePath
    }
  };
}

/**
 * Prepara o comprovante de pagamento de uma nota para persistência no Postgres e uso imediato na UI.
 */
export async function prepararPagamentoParaStorage<T extends PagamentoStorageLike>(
  supabase: SupabaseClient | null | undefined,
  pedidoId: string,
  pagamento: T
): Promise<{ paraBanco: T; paraMemoria: T }> {
  if (
    !pagamento?.comprovante_url ||
    (!pagamento.comprovante_url.startsWith('data:') && !pagamento.comprovante_url.startsWith('blob:'))
  ) {
    return { paraBanco: pagamento, paraMemoria: pagamento };
  }

  const upload = await uploadComprovanteStorage(supabase, {
    pasta: `pedidos/${pedidoId}/pagamentos`,
    arquivoId: pagamento.id,
    dataUrl: pagamento.comprovante_url,
    nomeArquivo: pagamento.comprovante_nome
  });

  if (!upload.sucesso || !upload.storagePath || !upload.storageUri) {
    return { paraBanco: pagamento, paraMemoria: pagamento };
  }

  return {
    paraBanco: {
      ...pagamento,
      comprovante_url: upload.storageUri,
      comprovante_storage_path: upload.storagePath
    },
    paraMemoria: {
      ...pagamento,
      comprovante_url: upload.urlFinal,
      comprovante_storage_path: upload.storagePath
    }
  };
}

/**
 * Prepara o comprovante de adiantamento da estadia para persistência no Postgres e uso imediato na UI.
 */
export async function prepararAdiantamentoParaStorage<T extends AdiantamentoStorageLike>(
  supabase: SupabaseClient | null | undefined,
  estadiaId: string,
  adiantamento: T
): Promise<{ paraBanco: T; paraMemoria: T }> {
  if (
    !adiantamento?.comprovante_url ||
    (!adiantamento.comprovante_url.startsWith('data:') && !adiantamento.comprovante_url.startsWith('blob:'))
  ) {
    return { paraBanco: adiantamento, paraMemoria: adiantamento };
  }

  const upload = await uploadComprovanteStorage(supabase, {
    pasta: `estadias/${estadiaId}/adiantamentos`,
    arquivoId: adiantamento.id,
    dataUrl: adiantamento.comprovante_url,
    nomeArquivo: adiantamento.comprovante_nome
  });

  if (!upload.sucesso || !upload.storagePath || !upload.storageUri) {
    return { paraBanco: adiantamento, paraMemoria: adiantamento };
  }

  return {
    paraBanco: {
      ...adiantamento,
      comprovante_url: upload.storageUri,
      comprovante_storage_path: upload.storagePath
    },
    paraMemoria: {
      ...adiantamento,
      comprovante_url: upload.urlFinal,
      comprovante_storage_path: upload.storagePath
    }
  };
}

/**
 * Normaliza anexos antes de gravar no Postgres para garantir que URLs assinadas temporárias
 * sejam convertidas de volta para a referência estável `storage://comprovantes/...`.
 */
export function desidratarAnexosParaBanco<T extends AnexoStorageLike>(anexos: T[]): T[] {
  if (!Array.isArray(anexos)) return [];

  return anexos.map((anexo) => {
    if (!anexo) return anexo;

    const pathAnexo = anexo.storage_path || (isStorageUri(anexo.url) ? extrairStoragePath(anexo.url) : null);
    const pagamentosNormalizados = Array.isArray(anexo.pagamentos)
      ? anexo.pagamentos.map((pg) => {
          if (!pg) return pg;
          const pathPg =
            pg.comprovante_storage_path ||
            (isStorageUri(pg.comprovante_url) ? extrairStoragePath(pg.comprovante_url) : null);
          if (!pathPg) return pg;
          return {
            ...pg,
            comprovante_url: montarStorageUri(pathPg),
            comprovante_storage_path: pathPg
          };
        })
      : anexo.pagamentos;

    if (!pathAnexo && pagamentosNormalizados === anexo.pagamentos) {
      return anexo;
    }

    return {
      ...anexo,
      ...(pathAnexo ? { url: montarStorageUri(pathAnexo), storage_path: pathAnexo } : {}),
      pagamentos: pagamentosNormalizados
    };
  });
}

/**
 * Normaliza adiantamentos antes de gravar no Postgres, preservando `storage://comprovantes/...`.
 */
export function desidratarAdiantamentosParaBanco<T extends AdiantamentoStorageLike>(adiantamentos: T[]): T[] {
  if (!Array.isArray(adiantamentos)) return [];

  return adiantamentos.map((item) => {
    if (!item) return item;
    const path =
      item.comprovante_storage_path ||
      (isStorageUri(item.comprovante_url) ? extrairStoragePath(item.comprovante_url) : null);
    if (!path) return item;
    return {
      ...item,
      comprovante_url: montarStorageUri(path),
      comprovante_storage_path: path
    };
  });
}

/**
 * Hidrata pedidos vindos do Supabase resolvendo todas as referências `storage://comprovantes/...`
 * em URLs assinadas (ou fallback no IndexedDB local em caso de erro de rede).
 */
export async function hidratarPedidosComStorage<T extends { anexos?: AnexoStorageLike[] }>(
  supabase: SupabaseClient | null | undefined,
  pedidos: T[]
): Promise<T[]> {
  if (!Array.isArray(pedidos) || pedidos.length === 0) return [];

  const pathsParaResolver: string[] = [];

  for (const pedido of pedidos) {
    if (!pedido || !Array.isArray(pedido.anexos)) continue;
    for (const anexo of pedido.anexos) {
      if (!anexo) continue;
      if (isStorageUri(anexo.url) || anexo.storage_path) {
        const path = extrairStoragePath(anexo.storage_path || anexo.url);
        if (path) pathsParaResolver.push(path);
      }
      if (Array.isArray(anexo.pagamentos)) {
        for (const pg of anexo.pagamentos) {
          if (pg && (isStorageUri(pg.comprovante_url) || pg.comprovante_storage_path)) {
            const pathPg = extrairStoragePath(pg.comprovante_storage_path || pg.comprovante_url);
            if (pathPg) pathsParaResolver.push(pathPg);
          }
        }
      }
    }
  }

  if (pathsParaResolver.length === 0) {
    return pedidos;
  }

  const urlsAssinadas = await resolverUrlsAssinadasStorage(supabase, pathsParaResolver);

  return Promise.all(
    pedidos.map(async (pedido) => {
      if (!pedido || !Array.isArray(pedido.anexos) || pedido.anexos.length === 0) {
        return pedido;
      }

      const anexosHidratados = await Promise.all(
        pedido.anexos.map(async (anexo) => {
          if (!anexo) return anexo;

          const pathAnexo =
            isStorageUri(anexo.url) || anexo.storage_path
              ? extrairStoragePath(anexo.storage_path || anexo.url)
              : null;

          let urlResolvida = anexo.url;
          if (pathAnexo) {
            urlResolvida = urlsAssinadas.get(pathAnexo) || (await obterMidiaIndexedDB(anexo.id)) || anexo.url;
          }

          let pagamentosHidratados = anexo.pagamentos;
          if (Array.isArray(anexo.pagamentos) && anexo.pagamentos.length > 0) {
            pagamentosHidratados = await Promise.all(
              anexo.pagamentos.map(async (pg) => {
                if (!pg) return pg;
                const pathPg =
                  isStorageUri(pg.comprovante_url) || pg.comprovante_storage_path
                    ? extrairStoragePath(pg.comprovante_storage_path || pg.comprovante_url)
                    : null;
                if (!pathPg) return pg;

                const urlPg =
                  urlsAssinadas.get(pathPg) || (await obterMidiaIndexedDB(pg.id)) || pg.comprovante_url;
                return {
                  ...pg,
                  comprovante_url: urlPg,
                  comprovante_storage_path: pathPg
                };
              })
            );
          }

          return {
            ...anexo,
            url: urlResolvida,
            ...(pathAnexo ? { storage_path: pathAnexo } : {}),
            pagamentos: pagamentosHidratados
          };
        })
      );

      return {
        ...pedido,
        anexos: anexosHidratados
      };
    })
  );
}

/**
 * Hidrata estadias vindas do Supabase resolvendo comprovantes de adiantamentos salvos no Storage.
 */
export async function hidratarEstadiasComStorage<T extends { adiantamentos?: AdiantamentoStorageLike[] }>(
  supabase: SupabaseClient | null | undefined,
  estadias: T[]
): Promise<T[]> {
  if (!Array.isArray(estadias) || estadias.length === 0) return [];

  const pathsParaResolver: string[] = [];

  for (const estadia of estadias) {
    if (!estadia || !Array.isArray(estadia.adiantamentos)) continue;
    for (const adt of estadia.adiantamentos) {
      if (adt && (isStorageUri(adt.comprovante_url) || adt.comprovante_storage_path)) {
        const path = extrairStoragePath(adt.comprovante_storage_path || adt.comprovante_url);
        if (path) pathsParaResolver.push(path);
      }
    }
  }

  if (pathsParaResolver.length === 0) {
    return estadias;
  }

  const urlsAssinadas = await resolverUrlsAssinadasStorage(supabase, pathsParaResolver);

  return Promise.all(
    estadias.map(async (estadia) => {
      if (!estadia || !Array.isArray(estadia.adiantamentos) || estadia.adiantamentos.length === 0) {
        return estadia;
      }

      const adiantamentosHidratados = await Promise.all(
        estadia.adiantamentos.map(async (adt) => {
          if (!adt) return adt;
          const path =
            isStorageUri(adt.comprovante_url) || adt.comprovante_storage_path
              ? extrairStoragePath(adt.comprovante_storage_path || adt.comprovante_url)
              : null;
          if (!path) return adt;

          const urlResolvida =
            urlsAssinadas.get(path) || (await obterMidiaIndexedDB(adt.id)) || adt.comprovante_url;
          return {
            ...adt,
            comprovante_url: urlResolvida,
            comprovante_storage_path: path
          };
        })
      );

      return {
        ...estadia,
        adiantamentos: adiantamentosHidratados
      };
    })
  );
}

/**
 * Remove do bucket `comprovantes` o arquivo principal do anexo e os comprovantes dos pagamentos vinculados.
 */
export async function removerMidiasAnexoStorage(
  supabase: SupabaseClient | null | undefined,
  anexo?: AnexoStorageLike | null
): Promise<void> {
  if (!anexo) return;
  const paths: Array<string | null | undefined> = [
    anexo.storage_path || (isStorageUri(anexo.url) ? anexo.url : null)
  ];
  if (Array.isArray(anexo.pagamentos)) {
    for (const pg of anexo.pagamentos) {
      if (pg) {
        paths.push(
          pg.comprovante_storage_path || (isStorageUri(pg.comprovante_url) ? pg.comprovante_url : null)
        );
      }
    }
  }
  await removerArquivosStorage(supabase, paths);
}

/**
 * Remove do bucket `comprovantes` o arquivo de um adiantamento da estadia.
 */
export async function removerMidiaAdiantamentoStorage(
  supabase: SupabaseClient | null | undefined,
  adiantamento?: AdiantamentoStorageLike | null
): Promise<void> {
  if (!adiantamento) return;
  await removerArquivosStorage(supabase, [
    adiantamento.comprovante_storage_path ||
      (isStorageUri(adiantamento.comprovante_url) ? adiantamento.comprovante_url : null)
  ]);
}
