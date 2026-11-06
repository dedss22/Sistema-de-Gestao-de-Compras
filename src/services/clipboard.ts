/**
 * Utilitário universal para cópia de texto para a área de transferência (Clipboard).
 * Compatível com HTTPS, localhost, redes locais (HTTP com IP como 192.168.x.x) e dispositivos móveis.
 */
export async function copiarTextoParaClipboard(texto: string): Promise<boolean> {
  // 1. Tentar navigator.clipboard se disponível
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Bloqueado em HTTP não-localhost ou contexto não seguro; segue para o fallback
    }
  }

  // 2. Fallback universal via textarea temporário + execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const copiou = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (copiou) return true;
    } catch (err) {
      console.warn('Fallback execCommand falhou:', err);
    }
  }

  return false;
}
