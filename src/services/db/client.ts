import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Variáveis de ambiente configuradas no .env
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('exemplo-seu-projeto') &&
    !supabaseAnonKey.includes('exemplo-anon-key')
  );
};

// Cliente Supabase utilizando EXCLUSIVAMENTE a chave pública anon
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

/**
 * Remove caracteres de controle da sintaxe PostgREST (`,`, `(`, `)`, `.`, `*`, `%`, aspas, barra invertida)
 * para evitar quebra ou injeção de operadores em filtros `.or()`.
 */
export function sanitizarTermoPostgrest(termo: string): string {
  if (!termo) return '';
  return termo
    .trim()
    .replace(/[,().*%\\'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
