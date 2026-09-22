export type GlobalShortcut = 'toggle-advisor' | 'close-advisor';

export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Atajos globales de la aplicación.
 *
 * Cmd/Ctrl+K abre el asistente IA: es el atajo que ya usan los editores y
 * paneles de administración, así que no hay que enseñarlo.
 * Escape solo cierra el asistente; los modales gestionan el suyo por su cuenta.
 *
 * Se ignora Alt a propósito: Alt+K en algunos teclados produce caracteres
 * especiales y no debe abrir nada.
 */
export function matchGlobalShortcut(event: KeyEventLike): GlobalShortcut | null {
  const key = event.key?.toLowerCase();
  if (!key) return null;

  if (key === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey) {
    return 'toggle-advisor';
  }

  if (key === 'escape' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return 'close-advisor';
  }

  return null;
}
